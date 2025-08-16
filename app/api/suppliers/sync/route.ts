import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { JaggaerAPIClient, JaggaerAttachmentClient } from "@/lib/jaggaer-client"

// POST /api/suppliers/sync - Trigger supplier synchronization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const syncType = body.sync_type || "INCREMENTAL"
    const limit = body.limit || null

    // Validate sync_type
    if (!["FULL", "INCREMENTAL", "MANUAL"].includes(syncType)) {
      return NextResponse.json({ error: "Invalid sync_type. Must be FULL, INCREMENTAL, or MANUAL" }, { status: 400 })
    }

    const startTime = new Date()

    // Create sync log entry (status must be one of: running, completed, failed)
    const syncLogIns = await query<{ id: string }>(
      `INSERT INTO supplier_sync_logs (sync_type, status, started_at, sync_details)
       VALUES ($1, 'running', NOW(), $2::jsonb) RETURNING id`,
      [syncType.toLowerCase(), JSON.stringify({ requested_limit: limit, started_at: startTime.toISOString() })],
    )
    const syncLog = syncLogIns.rows[0]

    try {
      // Load Jaggaer credentials from DB first, fallback to env
      let baseUrl = ""
      let clientId = ""
      let clientSecret = ""
      try {
        const { rows } = await query<{ setting_value: any }>(
          "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
          ["jaggaer"],
        )
        if (rows.length) {
          const v = rows[0].setting_value || {}
          baseUrl = String(v.baseUrl || "")
          clientId = String(v.clientId || "")
          clientSecret = String(v.clientSecret || "")
        }
      } catch (_) {
        // ignore; will fallback to env
      }
      if (!baseUrl) baseUrl = process.env.JAGGAER_BASE_URL || ""
      if (!clientId) clientId = process.env.JAGGAER_CLIENT_ID || ""
      if (!clientSecret) clientSecret = process.env.JAGGAER_CLIENT_SECRET || ""

      if (!baseUrl || !clientId || !clientSecret) {
        throw new Error("Jaggaer configuration missing")
      }
      try {
        baseUrl = baseUrl.trim()
        // eslint-disable-next-line no-new
        new URL(baseUrl)
      } catch {
        throw new Error("Invalid Jaggaer baseUrl")
      }

      // Optionally read integration settings (batch, components)
      let selectedComponents: string[] = []
      let batchSize = 100
      let maxTotal: number | undefined = undefined
      try {
        const { rows } = await query<{ setting_value: any }>(
          "SELECT setting_value FROM system_settings WHERE setting_key = $1 LIMIT 1",
          ["jaggaer_integration"],
        )
        const s = rows[0]?.setting_value || {}
        if (Array.isArray(s.selectedComponents)) selectedComponents = s.selectedComponents
        if (s.batchSize) batchSize = Number.parseInt(String(s.batchSize)) || 100
        if (limit) {
          maxTotal = Number(limit)
        } else if (s.maxTotal) {
          maxTotal = Number.parseInt(String(s.maxTotal))
        }
      } catch (_) {
        // proceed with defaults
      }

      const api = new JaggaerAPIClient({ baseUrl, clientId, clientSecret })
      const attachmentClient = new JaggaerAttachmentClient({ baseUrl, clientId, clientSecret })

      // Ensure storage table for deBasic answers exists
      await query(
        `CREATE TABLE IF NOT EXISTS supplier_debasic_answers (
           supplier_id UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
           answers JSONB NOT NULL,
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`,
      )

      // Ensure storage table for attachments exists
      await query(
        `CREATE TABLE IF NOT EXISTS supplier_attachments (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
           file_id TEXT,
           secure_token TEXT,
           filename TEXT NOT NULL,
           original_filename TEXT,
           question_code TEXT,
           cert_type TEXT,
           content_type TEXT,
           file_size BIGINT,
           file_data BYTEA,
           download_status TEXT DEFAULT 'pending',
           download_error TEXT,
           downloaded_at TIMESTAMPTZ,
           created_at TIMESTAMPTZ DEFAULT NOW(),
           updated_at TIMESTAMPTZ DEFAULT NOW(),
           UNIQUE(supplier_id, file_id, secure_token)
         )`,
      )
      const profiles = await api.getAllCompanyProfiles({
        components: selectedComponents.length ? selectedComponents : undefined,
        batchSize,
        maxTotal,
      })

      // Map to supplier rows expected by upsert logic, aligned with provided basic info fields
      const jaggaerSuppliers = profiles.map((p: any) => {
        const info = api.extractCompanyInfo(p) as any
        const lastSync = (info.last_mod_time || info.registration_date) 
          ? new Date((info.last_mod_time || info.registration_date) as Date).toISOString() 
          : null
        return {
          // IDs
          bravo_id: info.bravo_id,

          // Basic company info
          company_name: info.company_name,
          fiscal_code: info.fiscal_code || null,
          vat_number: info.eu_vat || null,
          legal_form: info.biz_legal_struct || null,

          // Contacts
          email: info.email || null, // bizEmail
          pec_email: info.pec_email || null, // userPecEmails
          phone: info.phone || null, // bizPhone

          // Address
          address: info.address || null,
          city: info.city || null,
          province: info.province || null,
          postal_code: info.zip || null, // zip -> postal_code
          country: info.country || null, // isoCountry -> country

          // Misc
          website: null,

          // Status/score
          verification_status: "in_progress",
          compliance_score: 0,

          // Sync timestamps
          last_sync_date: lastSync,
        }
      })

      let suppliersCreated = 0
      let suppliersUpdated = 0
      let suppliersFailed = 0

      // Target keys for deBasic answers (supports wildcard suffix *)
      const targetKeys = [
        // DATI ANAGRAFICI E IDENTIFICATIVI
        "Q1_LEGALE_RAPPRESENTANTE",
        "Q0_LEGALE_RAPPRESENTANTE_DOCUMENTO",
        "Q1_FIRMA_DIGITALE",
        "Q1_SETTORE_PREVALENTE",
        "Q1_AREA_GEOGRAFICA_ITALIA",
        "Q1_AREA_GEOGRAFICA_MONDO",

        // ECONOMICS & FINANCIALS
        "Q1_DIMENSIONE_SOCIETARIA",
        "Q1_ANNO FONDAZIONE",
        "Q1_CAPITALE_SOCIALE",
        "Q1_FATTURATO",
        "Q1_UTILE_NETTO",
        "Q1_ANNO_FATTURATO_UTILE",
        "Q1_DISTRIBUZIONE_FATTURATO",

        // DICHIARAZIONI DI CONFORMITA', WATCHLIST E SANZIONI
        "Q1_CODICE_ETICO_PIZZAROTTI",
        "Q1_CODICE_CONDOTTA_PIZZAROTTI",
        "Q1_LEGAMI_PARENTELA",
        "Q1_ELENCHI_RIFERIMENTO",
        "Q1_EMBARGO_UE",
        "Q1_CODICE_ETICO",
        "Q1_MODELLO_231",
        "Q1_NOMINA DPO",
        "Q1_PROTEZIONE_DATI_PERSONALI",
        "Q1_GESTIONE_FEMMINILE",
        "Q1_GESTIONE_GIOVANILE",
        "Q1_PROCEDIMENTI_PENALI",
        "Q1_CONDANNE",
        "Q1_PUBBLICA_AMMINISTRAZIONE",

        // CERTIFICAZIONI E AWARDS
        "Q1_CCIAA",
        "Q1_ISO_SA_ALTRE",
        "Q1_RATING_ESG",
        "Q1_ECOLABEL_EPD",
        "Q1_SOA",
        "Q1_PATENTE_CREDITI",
        "Q1_RICONOSCIMENTI",

        // Iscrizione CCIAA
        "Q1_CCIAA_ALLEGATO",
        "Q1_CCIAA_NUMERO",
        "Q1_CCIAA_PROVINCIA",

        // ISO
        "Q1_ALLEGATO_ISO_*",

        // SOA
        "Q1_SOA",
        "NEW_SCELTA SOA",
        "Q1_ALLEGATO_SOA",

        // ALLEGATI ED INFORMAZIONI - VARIE
        "Q0_INFORMAZIONI",
        "GRUPPO_IVA",
        "Q0_CASSA_EDILE",
        "Q0_INPS",
        "Q0_INAIL",
        "Q0_WHITELIST",
        "INFO_WHITELIST_ALLEGATO",
        "Q0_DURC",
        "Q0_DURC_ALLEGATO",
        "Q0_ASSICURAZIONE",
        "Q0_ASSICURAZIONE_ALLEGATO",
      ]

      const filterDebasicAnswers = (answers: Record<string, any>) => {
        const out: Record<string, any> = {}
        for (const [qcode, value] of Object.entries(answers)) {
          let match = false
          for (const pattern of targetKeys) {
            if (pattern.endsWith("*")) {
              const prefix = pattern.slice(0, -1)
              if (qcode.startsWith(prefix)) {
                match = true
                break
              }
            } else if (qcode === pattern) {
              match = true
              break
            }
          }
          if (match) out[qcode] = value
        }
        return out
      }

      // Process each supplier (keep index to access original profile for deBasic answers)
      for (let i = 0; i < jaggaerSuppliers.length; i++) {
        const supplierData = jaggaerSuppliers[i]
        try {
          // Extract debasic answers and reduce to requested keys
          const allAnswers = api.extractDebasicAnswers(profiles[i])
          const filteredAnswers = filterDebasicAnswers(allAnswers)
          // Try update by bravo_id
          const updateRes = await query(
          `UPDATE suppliers SET 
             company_name = COALESCE($1, company_name),
             fiscal_code = COALESCE($2, fiscal_code),
             vat_number = COALESCE($3, vat_number),
             legal_form = COALESCE($4, legal_form),
             address = COALESCE($5, address),
             city = COALESCE($6, city),
             province = COALESCE($7, province),
             postal_code = COALESCE($8, postal_code),
             country = COALESCE($9, country),
             phone = COALESCE($10, phone),
             email = COALESCE($11, email),
             website = COALESCE($12, website),
             pec_email = COALESCE($13, pec_email),
             verification_status = COALESCE($14, verification_status),
             compliance_score = COALESCE($15, compliance_score),
             last_sync_date = COALESCE($16, last_sync_date),
              updated_at = NOW()
           WHERE bravo_id = $17
           RETURNING id`,
          [
            supplierData.company_name,
            supplierData.fiscal_code,
            supplierData.vat_number,
            supplierData.legal_form,
            supplierData.address,
            supplierData.city,
            supplierData.province,
            supplierData.postal_code,
            supplierData.country,
            supplierData.phone,
            supplierData.email,
            supplierData.website,
            supplierData.pec_email,
            supplierData.verification_status,
            supplierData.compliance_score,
            supplierData.last_sync_date,
            supplierData.bravo_id,
          ],
        )

        let supplierId: string | null = null
        if (updateRes.rowCount && updateRes.rowCount > 0) {
          suppliersUpdated++
          supplierId = updateRes.rows[0]?.id
        } else {
          // Insert new supplier
          const insertRes = await query(
            `INSERT INTO suppliers (
               bravo_id, company_name, fiscal_code, vat_number, legal_form, address, city, province, postal_code, country,
               phone, email, website, pec_email, verification_status, compliance_score, last_sync_date
             ) VALUES (
               $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
               $11,$12,$13,$14,$15,$16,COALESCE($17, NOW())
             ) RETURNING id`,
            [
              supplierData.bravo_id,
              supplierData.company_name,
              supplierData.fiscal_code,
              supplierData.vat_number,
              supplierData.legal_form,
              supplierData.address,
              supplierData.city,
              supplierData.province,
              supplierData.postal_code,
              supplierData.country,
              supplierData.phone,
              supplierData.email,
              supplierData.website,
              supplierData.pec_email,
              supplierData.verification_status,
              supplierData.compliance_score,
              supplierData.last_sync_date,
            ],
          )
          suppliersCreated++
          supplierId = insertRes.rows[0]?.id
        }

        // Upsert filtered deBasic answers for this supplier
        if (supplierId) {
          await query(
            `INSERT INTO supplier_debasic_answers (supplier_id, answers, updated_at)
             VALUES ($1, $2::jsonb, NOW())
             ON CONFLICT (supplier_id) DO UPDATE SET
               answers = EXCLUDED.answers,
               updated_at = NOW()`,
            [supplierId, JSON.stringify(filteredAnswers)],
          )
        }

        // Extract and download attachments for this supplier
        if (supplierId) {
          try {
            const certifications = api.extractCertifications(profiles[i])
            
            for (const cert of certifications) {
              const { file_id, secure_token, filename } = cert.values
              
              // Skip if no attachment data
              if (!secure_token && !file_id) continue
              if (!filename) continue

              try {
                // Check if attachment already exists
                const existingAttachment = await query(
                  `SELECT id, download_status FROM supplier_attachments 
                   WHERE supplier_id = $1 AND (
                     (file_id = $2 AND file_id IS NOT NULL) OR 
                     (secure_token = $3 AND secure_token IS NOT NULL)
                   )`,
                  [supplierId, file_id || null, secure_token || null]
                )

                let attachmentId: string
                if (existingAttachment.rows.length > 0) {
                  attachmentId = existingAttachment.rows[0].id
                  // Skip if already successfully downloaded
                  if (existingAttachment.rows[0].download_status === 'success') {
                    continue
                  }
                } else {
                  // Insert new attachment record
                  const insertResult = await query(
                    `INSERT INTO supplier_attachments (
                       supplier_id, file_id, secure_token, filename, original_filename,
                       question_code, cert_type, download_status
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                     RETURNING id`,
                    [
                      supplierId,
                      file_id || null,
                      secure_token || null,
                      filename,
                      filename,
                      cert.question_code,
                      cert.type
                    ]
                  )
                  attachmentId = insertResult.rows[0].id
                }

                // Download the attachment
                let blob: Blob
                try {
                  if (secure_token) {
                    blob = await attachmentClient.downloadBySecureToken(secure_token, filename)
                  } else if (file_id && filename) {
                    blob = await attachmentClient.downloadByFileId(file_id, filename)
                  } else {
                    continue
                  }

                  // Convert blob to buffer for database storage
                  const arrayBuffer = await blob.arrayBuffer()
                  const buffer = Buffer.from(arrayBuffer)

                  // Update attachment record with downloaded data
                  await query(
                    `UPDATE supplier_attachments SET
                       file_data = $1,
                       content_type = $2,
                       file_size = $3,
                       download_status = 'success',
                       download_error = NULL,
                       downloaded_at = NOW(),
                       updated_at = NOW()
                     WHERE id = $4`,
                    [buffer, blob.type || 'application/octet-stream', blob.size, attachmentId]
                  )

                  console.log(`Downloaded attachment: ${filename} (${blob.size} bytes) for supplier ${supplierData.bravo_id}`)

                } catch (downloadError) {
                  // Update attachment record with error
                  await query(
                    `UPDATE supplier_attachments SET
                       download_status = 'failed',
                       download_error = $1,
                       updated_at = NOW()
                     WHERE id = $2`,
                    [downloadError instanceof Error ? downloadError.message : 'Unknown download error', attachmentId]
                  )
                  console.warn(`Failed to download attachment ${filename} for supplier ${supplierData.bravo_id}:`, downloadError)
                }

              } catch (attachmentError) {
                console.warn(`Error processing attachment ${filename} for supplier ${supplierData.bravo_id}:`, attachmentError)
              }
            }
          } catch (certError) {
            console.warn(`Error extracting certifications for supplier ${supplierData.bravo_id}:`, certError)
          }
        }
        } catch (_e) {
          suppliersFailed++
          // continue with others
        }
      }

      const endTime = new Date()
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

      // Update sync log with completion using existing columns
      const completedSync = await query(
        `UPDATE supplier_sync_logs SET 
           status = 'completed',
           completed_at = NOW(),
           records_processed = $1,
           records_updated = $2,
           records_failed = $3,
           sync_details = COALESCE(sync_details, '{}'::jsonb) || $4::jsonb
         WHERE id = $5 RETURNING *`,
        [jaggaerSuppliers.length, suppliersUpdated + suppliersCreated, suppliersFailed, JSON.stringify({ duration_seconds: durationSeconds }), syncLog.id],
      )

      return NextResponse.json({ success: true, sync_log: completedSync.rows[0] })
    } catch (syncError) {
      // Update sync log with error using allowed status value
      await query(
        `UPDATE supplier_sync_logs SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2`,
        [(syncError as Error).message, syncLog.id],
      )
      throw syncError
    }
  } catch (error) {
    console.error("Error in sync suppliers API:", error)
    return NextResponse.json({ error: "Sync failed", details: (error as Error).message }, { status: 500 })
  }
}
