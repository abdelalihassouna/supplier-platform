import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/export - Export data in various formats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "suppliers"
    const format = searchParams.get("format") || "csv"

    // Get data based on type
    let data = []
    if (type === "suppliers") {
      const res = await query<any>(`SELECT * FROM suppliers`)
      data = res.rows || []
    }

    // Convert to CSV (simplified)
    if (format === "csv") {
      const headers = Object.keys(data[0] || {}).join(",")
      const rows = data.map((row) => Object.values(row).join(",")).join("\n")
      const csv = `${headers}\n${rows}`

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}-export.csv"`,
        },
      })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: "Export failed", details: (error as Error).message }, { status: 500 })
  }
}
