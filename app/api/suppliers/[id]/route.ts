import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/suppliers/[id] - fetch a supplier by ID (uuid) or bravo_id (non-uuid)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 })
    }

    // If the param is a valid UUID -> search by primary key `id`, otherwise by `bravo_id`
    // UUID pattern: 8-4-4-4-12 hex segments
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)

    const sql = isUUID
      ? `SELECT id, bravo_id, company_name, fiscal_code, vat_number, legal_form, address, city, province, postal_code, country,
                phone, email, website, pec_email, verification_status, compliance_score, last_sync_date, updated_at
           FROM suppliers WHERE id = $1::uuid`
      : `SELECT id, bravo_id, company_name, fiscal_code, vat_number, legal_form, address, city, province, postal_code, country,
                phone, email, website, pec_email, verification_status, compliance_score, last_sync_date, updated_at
           FROM suppliers WHERE bravo_id = $1`

    const { rows } = await query(sql, [id])
    if (!rows.length) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 })
    }

    const supplier = rows[0]
    // Load stored deBasic answers, if any
    let debasicAnswers: any = null
    try {
      const dres = await query<{ answers: any }>(
        `SELECT answers FROM supplier_debasic_answers WHERE supplier_id = $1::uuid LIMIT 1`,
        [supplier.id],
      )
      debasicAnswers = dres.rows[0]?.answers ?? null
    } catch (_) {
      // ignore optional table
    }

    // Load attachments for this supplier
    let attachments: any[] = []
    try {
      const ares = await query(
        `SELECT id, file_id, secure_token, filename, original_filename, question_code, cert_type,
                content_type, file_size, download_status, download_error, downloaded_at, created_at
         FROM supplier_attachments 
         WHERE supplier_id = $1::uuid 
         ORDER BY cert_type, filename`,
        [supplier.id],
      )
      attachments = ares.rows
    } catch (_) {
      // ignore optional table
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        ...supplier, 
        debasic_answers: debasicAnswers,
        attachments: attachments
      } 
    })
  } catch (err) {
    console.error("GET /api/suppliers/[id] error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
