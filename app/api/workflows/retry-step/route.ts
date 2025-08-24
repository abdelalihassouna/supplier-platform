import { NextRequest, NextResponse } from 'next/server'
import { Q1WorkflowOrchestrator } from '@/lib/workflows/q1-orchestrator'
import { db } from '@/lib/database/postgresql'

export async function POST(request: NextRequest) {
  try {
    const { supplierId, stepKey }: { supplierId: string; stepKey: string } = await request.json()

    if (!supplierId || !stepKey) {
      return NextResponse.json(
        { error: 'supplierId and stepKey are required' },
        { status: 400 }
      )
    }

    // Optional: validate that there is a previous run with this step
    const prevStep = await db.query(
      `SELECT 1 FROM workflow_step_results wsr
       JOIN workflow_runs wr ON wr.id = wsr.run_id
       WHERE wr.supplier_id = $1 AND wsr.step_key = $2
       LIMIT 1`,
      [supplierId, stepKey]
    )

    if (!prevStep.rows[0]) {
      // Still allow retry as a single-step run, but inform via logs
      console.warn(`[retry-step] No prior step found for supplier=${supplierId} step=${stepKey}; executing anyway`)
    }

    const orchestrator = new Q1WorkflowOrchestrator()
    const result = await orchestrator.runSingleStep(supplierId, stepKey)

    return NextResponse.json({ workflowRun: result })
  } catch (error) {
    console.error('[API /workflows/retry-step] Error:', error)
    return NextResponse.json(
      { error: 'Failed to retry step', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
