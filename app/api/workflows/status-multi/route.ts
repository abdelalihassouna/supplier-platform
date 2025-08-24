import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/postgresql'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supplierIds: string[] = body?.supplierIds
    const includeSteps: boolean = body?.includeSteps !== false // default true

    if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
      return NextResponse.json(
        { error: 'supplierIds (non-empty array) is required' },
        { status: 400 }
      )
    }

    // 1) Fetch latest workflow_run per supplier in one query using window function
    const runsQuery = `
      WITH ranked_runs AS (
        SELECT
          wr.*,
          ROW_NUMBER() OVER (
            PARTITION BY wr.supplier_id
            ORDER BY (wr.workflow_type = 'Q1_single_step') ASC, wr.created_at DESC
          ) AS rn
        FROM workflow_runs wr
        WHERE wr.supplier_id = ANY($1::uuid[]) 
          AND wr.workflow_type IN ('Q1_supplier_qualification', 'Q1_single_step')
      )
      SELECT 
        id, supplier_id, workflow_type, status, overall, notes, started_at, ended_at
      FROM ranked_runs
      WHERE rn = 1
    `

    const runsRes = await db.query(runsQuery, [supplierIds])
    const latestRuns = runsRes.rows as Array<{
      id: string
      supplier_id: string
      workflow_type: string
      status: string
      overall: any
      notes: any
      started_at: string | null
      ended_at: string | null
    }>

    // Build a map supplierId -> run
    const runBySupplier: Record<string, any> = {}
    for (const sid of supplierIds) runBySupplier[sid] = null
    for (const r of latestRuns) runBySupplier[r.supplier_id] = r

    // 2) Optionally fetch steps for all runs in one query
    let stepsByRun: Record<string, any[]> = {}
    if (includeSteps) {
      const runIds = latestRuns.map((r) => r.id)
      if (runIds.length > 0) {
        const stepsRes = await db.query(
          `SELECT * FROM workflow_step_results WHERE run_id = ANY($1::uuid[]) ORDER BY run_id ASC, order_index ASC`,
          [runIds]
        )
        stepsByRun = stepsRes.rows.reduce<Record<string, any[]>>((acc, step) => {
          const list = acc[step.run_id] || (acc[step.run_id] = [])
          list.push({
            id: step.id,
            step_key: step.step_key,
            name: step.name,
            status: step.status,
            issues: step.issues || [],
            details: step.details || {},
            score: step.score,
            order_index: step.order_index,
            started_at: step.started_at,
            ended_at: step.ended_at,
          })
          return acc
        }, {})
      }
    }

    // 3) Assemble response per supplier
    const results: Record<string, any> = {}
    for (const supplierId of supplierIds) {
      const workflowRun = runBySupplier[supplierId]
      if (!workflowRun) {
        results[supplierId] = { workflowRun: null }
        continue
      }
      results[supplierId] = {
        workflowRun: {
          id: workflowRun.id,
          supplier_id: workflowRun.supplier_id,
          workflow_type: workflowRun.workflow_type,
          status: workflowRun.status,
          overall: workflowRun.overall,
          notes: workflowRun.notes || [],
          steps: includeSteps ? (stepsByRun[workflowRun.id] || []) : [],
          started_at: workflowRun.started_at,
          ended_at: workflowRun.ended_at,
        },
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[API /workflows/status-multi] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow statuses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
