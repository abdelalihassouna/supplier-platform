import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/postgresql'

export async function POST(request: NextRequest) {
  try {
    const { supplierIds }: { supplierIds: string[] } = await request.json()

    if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
      return NextResponse.json(
        { error: 'supplierIds (non-empty array) is required' },
        { status: 400 }
      )
    }

    const results: Record<string, any> = {}

    await Promise.all(
      supplierIds.map(async (supplierId) => {
        try {
          const runRes = await db.query(
            `SELECT * FROM workflow_runs 
             WHERE supplier_id = $1 AND workflow_type IN ('Q1_supplier_qualification', 'Q1_single_step')
             ORDER BY (workflow_type = 'Q1_single_step') ASC, created_at DESC
             LIMIT 1`,
            [supplierId]
          )
          const workflowRun = runRes.rows[0]
          if (!workflowRun) {
            results[supplierId] = { workflowRun: null }
            return
          }

          const stepsRes = await db.query(
            `SELECT * FROM workflow_step_results WHERE run_id = $1 ORDER BY order_index ASC`,
            [workflowRun.id]
          )

          const steps = stepsRes.rows.map((step) => ({
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
          }))

          results[supplierId] = {
            workflowRun: {
              id: workflowRun.id,
              supplier_id: workflowRun.supplier_id,
              workflow_type: workflowRun.workflow_type,
              status: workflowRun.status,
              overall: workflowRun.overall,
              notes: workflowRun.notes || [],
              steps,
              started_at: workflowRun.started_at,
              ended_at: workflowRun.ended_at,
            },
          }
        } catch (e) {
          console.error('[API /workflows/status-multi] Error for supplier:', supplierId, e)
          results[supplierId] = { workflowRun: null, error: 'Failed to fetch status' }
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[API /workflows/status-multi] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow statuses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
