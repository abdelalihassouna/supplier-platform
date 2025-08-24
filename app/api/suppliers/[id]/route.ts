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
        `SELECT 
            sa.id,
            sa.file_id,
            sa.secure_token,
            sa.filename,
            sa.original_filename,
            sa.question_code,
            sa.cert_type,
            sa.content_type,
            sa.file_size,
            sa.download_status,
            sa.download_error,
            sa.downloaded_at,
            sa.analysis_status,
            sa.created_at,
            -- Latest analysis id for this attachment
            (
              SELECT da.id 
              FROM document_analysis da 
              WHERE da.attachment_id = sa.id 
              ORDER BY da.created_at DESC 
              LIMIT 1
            ) AS analysis_id,
            -- Latest verification confidence for that analysis
            (
              SELECT dv.confidence_score 
              FROM document_verification dv 
              WHERE dv.analysis_id = (
                SELECT da2.id FROM document_analysis da2 
                WHERE da2.attachment_id = sa.id 
                ORDER BY da2.created_at DESC 
                LIMIT 1
              )
              ORDER BY dv.created_at DESC 
              LIMIT 1
            ) AS confidence_score
         FROM supplier_attachments sa
         WHERE sa.supplier_id = $1::uuid 
         ORDER BY sa.cert_type, sa.filename`,
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
    }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        "Vary": "Cookie",
      },
    })
  } catch (err) {
    console.error("GET /api/suppliers/[id] error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
