import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/postgresql'

export async function POST(request: NextRequest) {
  try {
    const { supplierId }: { supplierId: string } = await request.json()

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Supplier ID is required' },
        { status: 400 }
      )
    }

    // Prefer the latest RUNNING workflow, fall back to latest any
    let runRes = await db.query(
      `SELECT * FROM workflow_runs 
       WHERE supplier_id = $1 AND workflow_type = 'Q1_supplier_qualification' AND status = 'running'
       ORDER BY created_at DESC LIMIT 1`,
      [supplierId]
    )

    let workflowRun = runRes.rows[0]

    if (!workflowRun) {
      runRes = await db.query(
        `SELECT * FROM workflow_runs 
         WHERE supplier_id = $1 AND workflow_type = 'Q1_supplier_qualification'
         ORDER BY created_at DESC LIMIT 1`,
        [supplierId]
      )
      workflowRun = runRes.rows[0]
    }

    if (!workflowRun) {
      return NextResponse.json(
        { error: 'No workflow run found for supplier' },
        { status: 404 }
      )
    }

    // If already completed/failed/canceled, just return current state with steps
    if (workflowRun.status === 'running') {
      await db.query(
        `UPDATE workflow_runs SET status = $1, ended_at = $2 WHERE id = $3`,
        ['canceled', new Date().toISOString(), workflowRun.id]
      )
      // Refresh the run row
      const refreshed = await db.query('SELECT * FROM workflow_runs WHERE id = $1', [workflowRun.id])
      workflowRun.status = refreshed.rows[0]?.status || workflowRun.status
      workflowRun.ended_at = refreshed.rows[0]?.ended_at || workflowRun.ended_at
    }

    // Load steps
    const stepsRes = await db.query(
      `SELECT * FROM workflow_step_results WHERE run_id = $1 ORDER BY order_index ASC`,
      [workflowRun.id]
    )

    const steps = stepsRes.rows.map((step: any) => ({
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

    const result = {
      id: workflowRun.id,
      supplier_id: workflowRun.supplier_id,
      workflow_type: workflowRun.workflow_type,
      status: workflowRun.status,
      overall: workflowRun.overall,
      notes: workflowRun.notes || [],
      steps,
      started_at: workflowRun.started_at,
      ended_at: workflowRun.ended_at,
    }

    return NextResponse.json({ workflowRun: result })
  } catch (error) {
    console.error('[API /workflows/cancel] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel workflow', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
