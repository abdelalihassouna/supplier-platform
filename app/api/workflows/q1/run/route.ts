import { NextRequest, NextResponse } from 'next/server'
import { Q1WorkflowOrchestrator } from '@/lib/workflows/q1-orchestrator'
import { db } from '@/lib/database/postgresql'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, includeSOA = false, includeWhiteList = false } = body

    if (!supplierId) {
      return NextResponse.json(
        { error: 'supplierId is required' },
        { status: 400 }
      )
    }

    // Verify supplier exists via local Postgres
    const supplierRes = await db.query('SELECT id, company_name FROM suppliers WHERE id = $1', [supplierId])
    const supplier = supplierRes.rows[0]

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // No Supabase auth: triggeredBy not available in this setup
    const triggeredBy: string | undefined = undefined

    // Run Q1 workflow
    const orchestrator = new Q1WorkflowOrchestrator()
    const result = await orchestrator.runQ1Workflow(supplierId, {
      includeSOA,
      includeWhiteList,
      triggeredBy
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Q1 workflow execution failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Workflow execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')
    const supplierId = searchParams.get('supplierId')

    if (runId) {
      // Get specific workflow run
      const runResult = await db.query('SELECT * FROM workflow_runs WHERE id = $1', [runId])
      const workflowRun = runResult.rows[0]

      if (!workflowRun) {
        return NextResponse.json(
          { error: 'Workflow run not found' },
          { status: 404 }
        )
      }

      const stepsRes = await db.query(
        'SELECT * FROM workflow_step_results WHERE run_id = $1 ORDER BY order_index ASC',
        [runId]
      )

      return NextResponse.json({
        ...workflowRun,
        steps: stepsRes.rows || []
      })

    } else if (supplierId) {
      // Get workflow runs for supplier
      const runsRes = await db.query(
        `SELECT * FROM workflow_runs 
         WHERE supplier_id = $1 AND workflow_type = 'Q1_supplier_qualification'
         ORDER BY created_at DESC`,
        [supplierId]
      )

      const runs = runsRes.rows

      // Fetch steps for each run
      const runsWithSteps = await Promise.all(
        runs.map(async (run: any) => {
          const steps = await db.query(
            'SELECT * FROM workflow_step_results WHERE run_id = $1 ORDER BY order_index ASC',
            [run.id]
          )
          return { ...run, steps: steps.rows || [] }
        })
      )

      return NextResponse.json({ runs: runsWithSteps })

    } else {
      return NextResponse.json(
        { error: 'Either runId or supplierId is required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Failed to fetch workflow data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
