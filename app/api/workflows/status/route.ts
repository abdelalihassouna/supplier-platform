import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/postgresql'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Supplier ID is required' },
        { status: 400 }
      )
    }

    // Get the latest workflow run for this supplier
    const workflowRunQuery = await db.query(
      `SELECT * FROM workflow_runs 
       WHERE supplier_id = $1 AND workflow_type IN ('Q1_supplier_qualification', 'Q1_single_step')
       ORDER BY (workflow_type = 'Q1_single_step') ASC, created_at DESC
       LIMIT 1`,
      [supplierId]
    )

    const workflowRun = workflowRunQuery.rows[0]

    if (!workflowRun) {
      return NextResponse.json({ workflowRun: null })
    }

    // Get all step results for this workflow run
    const stepsQuery = await db.query(
      `SELECT * FROM workflow_step_results 
       WHERE run_id = $1 
       ORDER BY order_index ASC`,
      [workflowRun.id]
    )

    const steps = stepsQuery.rows.map(step => ({
      id: step.id,
      step_key: step.step_key,
      name: step.name,
      status: step.status,
      issues: step.issues || [],
      details: step.details || {},
      score: step.score,
      order_index: step.order_index,
      started_at: step.started_at,
      ended_at: step.ended_at
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
      ended_at: workflowRun.ended_at
    }

    return NextResponse.json({ workflowRun: result })
  } catch (error) {
    console.error('Error fetching workflow status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow status' },
      { status: 500 }
    )
  }
}
