import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/queue/analysis
// Returns queue stats and a sample of recent jobs for 'document-analysis' from pg-boss tables
export async function GET(_request: NextRequest) {
  try {
    // pg-boss default schema is 'pgboss'
    const schema = process.env.PGBOSS_SCHEMA || 'pgboss'
    const jobTable = `${schema}.job`

    // Counts by state
    const countsSql = `
      SELECT state, COUNT(*)::int AS count
      FROM ${jobTable}
      WHERE name = 'document-analysis'
      GROUP BY state
    `

    const { rows: countRows } = await query<{ state: string; count: number }>(countsSql)
    const counts: Record<string, number> = {}
    for (const r of countRows) counts[r.state] = r.count

    // Recent jobs per state
    const listSql = (state: string) => `
      SELECT id, name, state, retrycount, startafter, createdon, completedon, keepuntil, data
      FROM ${jobTable}
      WHERE name = 'document-analysis' AND state = '${state}'
      ORDER BY createdon DESC
      LIMIT 25
    `

    const [pending, active, failed, completed] = await Promise.all([
      query<any>(listSql('created')), // pending created
      query<any>(listSql('active')),
      query<any>(listSql('failed')),
      query<any>(listSql('completed')),
    ])

    // Aggregate 'pending' as created + retry
    const retryList = await query<any>(listSql('retry')).catch(() => ({ rows: [] as any[] }))
    const pendingRows = [...pending.rows, ...retryList.rows]

    return NextResponse.json({
      success: true,
      counts: {
        pending: (counts['created'] || 0) + (counts['retry'] || 0),
        active: counts['active'] || 0,
        failed: counts['failed'] || 0,
        completed: counts['completed'] || 0,
      },
      recent: {
        pending: pendingRows,
        active: active.rows,
        failed: failed.rows,
        completed: completed.rows,
      },
    })
  } catch (error) {
    console.error('Queue dashboard error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load queue info' }, { status: 500 })
  }
}
