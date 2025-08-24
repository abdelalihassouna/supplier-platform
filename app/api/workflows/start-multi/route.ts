import { NextRequest, NextResponse } from 'next/server'
import { Q1WorkflowOrchestrator, Q1WorkflowOptions } from '@/lib/workflows/q1-orchestrator'

export async function POST(request: NextRequest) {
  try {
    const { supplierIds, options = {} }: { supplierIds: string[]; options?: Q1WorkflowOptions } = await request.json()

    if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
      return NextResponse.json(
        { error: 'supplierIds (non-empty array) is required' },
        { status: 400 }
      )
    }

    const orchestrator = new Q1WorkflowOrchestrator()

    // Fire-and-forget start for each supplier (non-blocking)
    for (const supplierId of supplierIds) {
      ;(async () => {
        try {
          const finalOptions: Q1WorkflowOptions = { includeSOA: true, ...options }
          await orchestrator.runQ1Workflow(supplierId, finalOptions)
        } catch (e) {
          console.error('[API /workflows/start-multi] Background run failed:', { supplierId, error: e })
        }
      })()
    }

    // Immediately return 202 Accepted; frontend will poll /status-multi
    return NextResponse.json(
      { message: 'Workflows started', supplierIds },
      { status: 202 }
    )
  } catch (error) {
    console.error('[API /workflows/start-multi] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start workflows', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
