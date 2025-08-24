import { NextRequest, NextResponse } from 'next/server'
import { Q1WorkflowOrchestrator, Q1WorkflowOptions } from '@/lib/workflows/q1-orchestrator'

export async function POST(request: NextRequest) {
  try {
    const { supplierId, options = {} }: { supplierId: string; options?: Q1WorkflowOptions } = await request.json()

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Supplier ID is required' },
        { status: 400 }
      )
    }

    const orchestrator = new Q1WorkflowOrchestrator()

    // Fire-and-forget start (non-blocking)
    ;(async () => {
      try {
        const finalOptions: Q1WorkflowOptions = { includeSOA: true, ...options }
        await orchestrator.runQ1Workflow(supplierId, finalOptions)
      } catch (e) {
        console.error('[API /workflows/start] Background run failed:', e)
      }
    })()

    // Immediately return 202 Accepted; frontend will poll /status
    return NextResponse.json(
      { message: 'Workflow started', supplierId },
      { status: 202 }
    )
  } catch (error) {
    console.error('Error starting workflow:', error)
    return NextResponse.json(
      { error: 'Failed to start workflow', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
