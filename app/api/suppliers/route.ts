import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/suppliers - List suppliers with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""

    // Use local PostgreSQL directly (Supabase removed)
    {
      const whereClauses: string[] = []
      const params: any[] = []

      if (search) {
        // company_name, fiscal_code, vat_number, bravo_id
        whereClauses.push(
          `(company_name ILIKE $${params.length + 1} OR fiscal_code ILIKE $${params.length + 1} OR vat_number ILIKE $${
            params.length + 1
          } OR bravo_id ILIKE $${params.length + 1})`,
        )
        params.push(`%${search}%`)
      }

      if (status) {
        whereClauses.push(`verification_status = $${params.length + 1}`)
        params.push(status)
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : ""

      // total count
      const totalRes = await query<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM suppliers ${whereSql}`,
        params,
      )
      const total = totalRes.rows[0]?.count ?? 0
      const pages = Math.ceil(total / limit)

      // data page
      const startIndex = (page - 1) * limit
      const dataParams = [...params]
      const limitIndex = dataParams.length + 1
      const offsetIndex = dataParams.length + 2
      dataParams.push(limit, startIndex)

      const dataRes = await query<any>(
        `SELECT s.*, 
                COALESCE(v.total_documents, 0) as total_documents,
                COALESCE(v.verified_documents, 0) as verified_documents,
                COALESCE(v.verification_progress, 0) as verification_progress
         FROM suppliers s
         LEFT JOIN (
           SELECT 
             da.supplier_id,
             COUNT(da.id) as total_documents,
             COUNT(dv.id) as verified_documents,
             CASE 
               WHEN COUNT(da.id) = 0 THEN 0
               ELSE ROUND((COUNT(dv.id)::decimal / COUNT(da.id)) * 100)
             END as verification_progress
           FROM document_analysis da
           LEFT JOIN document_verification dv ON da.id = dv.analysis_id
           WHERE da.analysis_status = 'completed'
           GROUP BY da.supplier_id
         ) v ON s.id = v.supplier_id
         ${whereSql} 
         ORDER BY company_name ASC, id DESC 
         LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        dataParams,
      )

      // sync info (order by id to avoid missing created_at column)
      const syncRes = await query<any>(
        `SELECT * FROM supplier_sync_logs ORDER BY id DESC LIMIT 1`,
      )
      const syncLog = syncRes.rows[0]

      const response = {
        data: dataRes.rows || [],
        pagination: { page, limit, total, pages },
        sync_info: {
          last_sync: syncLog?.created_at ?? syncLog?.updated_at ?? null,
          status: syncLog?.status || "PENDING",
          total_suppliers: total,
        },
      }
      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
          "Vary": "Cookie",
        },
      })
    }

    // Unreachable: always PostgreSQL
    return NextResponse.json({ error: "Database not configured for PostgreSQL" }, { status: 500 })
  } catch (error) {
    console.error("Error in suppliers API:", error)
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 })
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const supplierData = await request.json()

    // Whitelist acceptable columns in local schema
    const allowed = [
      "bravo_id",
      "company_name",
      "fiscal_code",
      "vat_number",
      "legal_form",
      "address",
      "city",
      "province",
      "postal_code",
      "country",
      "phone",
      "email",
      "website",
      "pec_email",
      "legal_representative",
      "verification_status",
      "compliance_score",
      "last_sync_date",
    ] as const

    const entries = Object.entries(supplierData).filter(([k]) => (allowed as readonly string[]).includes(k))
    if (entries.length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 })
    }

    const columns = entries.map(([k]) => k)
    const values = entries.map(([, v]) => v)
    const placeholders = values.map((_, i) => `$${i + 1}`)

    const insertSql = `INSERT INTO suppliers (${columns.join(",")}) VALUES (${placeholders.join(",")}) RETURNING *`
    const insRes = await query<any>(insertSql, values)
    const row = insRes.rows[0]
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 })
  }
}
