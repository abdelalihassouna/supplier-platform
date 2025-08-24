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

    // Verify supplier exists
    const supplierRes = await db.query('SELECT id FROM suppliers WHERE id = $1 LIMIT 1', [supplierId])
    if (!supplierRes.rows[0]) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const orchestrator = new Q1WorkflowOrchestrator()
    const result = await orchestrator.runSingleStep(supplierId, stepKey)

    return NextResponse.json({ workflowRun: result })
  } catch (error) {
    console.error('[API /workflows/start-step] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start step', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
