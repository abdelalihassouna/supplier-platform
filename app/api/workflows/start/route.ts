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
    
    // Start the workflow
    const workflowRun = await orchestrator.runQ1Workflow(supplierId, {
      ...options,
      triggeredBy: 'react_flow_ui'
    })

    return NextResponse.json({ 
      workflowRun,
      message: 'Workflow started successfully' 
    })
  } catch (error) {
    console.error('Error starting workflow:', error)
    return NextResponse.json(
      { error: 'Failed to start workflow', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
