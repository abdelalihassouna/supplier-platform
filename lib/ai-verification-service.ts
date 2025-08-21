import { query } from '@/lib/db'
import { JaggaerClient } from '@/lib/jaggaer-client'
import OpenAI from 'openai'

interface VerificationField {
  field_name: string
  ocr_value: string | null
  api_value: string | null
  rule_type: 'exact_match' | 'fuzzy_match' | 'date_validation' | 'status_check' | 'document_specific'
  threshold: number
  is_required: boolean
  expected_values?: string[]
  match_score: number
  status: 'match' | 'mismatch' | 'missing' | 'invalid'
  notes?: string
}

interface VerificationResult {
  overall_result: 'match' | 'mismatch' | 'partial_match' | 'no_data'
  confidence_score: number
  field_comparisons: VerificationField[]
  discrepancies: string[]
  ai_analysis: string
}

// Document type definitions
type DocumentType = 'DURC' | 'VISURA' | 'SOA' | 'ISO' | 'CCIAA'

// Abstract base class for document verification strategies
abstract class DocumentVerificationStrategy {
  abstract getFieldMappings(): Record<string, string>
  abstract getVerificationRules(): { field: string; rule: string; threshold: number; required: boolean }[]
  abstract generatePromptContext(ocrData: any, supplierData: any): string
  abstract validateDocumentSpecificFields(ocrData: any): { field: string; status: string; notes: string }[]
}

// DURC verification strategy
class DURCVerificationStrategy extends DocumentVerificationStrategy {
  getFieldMappings(): Record<string, string> {
    return {
      denominazione_ragione_sociale: 'company_name',
      codice_fiscale: 'fiscal_code',
      sede_legale: 'address_combined'
    }
  }

  getVerificationRules() {
    return [
      { field: 'denominazione_ragione_sociale', rule: 'fuzzy_match', threshold: 80, required: true },
      { field: 'codice_fiscale', rule: 'exact_match', threshold: 100, required: true },
      { field: 'sede_legale', rule: 'fuzzy_match', threshold: 70, required: true },
      { field: 'risultato', rule: 'status_check', threshold: 100, required: true },
      { field: 'scadenza_validita', rule: 'date_validation', threshold: 100, required: true }
    ]
  }

  generatePromptContext(ocrData: any, supplierData: any): string {
    return `DURC Document Verification - Italian compliance document for supplier regularization.`
  }

  validateDocumentSpecificFields(ocrData: any) {
    const validations = []
    
    // DURC status must be "RISULTA REGOLARE"
    if (ocrData.risultato) {
      const isValid = ocrData.risultato.toUpperCase().includes('RISULTA REGOLARE')
      validations.push({
        field: 'risultato',
        status: isValid ? 'match' : 'mismatch',
        notes: isValid ? 'Valid DURC status' : 'Invalid DURC status - must be RISULTA REGOLARE'
      })
    }
    
    return validations
  }
}

// VISURA verification strategy
class VISURAVerificationStrategy extends DocumentVerificationStrategy {
  getFieldMappings(): Record<string, string> {
    return {
      denominazione_ragione_sociale: 'company_name',
      codice_fiscale: 'fiscal_code',
      partita_iva: 'vat_number',
      sede_legale: 'address_combined'
    }
  }

  getVerificationRules() {
    return [
      { field: 'denominazione_ragione_sociale', rule: 'fuzzy_match', threshold: 80, required: true },
      { field: 'codice_fiscale', rule: 'exact_match', threshold: 100, required: true },
      { field: 'partita_iva', rule: 'exact_match', threshold: 100, required: true },
      { field: 'sede_legale', rule: 'fuzzy_match', threshold: 70, required: true },
      { field: 'stato_attivita', rule: 'status_check', threshold: 100, required: false }
    ]
  }

  generatePromptContext(ocrData: any, supplierData: any): string {
    return `VISURA Document Verification - Italian business registry extract for company information validation.`
  }

  validateDocumentSpecificFields(ocrData: any) {
    const validations = []
    
    // Check if company is active
    if (ocrData.stato_attivita) {
      const isActive = ocrData.stato_attivita.toUpperCase().includes('ATTIVA')
      validations.push({
        field: 'stato_attivita',
        status: isActive ? 'match' : 'mismatch',
        notes: isActive ? 'Company is active' : 'Company status may be inactive'
      })
    }
    
    // Validate fiscal code format (16 characters for companies)
    if (ocrData.codice_fiscale) {
      const isValidFormat = /^[A-Z0-9]{16}$/.test(ocrData.codice_fiscale.replace(/\s/g, ''))
      if (!isValidFormat) {
        validations.push({
          field: 'codice_fiscale',
          status: 'invalid',
          notes: 'Invalid fiscal code format - must be 16 alphanumeric characters'
        })
      }
    }
    
    // Validate VAT number format (11 digits)
    if (ocrData.partita_iva) {
      const isValidVAT = /^\d{11}$/.test(ocrData.partita_iva.replace(/\s/g, ''))
      if (!isValidVAT) {
        validations.push({
          field: 'partita_iva',
          status: 'invalid',
          notes: 'Invalid VAT number format - must be 11 digits'
        })
      }
    }
    
    return validations
  }
}

// SOA verification strategy
class SOAVerificationStrategy extends DocumentVerificationStrategy {
  getFieldMappings(): Record<string, string> {
    return {
      denominazione_ragione_sociale: 'company_name',
      codice_fiscale: 'fiscal_code'
    }
  }

  getVerificationRules() {
    return [
      { field: 'denominazione_ragione_sociale', rule: 'fuzzy_match', threshold: 80, required: true },
      { field: 'codice_fiscale', rule: 'exact_match', threshold: 100, required: true },
      { field: 'data_scadenza_validita_triennale', rule: 'date_validation', threshold: 100, required: true },
      { field: 'data_scadenza_validita_quinquennale', rule: 'date_validation', threshold: 100, required: false }
    ]
  }

  generatePromptContext(ocrData: any, supplierData: any): string {
    return `SOA Document Verification - Italian qualification attestation for construction companies (Società Organismi di Attestazione).`
  }

  validateDocumentSpecificFields(ocrData: any) {
    const validations = []
    
    // Validate SOA categories format
    if (ocrData.categorie) {
      const categoriesPattern = /^(OG|OS|OG\d+|OS\d+)\s+(I{1,5}|V{1,3})/i
      const isValidCategories = categoriesPattern.test(ocrData.categorie)
      if (!isValidCategories) {
        validations.push({
          field: 'categorie',
          status: 'invalid',
          notes: 'Invalid SOA categories format - should be like "OG1 III" or "OS30 II"'
        })
      } else {
        validations.push({
          field: 'categorie',
          status: 'match',
          notes: `Valid SOA categories: ${ocrData.categorie}`
        })
      }
    }
    
    // Check attestation entity
    if (ocrData.ente_attestazione) {
      const knownEntities = ['SOA', 'ATTESTAZIONE', 'ORGANISMI']
      const hasValidEntity = knownEntities.some(entity => 
        ocrData.ente_attestazione.toUpperCase().includes(entity)
      )
      validations.push({
        field: 'ente_attestazione',
        status: hasValidEntity ? 'match' : 'mismatch',
        notes: hasValidEntity ? 'Valid attestation entity' : 'Check attestation entity validity'
      })
    }
    
    return validations
  }
}

// ISO verification strategy
class ISOVerificationStrategy extends DocumentVerificationStrategy {
  getFieldMappings(): Record<string, string> {
    return {
      denominazione_ragione_sociale: 'company_name',
      codice_fiscale: 'fiscal_code'
    }
  }

  getVerificationRules() {
    return [
      { field: 'denominazione_ragione_sociale', rule: 'fuzzy_match', threshold: 80, required: true },
      { field: 'codice_fiscale', rule: 'exact_match', threshold: 100, required: true },
      { field: 'data_scadenza', rule: 'date_validation', threshold: 100, required: true }
    ]
  }

  generatePromptContext(ocrData: any, supplierData: any): string {
    return `ISO Certificate Verification - International quality management system certification validation.`
  }

  validateDocumentSpecificFields(ocrData: any) {
    const validations = []
    
    // Validate ISO standard format
    if (ocrData.standard) {
      const isoPattern = /^ISO\s+\d{4,5}(:\d{4})?$/i
      const isValidISO = isoPattern.test(ocrData.standard.replace(/\s+/g, ' ').trim())
      if (!isValidISO) {
        validations.push({
          field: 'standard',
          status: 'invalid',
          notes: 'Invalid ISO standard format - should be like "ISO 9001:2015"'
        })
      } else {
        validations.push({
          field: 'standard',
          status: 'match',
          notes: `Valid ISO standard: ${ocrData.standard}`
        })
      }
    }
    
    // Validate certification entity
    if (ocrData.ente_certificatore) {
      const knownCertifiers = ['DNV', 'TÜV', 'RINA', 'SGS', 'BUREAU VERITAS', 'LLOYD', 'CERTIQUALITY']
      const hasKnownCertifier = knownCertifiers.some(certifier => 
        ocrData.ente_certificatore.toUpperCase().includes(certifier)
      )
      validations.push({
        field: 'ente_certificatore',
        status: hasKnownCertifier ? 'match' : 'mismatch',
        notes: hasKnownCertifier ? 'Recognized certification body' : 'Check certification body validity'
      })
    }
    
    // Validate certificate number format
    if (ocrData.numero_certificazione) {
      const hasValidNumber = ocrData.numero_certificazione.length >= 5
      validations.push({
        field: 'numero_certificazione',
        status: hasValidNumber ? 'match' : 'invalid',
        notes: hasValidNumber ? 'Valid certificate number format' : 'Certificate number too short'
      })
    }
    
    return validations
  }
}

// CCIAA verification strategy
class CCIAAVerificationStrategy extends DocumentVerificationStrategy {
  getFieldMappings(): Record<string, string> {
    return {
      denominazione_ragione_sociale: 'company_name',
      codice_fiscale: 'fiscal_code',
      sede_legale: 'address_combined'
    }
  }

  getVerificationRules() {
    return [
      { field: 'denominazione_ragione_sociale', rule: 'fuzzy_match', threshold: 80, required: true },
      { field: 'codice_fiscale', rule: 'exact_match', threshold: 100, required: true },
      { field: 'sede_legale', rule: 'fuzzy_match', threshold: 70, required: true }
    ]
  }

  generatePromptContext(ocrData: any, supplierData: any): string {
    return `CCIAA Document Verification - Italian Chamber of Commerce business registry certificate validation.`
  }

  validateDocumentSpecificFields(ocrData: any) {
    const validations = []
    
    // Validate REA number format
    if (ocrData.rea) {
      const reaPattern = /^[A-Z]{2}[-\s]?\d{6,7}$/i
      const isValidREA = reaPattern.test(ocrData.rea.replace(/\s/g, ''))
      if (!isValidREA) {
        validations.push({
          field: 'rea',
          status: 'invalid',
          notes: 'Invalid REA format - should be like "MI-1234567" or "RM1234567"'
        })
      } else {
        validations.push({
          field: 'rea',
          status: 'match',
          notes: `Valid REA number: ${ocrData.rea}`
        })
      }
    }
    
    // Validate registration date
    if (ocrData.data_iscrizione) {
      const datePattern = /^\d{2}\/\d{2}\/\d{4}$/
      const isValidDate = datePattern.test(ocrData.data_iscrizione)
      if (!isValidDate) {
        validations.push({
          field: 'data_iscrizione',
          status: 'invalid',
          notes: 'Invalid registration date format - should be DD/MM/YYYY'
        })
      } else {
        // Check if registration date is reasonable (not in future, not too old)
        try {
          const [day, month, year] = ocrData.data_iscrizione.split('/').map(Number)
          const regDate = new Date(year, month - 1, day)
          const now = new Date()
          const minDate = new Date(1900, 0, 1)
          
          if (regDate > now) {
            validations.push({
              field: 'data_iscrizione',
              status: 'invalid',
              notes: 'Registration date cannot be in the future'
            })
          } else if (regDate < minDate) {
            validations.push({
              field: 'data_iscrizione',
              status: 'invalid',
              notes: 'Registration date too old to be valid'
            })
          } else {
            validations.push({
              field: 'data_iscrizione',
              status: 'match',
              notes: 'Valid registration date'
            })
          }
        } catch {
          validations.push({
            field: 'data_iscrizione',
            status: 'invalid',
            notes: 'Invalid date format'
          })
        }
      }
    }
    
    return validations
  }
}

// Strategy factory
class VerificationStrategyFactory {
  static create(docType: DocumentType): DocumentVerificationStrategy {
    switch (docType) {
      case 'DURC':
        return new DURCVerificationStrategy()
      case 'VISURA':
        return new VISURAVerificationStrategy()
      case 'SOA':
        return new SOAVerificationStrategy()
      case 'ISO':
        return new ISOVerificationStrategy()
      case 'CCIAA':
        return new CCIAAVerificationStrategy()
      default:
        throw new Error(`Unsupported document type: ${docType}`)
    }
  }
}

export class AIVerificationService {
  private jaggaerClient: JaggaerClient
  private openai?: OpenAI

  constructor() {
    this.jaggaerClient = new JaggaerClient()
    
    // Initialize OpenAI only if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    } else {
      console.warn('OPENAI_API_KEY not found, will use fallback analysis')
    }
  }

  /**
   * Uses AI to perform intelligent field matching with fuzzy logic
   */
  private async aiFieldMatch(fieldName: string, ocrValue: string, supplierValue: string): Promise<{ match: boolean; verdict: 'match'|'no_match'; reason?: string; usedAI: boolean }> {
    if (!this.openai) {
      return { match: false, verdict: 'no_match', reason: 'OpenAI client not configured', usedAI: false }
    }

    const fieldLabels: Record<string, string> = {
      denominazione_ragione_sociale: 'Company Name',
      codice_fiscale: 'Fiscal Code',
      sede_legale: 'Legal Address'
    }

    const instructions = this.getFieldInstructions(fieldName)
    const prompt = `Compare these ${fieldLabels[fieldName] || fieldName} values:
OCR: "${ocrValue}"
DB: "${supplierValue}"

${instructions}

Return JSON: {"match": boolean, "reason": "brief explanation"}`

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a compliance officer. Return ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 100,
        temperature: 0.1
      })
      
      const content = completion.choices[0]?.message?.content?.trim() || ''
      const parsed = this.parseAIResponse(content)
      
      if (parsed && typeof parsed.match === 'boolean') {
        return {
          match: parsed.match,
          verdict: parsed.match ? 'match' : 'no_match',
          reason: parsed.reason || 'AI analysis completed',
          usedAI: true
        }
      }
      
      return { match: false, verdict: 'no_match', reason: 'Unable to parse AI output', usedAI: true }
    } catch (error) {
      console.error('AI field match error:', error)
      return { match: false, verdict: 'no_match', reason: 'AI call failed', usedAI: false }
    }
  }

  private getFieldInstructions(fieldName: string): string {
    switch (fieldName) {
      case 'denominazione_ragione_sociale':
        return 'For company names: ignore punctuation, spaces, and legal forms (SPA = S.P.A. = SpA). Focus on core business name.'
      case 'sede_legale':
        return 'For addresses: treat abbreviations as equivalent (S S ROMEA = STS ROMEA, VE = Venezia). Ignore CAP and minor formatting.'
      case 'codice_fiscale':
        return 'For fiscal codes: must match exactly (11 or 16 digits).'
      default:
        return 'Compare values considering common variations and abbreviations.'
    }
  }

  private parseAIResponse(content: string): any {
    try {
      return JSON.parse(content)
    } catch {
      const jsonMatch = content.match(/\{[^}]*"match"[^}]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch {
          const matchMatch = content.match(/"match"\s*:\s*(true|false)/)
          const reasonMatch = content.match(/"reason"\s*:\s*"([^"]*)"/)
          if (matchMatch) {
            return {
              match: matchMatch[1] === 'true',
              reason: reasonMatch ? reasonMatch[1] : 'AI analysis'
            }
          }
        }
      }
    }
    return null
  }

  /**
   * Universal document verification method
   */
  async verifyDocument(analysisId: string, docType: DocumentType): Promise<VerificationResult> {
    const strategy = VerificationStrategyFactory.create(docType)
    return this.executeVerification(analysisId, docType, strategy)
  }

  /**
   * Main verification method for DURC documents (backward compatibility)
   */
  async verifyDURCDocument(analysisId: string): Promise<VerificationResult> {
    return this.verifyDocument(analysisId, 'DURC')
  }

  /**
   * Main verification method for VISURA documents
   */
  async verifyVISURADocument(analysisId: string): Promise<VerificationResult> {
    return this.verifyDocument(analysisId, 'VISURA')
  }

  /**
   * Main verification method for SOA documents
   */
  async verifySOADocument(analysisId: string): Promise<VerificationResult> {
    return this.verifyDocument(analysisId, 'SOA')
  }

  /**
   * Main verification method for ISO documents
   */
  async verifyISODocument(analysisId: string): Promise<VerificationResult> {
    return this.verifyDocument(analysisId, 'ISO')
  }

  /**
   * Main verification method for CCIAA documents
   */
  async verifyCCIAADocument(analysisId: string): Promise<VerificationResult> {
    return this.verifyDocument(analysisId, 'CCIAA')
  }

  /**
   * Core verification execution logic
   */
  private async executeVerification(
    analysisId: string, 
    docType: DocumentType, 
    strategy: DocumentVerificationStrategy
  ): Promise<VerificationResult> {
    const startTime = Date.now()

    try {
      // Get document analysis data
      const analysisData = await this.getDocumentAnalysis(analysisId)
      if (!analysisData) {
        throw new Error('Document analysis not found')
      }

      // Get supplier data from local database (already synchronized from Jaggaer)
      const supplierData = await this.getSupplierData(analysisData.supplier_id)
      
      // Get verification rules for document type
      const rules = await this.getVerificationRules(docType)

      // Perform field-by-field verification using strategy
      const fieldComparisons = await this.compareFieldsWithStrategy(
        analysisData.extracted_fields,
        supplierData,
        strategy
      )

      // Generate AI analysis with document context
      const aiAnalysis = await this.generateAIAnalysisWithStrategy(
        analysisData.extracted_fields,
        supplierData,
        fieldComparisons,
        strategy
      )

      // Calculate overall result and confidence
      const result = this.calculateOverallResult(fieldComparisons)

      // Store verification results
      await this.storeVerificationResult(analysisId, {
        ...result,
        ai_analysis: aiAnalysis,
        processing_time: Date.now() - startTime,
        verification_model: 'gpt-4o-mini',
        document_type: docType
      })

      return {
        ...result,
        ai_analysis: aiAnalysis
      }

    } catch (error) {
      console.error(`${docType} verification failed:`, error)
      throw error
    }
  }

  private async getDocumentAnalysis(analysisId: string) {
    const { rows } = await query(
      `SELECT da.*, s.company_name, s.fiscal_code as supplier_fiscal_code, 
              s.address, s.city, s.province 
       FROM document_analysis da 
       JOIN suppliers s ON da.supplier_id = s.id 
       WHERE da.id = $1`,
      [analysisId]
    )
    
    const analysis = rows[0]
    if (!analysis) return null

    // Extract fields from documentAnnotation if available
    let extractedFields = analysis.extracted_fields || {}
    
    if (analysis.extracted_fields?.documentAnnotation) {
      try {
        const annotation = JSON.parse(analysis.extracted_fields.documentAnnotation)
        extractedFields = { ...extractedFields, ...annotation }
      } catch (error) {
        console.error('Error parsing documentAnnotation:', error)
      }
    }

    return { ...analysis, extracted_fields: extractedFields }
  }

  private async getSupplierData(supplierId: string) {
    try {
      const { rows } = await query(
        `SELECT id, bravo_id, company_name, fiscal_code, vat_number, 
                address, city, province, country, 
                email, pec_email, phone
         FROM suppliers 
         WHERE id = $1`,
        [supplierId]
      )
      
      return rows[0] || null
    } catch (error) {
      console.error('Error fetching supplier data:', error)
      return null
    }
  }

  private async getVerificationRules(docType: string) {
    const { rows } = await query(
      'SELECT * FROM verification_rules WHERE doc_type = $1 ORDER BY field_name',
      [docType]
    )
    return rows
  }

  private async compareFieldsWithStrategy(
    ocrData: any,
    supplierData: any,
    strategy: DocumentVerificationStrategy
  ): Promise<VerificationField[]> {
    const rules = strategy.getVerificationRules()
    const fieldMappings = strategy.getFieldMappings()
    const documentValidations = strategy.validateDocumentSpecificFields(ocrData)
    const comparisons: VerificationField[] = []

    for (const rule of rules) {
      const ocrValue = ocrData[rule.field]
      const supplierValue = this.getSupplierFieldValue(supplierData, rule.field, fieldMappings)

      let score = 0
      let status: 'match' | 'mismatch' | 'missing' | 'invalid' = 'invalid'
      let notes = ''

      if (!ocrValue) {
        status = 'missing'
        notes = 'Required field missing from OCR'
      } else {
        const result = await this.executeFieldRule(rule, ocrValue, supplierValue)
        score = result.score
        status = result.status
        notes = result.notes
      }

      comparisons.push({
        field_name: rule.field,
        ocr_value: ocrValue,
        api_value: supplierValue,
        rule_type: rule.rule as 'exact_match' | 'fuzzy_match' | 'date_validation' | 'status_check',
        threshold: rule.threshold,
        is_required: rule.required,
        expected_values: undefined,
        match_score: score,
        status: status,
        notes: notes
      })
    }

    // Add document-specific validations
    documentValidations.forEach(validation => {
      comparisons.push({
        field_name: validation.field,
        ocr_value: ocrData[validation.field],
        api_value: null,
        rule_type: 'document_specific',
        threshold: 100,
        is_required: false,
        expected_values: undefined,
        match_score: validation.status === 'match' ? 100 : 0,
        status: validation.status as any,
        notes: validation.notes
      })
    })

    return comparisons
  }

  private async executeFieldRule(rule: any, ocrValue: any, supplierValue: any) {
    let score = 0
    let status: 'match' | 'mismatch' | 'missing' | 'invalid' = 'invalid'
    let notes = ''

    if (!ocrValue) {
      return { score: 0, status: 'missing' as const, notes: 'Required field missing from OCR' }
    }

    switch (rule.rule) {
      case 'exact_match':
        if (supplierValue) {
          score = this.exactMatch(ocrValue, supplierValue)
          status = score >= rule.threshold ? 'match' : 'mismatch'
          notes = score < rule.threshold ? 'Below threshold match' : ''
        } else {
          status = 'missing'
          notes = 'No supplier data available for comparison'
        }
        break

      case 'fuzzy_match':
        if (supplierValue) {
          const ai = await this.aiFieldMatch(rule.field, String(ocrValue), String(supplierValue))
          score = ai.match ? 100 : 0
          status = ai.match ? 'match' : 'mismatch'
          notes = ai.reason ? `AI: ${ai.reason}` : `AI verdict: ${ai.verdict}`
          
          if (!ai.usedAI) {
            score = this.exactMatch(String(ocrValue), String(supplierValue))
            status = score >= rule.threshold ? 'match' : 'mismatch'
            notes = 'Fallback: exact match comparison'
          }
        } else {
          status = 'missing'
          notes = 'No supplier data available for comparison'
        }
        break

      case 'status_check':
        const expectedValues = this.getExpectedValues(rule.field)
        score = this.statusCheck(ocrValue, expectedValues)
        status = score >= rule.threshold ? 'match' : 'mismatch'
        if (status === 'match') {
          notes = `Expected values: ${expectedValues?.join(', ')}`
        }
        break

      case 'date_validation':
        score = this.dateValidation(ocrValue)
        if (score === 100) {
          status = 'match'
          notes = 'Valid and not expired'
        } else if (score === 50) {
          status = 'mismatch'
          notes = 'Document has expired'
        } else {
          status = 'invalid'
          notes = 'Invalid date format'
        }
        break

      default:
        status = 'invalid'
        notes = 'Unknown rule type'
    }

    return { score, status, notes }
  }

  private getExpectedValues(fieldName: string): string[] | null {
    const expectedValuesMap: Record<string, string[]> = {
      risultato: ['RISULTA REGOLARE'],
      stato_attivita: ['ATTIVA', 'ATTIVO']
    }
    return expectedValuesMap[fieldName] || null
  }

  private getSupplierFieldValue(supplierData: any, fieldName: string, mappings: Record<string, string>): string | null {
    const supplierField = mappings[fieldName]
    if (!supplierField) return null

    switch (supplierField) {
      case 'company_name':
        return supplierData?.company_name || null
      case 'fiscal_code':
        return supplierData?.fiscal_code || null
      case 'vat_number':
        return supplierData?.vat_number || null
      case 'address_combined':
        return this.buildAddress(supplierData) || null
      default:
        return supplierData?.[supplierField] || null
    }
  }

  private buildAddress(data: any): string | null {
    if (!data) return null
    const parts = [data.address, data.city, data.province].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  private exactMatch(value1: string | null, value2: string | null): number {
    if (!value1 || !value2) return 0
    return value1.trim() === value2.trim() ? 100 : 0
  }


  private statusCheck(value: string | null, expectedValues: string[] | null): number {
    if (!value || !expectedValues) return 0
    
    const cleanValue = this.cleanString(value).toUpperCase()
    const found = expectedValues.some(expected => 
      this.cleanString(expected).toUpperCase() === cleanValue
    )
    
    return found ? 100 : 0
  }

  private dateValidation(value: string | null): number {
    if (!value) return 0
    
    // Check if it's a valid date format (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
    if (!dateRegex.test(value)) return 0
    
    try {
      const [day, month, year] = value.split('/').map(Number)
      const date = new Date(year, month - 1, day)
      const now = new Date()
      
      // Check if date is valid
      if (date.getFullYear() === year && 
          date.getMonth() === month - 1 && 
          date.getDate() === day &&
          year >= 2015 && year <= 2035) {
        
        // For DURC validation: check if date is in the future (not expired)
        if (date > now) {
          return 100 // Valid and not expired
        } else {
          return 50  // Valid format but expired
        }
      }
    } catch {
      return 0
    }
    
    return 0
  }

  private cleanString(str: string): string {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
  }

  private async generateAIAnalysisWithStrategy(
    ocrData: any,
    supplierData: any,
    fieldComparisons: VerificationField[],
    strategy: DocumentVerificationStrategy
  ): Promise<string> {
    try {
      if (!this.openai) {
        return this.generateFallbackAnalysis(fieldComparisons)
      }

      const prompt = this.buildVerificationPromptWithStrategy(ocrData, supplierData, fieldComparisons, strategy)
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Agisci come Compliance Officer specializzato in verifica DURC. Obiettivo: emettere verdetti operativi e binari per i campi critici e fornire una breve motivazione business.

            Regole:
            - Per OGNI campo critico, valuta il MATCH in modo FUZZY tenendo conto di: abbreviazioni e sinonimi (es. C.DA ↔ CONTRADA, LOCALITA' ↔ LOC.), province scritte in sigla o per esteso (es. BN ↔ Benevento), presenza/assenza CAP, punteggiatura e formattazioni diverse.
            - Il verdetto finale DEVE essere uno e binario per ciascun campo: true/false.
            - Output strutturato richiesto:
              1) Un singolo oggetto JSON con chiavi: company_match (bool), fiscal_code_match (bool), address_match (bool), durc_valid (bool), compliance_risk ("High"|"Medium"|"Low"), required_actions (string).
              2) Poi una breve spiegazione (max 3-4 frasi) in linguaggio business, senza dettagli tecnici inutili.
            - Non aggiungere testo prima del JSON.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 800
      })

      return completion.choices[0]?.message?.content || this.generateFallbackAnalysis(fieldComparisons)
    } catch (error) {
      console.error('OpenAI API error:', error)
      // Fallback to rule-based analysis if OpenAI fails
      return this.generateFallbackAnalysis(fieldComparisons)
    }
  }

  private buildVerificationPromptWithStrategy(
    ocrData: any,
    supplierData: any,
    fieldComparisons: any[],
    strategy: DocumentVerificationStrategy
  ): string {
    const context = strategy.generatePromptContext(ocrData, supplierData)
    return `
${context}

OCR EXTRACTED DATA:
- Company: ${ocrData.denominazione_ragione_sociale || 'N/A'}
- Fiscal Code: ${ocrData.codice_fiscale || 'N/A'}
- Address: ${ocrData.sede_legale || 'N/A'}
- Status: ${ocrData.risultato || 'N/A'}
- Expiry: ${ocrData.scadenza_validita || 'N/A'}

SUPPLIER DATABASE DATA:
- Company: ${supplierData?.company_name || 'N/A'}
- Fiscal Code: ${supplierData?.fiscal_code || 'N/A'}
- Address: ${supplierData?.address}, ${supplierData?.city}, ${supplierData?.province || 'N/A'}

FIELD COMPARISON RESULTS:
${fieldComparisons.map(field => 
  `- ${field.field_name}: ${field.status} (${field.match_score}% match)
    OCR: "${field.ocr_value}"
    DB: "${field.api_value}"
    ${field.notes ? `Note: ${field.notes}` : ''}`
).join('\n')}

ROLE & RULES:
You are acting as a compliance officer. Determine if OCR and Supplier DB refer to the SAME entity.

Intelligent matching rules:
- Company names: ignore punctuation/spaces; treat SPA == S.P.A.
- Addresses: treat aliases like "LOCALITA'", "LOC.", "C.DA", "CONTRADA" as equivalent; consider province codes (e.g., BN == Benevento); CAP optional; minor street formatting differences allowed.
- Fiscal code must match exactly for identity confirmation.
- Expiry: compare OCR expiry date with today to assess DURC validity.

FINAL OUTPUT FORMAT:
1) A single JSON object:
{
  "company_match": true|false,
  "fiscal_code_match": true|false,
  "address_match": true|false,
  "durc_valid": true|false,
  "compliance_risk": "High"|"Medium"|"Low",
  "required_actions": "<short action list>"
}
2) Then, a short explanation (max 4 sentences) justifying the decisions.
`
  }

  private generateFallbackAnalysis(comparisons: VerificationField[]): string {
    const mismatches = comparisons.filter(c => c.status === 'mismatch' || c.status === 'missing')
    const matches = comparisons.filter(c => c.status === 'match')
    
    let analysis = `DURC Document Verification Analysis (Fallback):\n\n`
    
    analysis += `✅ Matching Fields (${matches.length}):\n`
    matches.forEach(match => {
      analysis += `- ${match.field_name}: ${match.match_score.toFixed(1)}% match\n`
    })
    
    if (mismatches.length > 0) {
      analysis += `\n❌ Issues Found (${mismatches.length}):\n`
      mismatches.forEach(mismatch => {
        analysis += `- ${mismatch.field_name}: ${mismatch.status.toUpperCase()}\n`
        analysis += `  OCR: "${mismatch.ocr_value || 'N/A'}"\n`
        analysis += `  Database: "${mismatch.api_value || 'N/A'}"\n`
        if (mismatch.notes) analysis += `  Note: ${mismatch.notes}\n`
      })
    }
    
    // Special DURC status check
    const statusField = comparisons.find(c => c.field_name === 'risultato')
    if (statusField) {
      analysis += `\n📋 DURC Status Verification:\n`
      if (statusField.status === 'match') {
        analysis += `✅ Status is valid: "${statusField.ocr_value}"\n`
      } else {
        analysis += `❌ Status issue: "${statusField.ocr_value}" (Expected: "RISULTA REGOLARE")\n`
      }
    }
    
    // Expiry date check
    const expiryField = comparisons.find(c => c.field_name === 'scadenza_validita')
    if (expiryField && expiryField.ocr_value) {
      analysis += `\n📅 Expiry Date: ${expiryField.ocr_value}\n`
      try {
        const [day, month, year] = expiryField.ocr_value.split('/').map(Number)
        const expiryDate = new Date(year, month - 1, day)
        const today = new Date()
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilExpiry < 0) {
          analysis += `❌ DURC has expired ${Math.abs(daysUntilExpiry)} days ago\n`
        } else if (daysUntilExpiry <= 30) {
          analysis += `⚠️ DURC expires in ${daysUntilExpiry} days\n`
        } else {
          analysis += `✅ DURC is valid for ${daysUntilExpiry} days\n`
        }
      } catch {
        analysis += `❌ Invalid date format\n`
      }
    }
    
    return analysis
  }

  private calculateOverallResult(comparisons: VerificationField[]): {
    overall_result: 'match' | 'mismatch' | 'partial_match' | 'no_data'
    confidence_score: number
    field_comparisons: VerificationField[]
    discrepancies: string[]
  } {
    const requiredFields = comparisons.filter(c => c.is_required)
    const matchingRequired = requiredFields.filter(c => c.status === 'match')
    const totalFields = comparisons.length
    const matchingFields = comparisons.filter(c => c.status === 'match')
    
    const discrepancies: string[] = []
    comparisons.forEach(comp => {
      if (comp.status === 'mismatch' || comp.status === 'missing') {
        discrepancies.push(`${comp.field_name}: ${comp.status} (${comp.notes || 'No details'})`)
      }
    })
    
    // Calculate confidence score
    const avgScore = comparisons.reduce((sum, comp) => sum + comp.match_score, 0) / totalFields
    
    // Determine overall result
    let overall_result: 'match' | 'mismatch' | 'partial_match' | 'no_data'
    
    if (totalFields === 0) {
      overall_result = 'no_data'
    } else if (matchingRequired.length === requiredFields.length && matchingFields.length === totalFields) {
      overall_result = 'match'
    } else if (matchingRequired.length === requiredFields.length) {
      overall_result = 'partial_match'
    } else {
      overall_result = 'mismatch'
    }
    
    return {
      overall_result,
      confidence_score: Math.round(avgScore),
      field_comparisons: comparisons,
      discrepancies
    }
  }

  private async storeVerificationResult(analysisId: string, result: any) {
    await query(
      `INSERT INTO document_verification 
       (analysis_id, supplier_id, doc_type, verification_status, verification_result, 
        confidence_score, field_comparisons, discrepancies, ai_analysis, 
        verified_by, verification_model, processing_time_ms)
       VALUES ($1, 
               (SELECT supplier_id FROM document_analysis WHERE id = $1),
               'DURC', 'completed', $2, $3, $4, $5, $6, 'ai_agent', 'custom_ai_service', $7)`,
      [
        analysisId,
        result.overall_result,
        result.confidence_score,
        JSON.stringify(result.field_comparisons),
        JSON.stringify(result.discrepancies),
        result.ai_analysis,
        result.processing_time
      ]
    )
  }
}
