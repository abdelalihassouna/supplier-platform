import { db } from '@/lib/database/postgresql'
import { AIVerificationService } from '@/lib/ai-verification-service'
import { SupplierProfileValidator } from '@/lib/supplier-profile-validator'

const STEP_TIMEOUT_MS = Number.parseInt(process.env.WORKFLOW_STEP_TIMEOUT_MS || '120000')

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

  private async withTimeout<T>(promise: Promise<T>, ms: number, context: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null
    try {
      return await Promise.race<Promise<T>>([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Timeout: ${context} exceeded ${ms}ms`)), ms)
        }) as Promise<T>,
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  private async isRunCanceled(runId: string): Promise<boolean> {
    const res = await db.query('SELECT status FROM workflow_runs WHERE id = $1', [runId])
    return res.rows[0]?.status === 'canceled'
  }

  private getStepDefinition(stepKey: string): { key: string; name: string; order: number } {
    switch (stepKey) {
      case 'registration':
        return { key: 'registration', name: 'Registration Check', order: 1 }
      case 'preliminary':
        return { key: 'preliminary', name: 'Preliminary Data Verification', order: 2 }
      case 'durc':
        return { key: 'durc', name: 'DURC Verification', order: 3 }
      case 'whitelist_insurance':
        return { key: 'whitelist_insurance', name: 'White List & Insurance', order: 4 }
      case 'visura':
        return { key: 'visura', name: 'Qualification Questionnaire (VISURA)', order: 5 }
      case 'certifications':
        return { key: 'certifications', name: 'Certifications Verification', order: 6 }
      case 'soa':
        return { key: 'soa', name: 'SOA Verification', order: 7 }
      case 'scorecard':
        return { key: 'scorecard', name: 'Q1 Scorecard Generation', order: 8 }
      case 'finalize':
        return { key: 'finalize', name: 'Final Outcome & Follow-up', order: 9 }
      default:
        return { key: stepKey, name: `Unknown step: ${stepKey}`, order: 99 }
    }
  }

  async runSingleStep(supplierId: string, stepKey: string): Promise<WorkflowRunResult> {
    // Create a dedicated run for a single step execution
    const runInsert = await db.query(
      `INSERT INTO workflow_runs (supplier_id, workflow_type, triggered_by, status, notes)
       VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
      [supplierId, 'Q1_single_step', null, 'running', JSON.stringify([])]
    )
    const workflowRun = runInsert.rows[0]
    const runId = workflowRun.id

    const stepDef = this.getStepDefinition(stepKey)
    const steps: WorkflowStepResult[] = []
    const issues: string[] = []

    try {
      console.log(`[workflow] Single-step run start supplier=${supplierId} step=${stepKey}`)
      const stepResult = await this.executeStep(runId, supplierId, stepDef, {})
      steps.push(stepResult)
      if (stepResult.status === 'fail') {
        issues.push(...(stepResult.issues || []))
      }

      // Mark run completed regardless of step result (step failure isn't a run failure)
      await db.query(
        `UPDATE workflow_runs SET status = $1, notes = $2::jsonb, ended_at = $3 WHERE id = $4`,
        ['completed', JSON.stringify(issues), new Date().toISOString(), runId]
      )

      console.log(`[workflow] Single-step run completed supplier=${supplierId} step=${stepKey} status=${stepResult.status}`)
      return {
        id: runId,
        supplier_id: supplierId,
        workflow_type: 'Q1_single_step',
        status: 'completed',
        notes: issues,
        steps,
        started_at: workflowRun.started_at,
        ended_at: new Date().toISOString(),
      }
    } catch (error) {
      await db.query(
        `UPDATE workflow_runs SET status = $1, notes = $2::jsonb, ended_at = $3 WHERE id = $4`,
        [
          'failed',
          JSON.stringify([`Single-step execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`]),
          new Date().toISOString(),
          runId,
        ]
      )
      console.error(`[workflow] Single-step run failed supplier=${supplierId} step=${stepKey}:`, error)
      throw error
    }
  }

  async runQ1Workflow(supplierId: string, options: Q1WorkflowOptions = {}): Promise<WorkflowRunResult> {
    // Create workflow run record via Postgres
    const runInsert = await db.query(
      `INSERT INTO workflow_runs (supplier_id, workflow_type, triggered_by, status, notes)
       VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
      [supplierId, 'Q1_supplier_qualification', options.triggeredBy || null, 'running', JSON.stringify([])]
    )
    const workflowRun = runInsert.rows[0]

    const runId = workflowRun.id
    const steps: WorkflowStepResult[] = []
    const issues: string[] = []

    try {
      console.log(`[workflow] Run start supplier=${supplierId} options=${JSON.stringify(options)}`)
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
        // Check for cancellation before starting each step
        if (await this.isRunCanceled(runId)) {
          console.warn(`[workflow] Run canceled before step ${stepDef.key} supplier=${supplierId}`)
          await db.query(
            `UPDATE workflow_runs SET ended_at = $1 WHERE id = $2 AND ended_at IS NULL`,
            [new Date().toISOString(), runId]
          )
          return {
            id: runId,
            supplier_id: supplierId,
            workflow_type: 'Q1_supplier_qualification',
            status: 'canceled',
            notes: issues,
            steps,
            started_at: workflowRun.started_at,
            ended_at: new Date().toISOString(),
          }
        }
        const stepResult = await this.executeStep(runId, supplierId, stepDef, options)
        steps.push(stepResult)
        
        if (stepResult.status === 'fail') {
          issues.push(...stepResult.issues)
        }
      }

      // If canceled after last step but before completion update
      if (await this.isRunCanceled(runId)) {
        console.warn(`[workflow] Run canceled post-steps supplier=${supplierId}`)
        await db.query(
          `UPDATE workflow_runs SET ended_at = $1 WHERE id = $2 AND ended_at IS NULL`,
          [new Date().toISOString(), runId]
        )
        return {
          id: runId,
          supplier_id: supplierId,
          workflow_type: 'Q1_supplier_qualification',
          status: 'canceled',
          notes: issues,
          steps,
          started_at: workflowRun.started_at,
          ended_at: new Date().toISOString(),
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
        `UPDATE workflow_runs SET status = $1, overall = $2, notes = $3::jsonb, ended_at = $4 WHERE id = $5`,
        ['completed', overall, JSON.stringify(issues), new Date().toISOString(), runId]
      )

      console.log(`[workflow] Run completed supplier=${supplierId} overall=${overall}`)
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
        `UPDATE workflow_runs SET status = $1, notes = $2::jsonb, ended_at = $3 WHERE id = $4`,
        [
          'failed',
          JSON.stringify([`Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`]),
          new Date().toISOString(),
          runId,
        ]
      )

      console.error(`[workflow] Run failed supplier=${supplierId}:`, error)
      throw error
    }
  }

  private async executeStep(
    runId: string, 
    supplierId: string, 
    stepDef: { key: string; name: string; order: number },
    options: Q1WorkflowOptions
  ): Promise<WorkflowStepResult> {
    const start = Date.now()
    const startTime = new Date(start).toISOString()
    console.log(`[workflow] Step start key=${stepDef.key} supplier=${supplierId}`)
    
    try {
      let result: { status: 'pass' | 'fail' | 'skip'; issues: string[]; details?: any; score?: number }

      // Check for cancellation before starting each step
      if (await this.isRunCanceled(runId)) {
        console.warn(`[workflow] Run canceled before step ${stepDef.key} supplier=${supplierId}`)
        return {
          id: '',
          step_key: stepDef.key,
          name: stepDef.name,
          status: 'skip',
          issues: ['Run canceled'],
          order_index: stepDef.order,
          started_at: startTime,
          ended_at: new Date().toISOString(),
        }
      }

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

      const end = Date.now()
      const endTime = new Date(end).toISOString()

      // Save step result to database
      const stepInsert = await db.query(
        `INSERT INTO workflow_step_results 
         (run_id, step_key, name, status, issues, details, score, order_index, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
         RETURNING *`,
        [
          runId,
          stepDef.key,
          stepDef.name,
          result.status,
          result.issues,
          JSON.stringify(result.details || {}),
          result.score ?? null,
          stepDef.order,
          startTime,
          endTime,
        ]
      )
      const stepRecord = stepInsert.rows[0]
      console.log(`[workflow] Step end key=${stepDef.key} supplier=${supplierId} status=${result.status} duration_ms=${end - start}`)
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
      const end = Date.now()
      const endTime = new Date(end).toISOString()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[workflow] Step failed key=${stepDef.key} supplier=${supplierId} error=${errorMessage}`)

      // Persist failed step to DB as well
      try {
        const failInsert = await db.query(
          `INSERT INTO workflow_step_results 
           (run_id, step_key, name, status, issues, details, score, order_index, started_at, ended_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
           RETURNING *`,
          [
            runId,
            stepDef.key,
            stepDef.name,
            'fail',
            [`Step execution failed: ${errorMessage}`],
            JSON.stringify({}),
            null,
            stepDef.order,
            startTime,
            endTime,
          ]
        )
        const stepRecord = failInsert.rows[0]
        return {
          id: stepRecord?.id || '',
          step_key: stepDef.key,
          name: stepDef.name,
          status: 'fail',
          issues: [`Step execution failed: ${errorMessage}`],
          order_index: stepDef.order,
          started_at: startTime,
          ended_at: endTime,
        }
      } catch (persistError) {
        console.error('[workflow] Failed to persist failed step:', persistError)
        return {
          id: '',
          step_key: stepDef.key,
          name: stepDef.name,
          status: 'fail',
          issues: [`Step execution failed: ${errorMessage}`],
          order_index: stepDef.order,
          started_at: startTime,
          ended_at: endTime,
        }
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
    const debasicAnswers = (answersRes.rows[0]?.answers ?? null) as Record<string, any> | null

    // Use the same validation service as GET /api/suppliers/[id]/profile-validation
    const validationSummary = SupplierProfileValidator.validateProfile(debasicAnswers)

    // Map invalid or missing fields to workflow issues
    const issues = validationSummary.results
      .filter(r => !r.isValid)
      .map(r => {
        // r.message already includes either missing info or Expected/Got for exact_match
        return `Preliminary field ${r.field}: ${r.message}`
      })

    return {
      status: validationSummary.isCompliant ? 'pass' as const : 'fail' as const,
      issues,
      details: {
        questionnaire_data: debasicAnswers,
        validation_summary: validationSummary,
      },
    }
  }

  private async checkDURC(supplierId: string) {
    // Find DURC document analysis
    const analysisRes = await db.query(
      `SELECT * FROM document_analysis 
       WHERE supplier_id = $1 AND doc_type = 'DURC'
       ORDER BY created_at DESC LIMIT 1`,
      [supplierId]
    )
    const analysis = analysisRes.rows[0]

    if (!analysis) {
      return { status: 'fail' as const, issues: ['No DURC document found for analysis'] }
    }

    try {
      // Use AI verification service to validate DURC and compare fields
      console.log(`[verification] DURC verify start analysisId=${analysis.id} supplier=${supplierId}`)
      const verification = await this.withTimeout(
        this.aiService.verifyDocument(analysis.id, 'DURC'),
        STEP_TIMEOUT_MS,
        `DURC verification supplier=${supplierId}`
      )
      console.log(`[verification] DURC verify end analysisId=${analysis.id} supplier=${supplierId}`)

      const issues: string[] = []
      const comparisons = verification.field_comparisons || []

      // Collect mismatches, missing, and invalid fields with notes
      for (const comp of comparisons) {
        if (comp.status === 'mismatch' || comp.status === 'missing' || comp.status === 'invalid') {
          const note = comp.notes ? ` - ${comp.notes}` : ''
          issues.push(`DURC field ${comp.field_name}: ${comp.status}${note}`)
        }
      }

      // Explicit checks for DURC status and expiry
      const statusComp = comparisons.find(c => c.field_name === 'risultato')
      const expiryComp = comparisons.find(c => c.field_name === 'scadenza_validita')

      const hasValidStatus = statusComp?.status === 'match'
      const notExpired = expiryComp?.status === 'match'

      if (!hasValidStatus) {
        issues.push('DURC status is not "RISULTA REGOLARE"')
      }
      if (!notExpired) {
        issues.push('DURC expired or expiry date invalid')
      }

      return {
        status: issues.length === 0 && hasValidStatus && notExpired ? 'pass' as const : 'fail' as const,
        issues,
        details: { verification_result: verification },
        score: verification.confidence_score
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
       WHERE supplier_id = $1 AND doc_type = 'VISURA'
       ORDER BY created_at DESC LIMIT 1`,
      [supplierId]
    )
    const analysis = analysisRes.rows[0]

    if (!analysis) {
      return { status: 'fail' as const, issues: ['No VISURA document found for analysis'] }
    }

    try {
      console.log(`[verification] VISURA verify start analysisId=${analysis.id} supplier=${supplierId}`)
      const verification = await this.withTimeout(
        this.aiService.verifyDocument(analysis.id, 'VISURA'),
        STEP_TIMEOUT_MS,
        `VISURA verification supplier=${supplierId}`
      )
      console.log(`[verification] VISURA verify end analysisId=${analysis.id} supplier=${supplierId}`)
      
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
        details: { verification_result: verification },
        score: verification.confidence_score
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
       WHERE supplier_id = $1 AND doc_type = 'ISO'
       ORDER BY created_at DESC`,
      [supplierId]
    )
    const analysis = analysisRes.rows

    if (!analysis || analysis.length === 0) {
      return { status: 'skip' as const, issues: ['No ISO certifications found'] }
    }

    const issues: string[] = []
    let validCertifications = 0
    const scores: number[] = []

    for (const cert of analysis) {
      try {
        console.log(`[verification] ISO verify start analysisId=${cert.id} supplier=${supplierId}`)
        const verification = await this.withTimeout(
          this.aiService.verifyDocument(cert.id, 'ISO'),
          STEP_TIMEOUT_MS,
          `ISO verification ${cert.id} supplier=${supplierId}`
        )
        console.log(`[verification] ISO verify end analysisId=${cert.id} supplier=${supplierId}`)
        if (typeof verification.confidence_score === 'number') {
          scores.push(verification.confidence_score)
        }
        if (verification.field_comparisons?.some(c => c.status === 'mismatch')) {
          issues.push(`ISO certification ${cert.id}: field mismatches found`)
        } else {
          validCertifications++
        }
      } catch (error) {
        issues.push(`ISO certification ${cert.id}: verification failed`)
      }
    }

    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined
    return {
      status: validCertifications > 0 ? 'pass' as const : 'fail' as const,
      issues,
      details: { total_certifications: analysis.length, valid_certifications: validCertifications },
      score: avgScore
    }
  }

  private async checkSOA(supplierId: string) {
    const analysisRes = await db.query(
      `SELECT * FROM document_analysis 
       WHERE supplier_id = $1 AND doc_type = 'SOA'
       ORDER BY created_at DESC LIMIT 1`,
      [supplierId]
    )
    const analysis = analysisRes.rows[0]

    if (!analysis) {
      return { status: 'skip' as const, issues: ['No SOA document found'] }
    }

    try {
      const verification = await this.withTimeout(
        this.aiService.verifyDocument(analysis.id, 'SOA'),
        STEP_TIMEOUT_MS,
        `SOA verification supplier=${supplierId}`
      )
      
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