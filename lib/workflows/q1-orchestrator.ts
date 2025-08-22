import { db } from '@/lib/database/postgresql'
import { AIVerificationService } from '@/lib/ai-verification-service'

export interface WorkflowStepResult {
  id: string
  step_key: string
  name: string
  status: 'pass' | 'fail' | 'skip'
  issues: string[]
  details?: any
  score?: number
  order_index: number
  started_at: string
  ended_at?: string
}

export interface WorkflowRunResult {
  id: string
  supplier_id: string
  workflow_type: string
  status: 'running' | 'completed' | 'failed' | 'canceled'
  overall?: 'qualified' | 'conditionally_qualified' | 'not_qualified'
  notes: string[]
  steps: WorkflowStepResult[]
  started_at: string
  ended_at?: string
}

export interface Q1WorkflowOptions {
  includeSOA?: boolean
  includeWhiteList?: boolean
  triggeredBy?: string
}

export class Q1WorkflowOrchestrator {
  private aiService = new AIVerificationService()

  async runQ1Workflow(supplierId: string, options: Q1WorkflowOptions = {}): Promise<WorkflowRunResult> {
    // Create workflow run record via Postgres
    const runInsert = await db.query(
      `INSERT INTO workflow_runs (supplier_id, workflow_type, triggered_by, status, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [supplierId, 'Q1_supplier_qualification', options.triggeredBy || null, 'running', []]
    )
    const workflowRun = runInsert.rows[0]

    const runId = workflowRun.id
    const steps: WorkflowStepResult[] = []
    const issues: string[] = []

    try {
      // Define workflow steps
      const stepDefinitions = [
        { key: 'registration', name: 'Registration Check', order: 1 },
        { key: 'preliminary', name: 'Preliminary Data Verification', order: 2 },
        { key: 'durc', name: 'DURC Verification', order: 3 },
        { key: 'whitelist_insurance', name: 'White List & Insurance', order: 4 },
        { key: 'visura', name: 'Qualification Questionnaire (VISURA)', order: 5 },
        { key: 'certifications', name: 'Certifications Verification', order: 6 },
        ...(options.includeSOA ? [{ key: 'soa', name: 'SOA Verification', order: 7 }] : []),
        { key: 'scorecard', name: 'Q1 Scorecard Generation', order: 8 },
        { key: 'finalize', name: 'Final Outcome & Follow-up', order: 9 }
      ]

      // Execute each step
      for (const stepDef of stepDefinitions) {
        const stepResult = await this.executeStep(runId, supplierId, stepDef, options)
        steps.push(stepResult)
        
        if (stepResult.status === 'fail') {
          issues.push(...stepResult.issues)
        }
      }

      // Determine overall qualification result
      const failedCriticalSteps = steps.filter(s => 
        ['durc', 'visura', 'registration'].includes(s.step_key) && s.status === 'fail'
      )
      const hasMinorIssues = steps.some(s => s.status === 'fail' && !['durc', 'visura', 'registration'].includes(s.step_key))

      let overall: 'qualified' | 'conditionally_qualified' | 'not_qualified'
      if (failedCriticalSteps.length > 0) {
        overall = 'not_qualified'
      } else if (hasMinorIssues) {
        overall = 'conditionally_qualified'
      } else {
        overall = 'qualified'
      }

      // Update workflow run with completion
      await db.query(
        `UPDATE workflow_runs SET status = $1, overall = $2, notes = $3, ended_at = $4 WHERE id = $5`,
        ['completed', overall, issues, new Date().toISOString(), runId]
      )

      return {
        id: runId,
        supplier_id: supplierId,
        workflow_type: 'Q1_supplier_qualification',
        status: 'completed',
        overall,
        notes: issues,
        steps,
        started_at: workflowRun.started_at,
        ended_at: new Date().toISOString()
      }

    } catch (error) {
      // Mark workflow as failed
      await db.query(
        `UPDATE workflow_runs SET status = $1, notes = $2, ended_at = $3 WHERE id = $4`,
        [
          'failed',
          [`Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          new Date().toISOString(),
          runId,
        ]
      )

      throw error
    }
  }

  private async executeStep(
    runId: string, 
    supplierId: string, 
    stepDef: { key: string; name: string; order: number },
    options: Q1WorkflowOptions
  ): Promise<WorkflowStepResult> {
    const startTime = new Date().toISOString()
    
    try {
      let result: { status: 'pass' | 'fail' | 'skip'; issues: string[]; details?: any; score?: number }

      switch (stepDef.key) {
        case 'registration':
          result = await this.checkRegistration(supplierId)
          break
        case 'preliminary':
          result = await this.checkPreliminaryData(supplierId)
          break
        case 'durc':
          result = await this.checkDURC(supplierId)
          break
        case 'whitelist_insurance':
          result = await this.checkWhiteListInsurance(supplierId, options.includeWhiteList)
          break
        case 'visura':
          result = await this.checkVISURA(supplierId)
          break
        case 'certifications':
          result = await this.checkCertifications(supplierId)
          break
        case 'soa':
          result = await this.checkSOA(supplierId)
          break
        case 'scorecard':
          result = await this.generateScorecard(supplierId)
          break
        case 'finalize':
          result = await this.finalizeWorkflow(supplierId)
          break
        default:
          result = { status: 'skip', issues: [`Unknown step: ${stepDef.key}`] }
      }

      const endTime = new Date().toISOString()

      // Save step result to database
      const stepInsert = await db.query(
        `INSERT INTO workflow_step_results 
         (run_id, step_key, name, status, issues, details, score, order_index, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          runId,
          stepDef.key,
          stepDef.name,
          result.status,
          result.issues,
          result.details || {},
          result.score ?? null,
          stepDef.order,
          startTime,
          endTime,
        ]
      )
      const stepRecord = stepInsert.rows[0]

      return {
        id: stepRecord?.id || '',
        step_key: stepDef.key,
        name: stepDef.name,
        status: result.status,
        issues: result.issues,
        details: result.details,
        score: result.score,
        order_index: stepDef.order,
        started_at: startTime,
        ended_at: endTime
      }

    } catch (error) {
      const endTime = new Date().toISOString()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        id: '',
        step_key: stepDef.key,
        name: stepDef.name,
        status: 'fail',
        issues: [`Step execution failed: ${errorMessage}`],
        order_index: stepDef.order,
        started_at: startTime,
        ended_at: endTime
      }
    }
  }

  private async checkRegistration(supplierId: string) {
    const supplierRes = await db.query(
      'SELECT company_name, fiscal_code, address, vat_number FROM suppliers WHERE id = $1',
      [supplierId]
    )
    const supplier = supplierRes.rows[0]

    if (!supplier) {
      return { status: 'fail' as const, issues: ['Supplier not found in database'] }
    }

    const issues: string[] = []
    if (!supplier.company_name?.trim()) issues.push('Missing company name')
    if (!supplier.fiscal_code?.trim()) issues.push('Missing fiscal code')
    if (!supplier.address?.trim()) issues.push('Missing address')

    return {
      status: issues.length === 0 ? 'pass' as const : 'fail' as const,
      issues,
      details: { supplier_data: supplier }
    }
  }

  private async checkPreliminaryData(supplierId: string) {
    const answersRes = await db.query(
      'SELECT answers FROM supplier_debasic_answers WHERE supplier_id = $1 LIMIT 1',
      [supplierId]
    )
    const answers = answersRes.rows[0]

    if (!answers?.answers) {
      return { status: 'fail' as const, issues: ['No questionnaire answers found'] }
    }

    const issues: string[] = []
    const answerData = answers.answers as Record<string, any>

    // Check declaration completeness
    if (answerData.Q1_DECLARATION_TRUE !== 'Yes') {
      issues.push('Declaration of completeness and truthfulness not confirmed')
    }

    // Check for basic required fields
    const requiredFields = ['company_legal_form', 'business_activity', 'registration_date']
    for (const field of requiredFields) {
      if (!answerData[field]) {
        issues.push(`Missing required field: ${field}`)
      }
    }

    return {
      status: issues.length === 0 ? 'pass' as const : 'fail' as const,
      issues,
      details: { questionnaire_data: answerData }
    }
  }

  private async checkDURC(supplierId: string) {
    // Find DURC document analysis
    const analysisRes = await db.query(
      `SELECT * FROM document_analysis 
       WHERE supplier_id = $1 AND document_type = 'DURC'
       ORDER BY created_at DESC LIMIT 1`,
      [supplierId]
    )
    const analysis = analysisRes.rows[0]

    if (!analysis) {
      return { status: 'fail' as const, issues: ['No DURC document found for analysis'] }
    }

    try {
      // Use existing AI verification service
      const verification = await this.aiService.verifyDocument(analysis.id, 'DURC')
      
      const issues: string[] = []
      let hasValidStatus = false

      // Check verification results
      if (verification.field_comparisons) {
        for (const comparison of verification.field_comparisons) {
          if (comparison.status === 'mismatch') {
            issues.push(`DURC field mismatch: ${comparison.field_name}`)
          }
        }
      }

      // Check for "RISULTA REGOLARE" status
      if (verification.ai_analysis?.includes('RISULTA REGOLARE') || 
          verification.field_comparisons?.some(f => f.field_name === 'risultato' && f.status === 'match')) {
        hasValidStatus = true
      } else {
        issues.push('DURC does not show "RISULTA REGOLARE" status')
      }

      return {
        status: issues.length === 0 && hasValidStatus ? 'pass' as const : 'fail' as const,
        issues,
        details: { verification_result: verification }
      }

    } catch (error) {
      return {
        status: 'fail' as const,
        issues: [`DURC verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  private async checkWhiteListInsurance(supplierId: string, includeWhiteList?: boolean) {
    const attachmentsRes = await db.query(
      `SELECT * FROM attachments WHERE supplier_id = $1 AND document_type = ANY($2)`,
      [supplierId, ['WHITE_LIST', 'INSURANCE']]
    )
    const attachments = attachmentsRes.rows

    const issues: string[] = []
    const whiteListDocs = attachments?.filter(a => a.document_type === 'WHITE_LIST') || []
    const insuranceDocs = attachments?.filter(a => a.document_type === 'INSURANCE') || []

    if (includeWhiteList && whiteListDocs.length === 0) {
      issues.push('White List documentation required but not found')
    }

    if (insuranceDocs.length === 0) {
      issues.push('Insurance policy documentation not found')
    }

    return {
      status: issues.length === 0 ? 'pass' as const : 'fail' as const,
      issues,
      details: { white_list_count: whiteListDocs.length, insurance_count: insuranceDocs.length }
    }
  }

  private async checkVISURA(supplierId: string) {
    const analysisRes = await db.query(
      `SELECT * FROM document_analysis 
       WHERE supplier_id = $1 AND document_type = 'VISURA'
       ORDER BY created_at DESC LIMIT 1`,
      [supplierId]
    )
    const analysis = analysisRes.rows[0]

    if (!analysis) {
      return { status: 'fail' as const, issues: ['No VISURA document found for analysis'] }
    }

    try {
      const verification = await this.aiService.verifyDocument(analysis.id, 'VISURA')
      
      const issues: string[] = []

      if (verification.field_comparisons) {
        for (const comparison of verification.field_comparisons) {
          if (comparison.status === 'mismatch') {
            issues.push(`VISURA field mismatch: ${comparison.field_name}`)
          }
        }
      }

      // Check activity status
      if (!verification.field_comparisons?.some(f => f.field_name === 'stato_attivita' && f.status === 'match')) {
        issues.push('Company activity status not confirmed as active')
      }

      return {
        status: issues.length === 0 ? 'pass' as const : 'fail' as const,
        issues,
        details: { verification_result: verification }
      }

    } catch (error) {
      return {
        status: 'fail' as const,
        issues: [`VISURA verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  private async checkCertifications(supplierId: string) {
    const analysisRes = await db.query(
      `SELECT * FROM document_analysis 
       WHERE supplier_id = $1 AND document_type = 'ISO'
       ORDER BY created_at DESC`,
      [supplierId]
    )
    const analysis = analysisRes.rows

    if (!analysis || analysis.length === 0) {
      return { status: 'skip' as const, issues: ['No ISO certifications found'] }
    }

    const issues: string[] = []
    let validCertifications = 0

    for (const cert of analysis) {
      try {
        const verification = await this.aiService.verifyDocument(cert.id, 'ISO')
        
        if (verification.field_comparisons?.some(c => c.status === 'mismatch')) {
          issues.push(`ISO certification ${cert.id}: field mismatches found`)
        } else {
          validCertifications++
        }
      } catch (error) {
        issues.push(`ISO certification ${cert.id}: verification failed`)
      }
    }

    return {
      status: validCertifications > 0 ? 'pass' as const : 'fail' as const,
      issues,
      details: { total_certifications: analysis.length, valid_certifications: validCertifications }
    }
  }

  private async checkSOA(supplierId: string) {
    const analysisRes = await db.query(
      `SELECT * FROM document_analysis 
       WHERE supplier_id = $1 AND document_type = 'SOA'
       ORDER BY created_at DESC LIMIT 1`,
      [supplierId]
    )
    const analysis = analysisRes.rows[0]

    if (!analysis) {
      return { status: 'skip' as const, issues: ['No SOA document found'] }
    }

    try {
      const verification = await this.aiService.verifyDocument(analysis.id, 'SOA')
      
      const issues: string[] = []

      if (verification.field_comparisons) {
        for (const comparison of verification.field_comparisons) {
          if (comparison.status === 'mismatch') {
            issues.push(`SOA field mismatch: ${comparison.field_name}`)
          }
        }
      }

      return {
        status: issues.length === 0 ? 'pass' as const : 'fail' as const,
        issues,
        details: { verification_result: verification }
      }

    } catch (error) {
      return {
        status: 'fail' as const,
        issues: [`SOA verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  private async generateScorecard(supplierId: string) {
    // Generate Q1 scorecard summary
    const supplierRes = await db.query('SELECT company_name FROM suppliers WHERE id = $1', [supplierId])
    const supplier = supplierRes.rows[0]

    if (!supplier) {
      return { status: 'fail' as const, issues: ['Cannot generate scorecard: supplier not found'] }
    }

    const scorecardId = `Q1_${supplier.company_name?.replace(/[^a-zA-Z0-9]/g, '_') || supplierId}`

    return {
      status: 'pass' as const,
      issues: [],
      details: { scorecard_id: scorecardId, generated_at: new Date().toISOString() }
    }
  }

  private async finalizeWorkflow(supplierId: string) {
    // Final workflow steps - could include notifications, updates, etc.
    return {
      status: 'pass' as const,
      issues: [],
      details: { finalized_at: new Date().toISOString() }
    }
  }
}
