import { NextRequest, NextResponse } from "next/server"
import { JaggaerAPIClient } from "@/lib/jaggaer-client"
import { query } from "@/lib/db"

export async function POST(_req: NextRequest) {
  // Start a sync run and log it in supplier_sync_logs
  let logId: string | null = null
  const startedAt = new Date()
  try {
    // Load Jaggaer credentials: env preferred, else DB 'jaggaer'
    let baseUrl = process.env.JAGGAER_BASE_URL || ""
    let clientId = process.env.JAGGAER_CLIENT_ID || ""
    let clientSecret = process.env.JAGGAER_CLIENT_SECRET || ""

    if (!baseUrl || !clientId || !clientSecret) {
      try {
        const { rows } = await query<{ setting_value: any }>(
          "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
          ["jaggaer"],
        )
        if (rows.length) {
          const v = rows[0].setting_value || {}
          baseUrl = baseUrl || String(v.baseUrl || "")
          clientId = clientId || String(v.clientId || "")
          clientSecret = clientSecret || String(v.clientSecret || "")
        }
      } catch (_) {
        // ignore; validated below
      }
    }

    // Validate URL
    if (!baseUrl || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Jaggaer configuration missing" }, { status: 500 })
    }
    try {
      // eslint-disable-next-line no-new
      new URL(baseUrl)
    } catch {
      return NextResponse.json({ error: "Invalid Jaggaer baseUrl" }, { status: 400 })
    }

    // Load integration settings (components, batchSize, maxTotal)
    const { rows: settingsRows } = await query<{ setting_value: any }>(
      "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
      ["jaggaer_integration"],
    )
    const settings = settingsRows[0]?.setting_value || {}
    const selectedComponents: string[] = Array.isArray(settings.selectedComponents) ? settings.selectedComponents : []
    const batchSize: number = Number.parseInt(String(settings.batchSize ?? "100"))
    const maxTotal: number | undefined =
      settings.maxTotal !== undefined && settings.maxTotal !== null
        ? Number.parseInt(String(settings.maxTotal))
        : undefined

    // Insert running log
    {
      const { rows } = await query<{ id: string }>(
        `INSERT INTO supplier_sync_logs (sync_type, status, started_at, sync_details)
         VALUES ($1, $2, NOW(), $3::jsonb)
         RETURNING id`,
        [
          "jaggaer_full",
          "running",
          JSON.stringify({ selectedComponents, batchSize, maxTotal, startedAt: startedAt.toISOString() }),
        ],
      )
      logId = rows[0].id
    }

    const client = new JaggaerAPIClient({ baseUrl, clientId, clientSecret })

    // Perform full sync
    const profiles = await client.getAllCompanyProfiles({
      components: selectedComponents.length ? selectedComponents : undefined,
      batchSize,
      maxTotal,
    })

    let recordsProcessed = 0
    let recordsUpdated = 0
    let recordsFailed = 0

    // Upsert each supplier profile into suppliers table
    for (const p of profiles) {
      recordsProcessed++
      try {
        const info = client.extractCompanyInfo(p) as any
        const bravoId = info.bravo_id || null
        if (!bravoId) {
          recordsFailed++
          continue
        }

        // Map fields to suppliers columns
        const values = {
          bravo_id: String(bravoId),
          company_name: String(info.company_name || "").slice(0, 255),
          fiscal_code: info.fiscal_code ? String(info.fiscal_code) : null,
          vat_number: info.eu_vat ? String(info.eu_vat) : null,
          legal_form: info.biz_legal_struct ? String(info.biz_legal_struct) : null,
          address: info.address ? String(info.address) : null,
          city: info.city ? String(info.city) : null,
          province: info.province ? String(info.province) : null,
          postal_code: info.zip ? String(info.zip) : null,
          country: info.country ? String(info.country) : info.country || null,
          phone: info.phone ? String(info.phone) : null,
          email: info.email ? String(info.email) : null,
          pec_email: info.pec_email ? String(info.pec_email) : null,
          website: null,
          legal_representative: null,
          verification_status: "in_progress", // initial mapping; can be refined
          compliance_score: 0,
          last_sync_date: new Date(),
        }

        await query(
          `INSERT INTO suppliers (
             bravo_id, company_name, fiscal_code, vat_number, legal_form,
             address, city, province, postal_code, country,
             phone, email, pec_email, website, legal_representative,
             verification_status, compliance_score, last_sync_date, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15,
             $16, $17, NOW(), NOW(), NOW()
           )
           ON CONFLICT (bravo_id)
           DO UPDATE SET
             company_name = EXCLUDED.company_name,
             fiscal_code = EXCLUDED.fiscal_code,
             vat_number = EXCLUDED.vat_number,
             legal_form = EXCLUDED.legal_form,
             address = EXCLUDED.address,
             city = EXCLUDED.city,
             province = EXCLUDED.province,
             postal_code = EXCLUDED.postal_code,
             country = EXCLUDED.country,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             pec_email = EXCLUDED.pec_email,
             verification_status = EXCLUDED.verification_status,
             compliance_score = EXCLUDED.compliance_score,
             last_sync_date = NOW(),
             updated_at = NOW()`,
          [
            values.bravo_id,
            values.company_name,
            values.fiscal_code,
            values.vat_number,
            values.legal_form,
            values.address,
            values.city,
            values.province,
            values.postal_code,
            values.country,
            values.phone,
            values.email,
            values.pec_email,
            values.website,
            values.legal_representative,
            values.verification_status,
            values.compliance_score,
          ],
        )
        recordsUpdated++
      } catch (e) {
        console.warn("Failed to upsert supplier:", e)
        recordsFailed++
      }
    }

    // Update lastSync in jaggaer_integration settings
    const newLastSync = new Date().toISOString()
    try {
      const current = settingsRows[0]?.setting_value || {}
      current.lastSync = newLastSync
      await query(
        `UPDATE system_settings SET setting_value = $1::jsonb, updated_at = NOW() WHERE setting_key = $2`,
        [JSON.stringify(current), "jaggaer_integration"],
      )
    } catch (e) {
      // Do not fail the whole request if lastSync update fails; it will be visible in logs
      console.warn("Failed to update lastSync in jaggaer_integration:", e)
    }

    // Complete log
    await query(
      `UPDATE supplier_sync_logs
       SET status = $1,
           completed_at = NOW(),
           records_processed = $2,
           records_updated = $3,
           records_failed = $4,
           sync_details = COALESCE(sync_details, '{}'::jsonb) || $5::jsonb
       WHERE id = $6`,
      [
        "completed",
        recordsProcessed,
        recordsUpdated,
        recordsFailed,
        JSON.stringify({ completedAt: new Date().toISOString() }),
        logId,
      ],
    )

    return NextResponse.json({
      success: true,
      logId,
      recordsProcessed,
      recordsUpdated,
      recordsFailed,
    })
  } catch (error) {
    // Mark log as failed if created
    try {
      if (logId) {
        await query(
          `UPDATE supplier_sync_logs SET status = $1, completed_at = NOW(), error_message = $2 WHERE id = $3`,
          ["failed", error instanceof Error ? error.message : "Unknown error", logId],
        )
      }
    } catch (e) {
      console.error("Failed to update sync log after error:", e)
    }

    console.error("Jaggaer sync error:", error)
    return NextResponse.json({ error: "Sync failed", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
