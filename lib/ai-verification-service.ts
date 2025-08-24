import { query } from '@/lib/db'
import { JaggaerClient } from '@/lib/jaggaer-client'
import OpenAI from 'openai'

interface SupplierData {
  company_name: string
  fiscal_code: string
  address: string
  bravo_id: string
  capitale_sociale?: string | null
  soa_categories?: string[] | null
  iso_certifications?: string[] | null
  cciaa_numero?: string | null
  answers?: Record<string, any>
}

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
      codice_fiscale: 'fiscal_code',
      categorie: 'soa_categories'
    }
  }

  getVerificationRules() {
    return [
      { field: 'denominazione_ragione_sociale', rule: 'fuzzy_match', threshold: 80, required: true },
      { field: 'codice_fiscale', rule: 'exact_match', threshold: 100, required: true },
      { field: 'categorie', rule: 'fuzzy_match', threshold: 90, required: true },
      { field: 'data_scadenza_validita_triennale', rule: 'date_validation', threshold: 100, required: true },
      { field: 'data_scadenza_validita_quinquennale', rule: 'date_validation', threshold: 100, required: true }
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
    
    // Attestation entity: presence-only (non-critical)
    if (ocrData.ente_attestazione) {
      const value = String(ocrData.ente_attestazione).trim()
      if (value.length > 0) {
        validations.push({
          field: 'ente_attestazione',
          status: 'match',
          notes: 'Attestation entity present'
        })
      }
    }
    
    return validations
  }
}

// ISO verification strategy
class ISOVerificationStrategy extends DocumentVerificationStrategy {
  getFieldMappings(): Record<string, string> {
    return {
      denominazione_ragione_sociale: 'company_name'
    }
  }

  getVerificationRules() {
    return [
      { field: 'denominazione_ragione_sociale', rule: 'fuzzy_match', threshold: 80, required: true },
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
    
    // Certification body: presence-only requirement (do not mismatch on unknown body)
    if (ocrData.ente_certificatore) {
      const value = String(ocrData.ente_certificatore).trim()
      if (value.length > 0) {
        const knownCertifiers = ['DNV', 'TÜV', 'RINA', 'SGS', 'BUREAU VERITAS', 'LLOYD', 'CERTIQUALITY']
        const recognized = knownCertifiers.some(certifier => value.toUpperCase().includes(certifier))
        validations.push({
          field: 'ente_certificatore',
          status: 'match',
          notes: recognized ? 'Recognized certification body' : 'Captured certification body (not validated against whitelist)'
        })
      }
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

  // Normalize various OCR variants of REA into canonical form: "AA-<digits>"
  private normalizeREA(value?: string | null): string | null {
    if (!value) return null
    let v = String(value).toUpperCase().trim()
    // Remove leading/trailing label and punctuation: e.g., "REA:", "N. REA"
    v = v.replace(/\bN\.?\s*REA\b[:\-\s]*/g, '')
    v = v.replace(/\bREA\b[:\-\s]*/g, '')
    // Unify separators and remove stray punctuation
    v = v.replace(/[._]/g, '')
    v = v.replace(/[\/\\:–—−]+/g, '-')
    v = v.replace(/\s*[-]\s*/g, '-')
    v = v.replace(/\s+/g, '')
    // If it looks like AA123456 or AA-123456, normalize to AA-123456
    const m = v.match(/^([A-Z]{2})-?(\d{1,7})$/)
    if (m) return `${m[1]}-${m[2]}`
    return v
  }

  validateDocumentSpecificFields(ocrData: any) {
    const validations = []
    
    // Validate REA number format
    if (ocrData.rea) {
      const normalized = this.normalizeREA(ocrData.rea)
      const reaPattern = /^[A-Z]{2}-\d{1,7}$/
      const isValidREA = !!normalized && reaPattern.test(normalized)
      if (!isValidREA) {
        validations.push({
          field: 'rea',
          status: 'invalid',
          notes: 'Invalid REA format - expected like "MI-1234567" (also accepts variants such as "RM1234567", "FR - 41256")'
        })
      } else {
        validations.push({
          field: 'rea',
          status: 'match',
          notes: `Valid REA number (normalized): ${normalized}`
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
      partita_iva: 'VAT Number',
      sede_legale: 'Legal Address',
      capitale_sociale_sottoscritto: 'Share Capital',
      categorie: 'SOA Categories',
      standard: 'ISO Standard',
      rea: 'REA Number'
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
      case 'partita_iva':
        return 'For fiscal codes/VAT numbers: must match exactly (11 or 16 digits).'
      case 'capitale_sociale_sottoscritto':
        return 'For share capital: compare numerical values, ignore currency symbols and formatting.'
      case 'categorie':
        return 'For SOA categories: check if OCR categories are present in the supplier\'s declared SOA categories.'
      case 'standard':
        return 'For ISO standards: check if the OCR standard matches any of the supplier\'s ISO certifications.'
      case 'rea':
        return 'For REA numbers: must match exactly the format and number.'
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

  private async getSupplierData(supplierId: string): Promise<SupplierData> {
    // Get basic supplier data
    const { rows: supplierRows } = await query(
      `SELECT bravo_id, company_name, fiscal_code, address, city, province, postal_code, country
       FROM suppliers 
       WHERE id = $1`,
      [supplierId]
    )

    if (!supplierRows.length) {
      throw new Error(`Supplier not found: ${supplierId}`)
    }

    const supplier = supplierRows[0]
    
    // Get additional data from supplier_debasic_answers
    const { rows: answersRows } = await query(
      `SELECT answers
       FROM supplier_debasic_answers 
       WHERE supplier_id = $1`,
      [supplierId]
    )

    let answers: Record<string, any> = {}
    if (answersRows.length > 0 && answersRows[0].answers) {
      try {
        answers = typeof answersRows[0].answers === 'string' 
          ? JSON.parse(answersRows[0].answers) 
          : answersRows[0].answers
      } catch (error) {
        console.warn('Failed to parse supplier answers:', error)
      }
    }

    return {
      company_name: supplier.company_name,
      fiscal_code: supplier.fiscal_code,
      address: `${supplier.address || ''} ${supplier.city || ''} ${supplier.province || ''} ${supplier.postal_code || ''}`.trim(),
      bravo_id: supplier.bravo_id,
      // Additional fields from Jaggaer answers
      capitale_sociale: answers['Q1_CAPITALE_SOCIALE'] || null,
      soa_categories: answers['NEW_SCELTA SOA'] || null,
      iso_certifications: answers['Q1_ISO_SA_ALTRE'] || null,
      cciaa_numero: answers['Q1_CCIAA_NUMERO'] || null,
      answers: answers
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

    // Build a set of fields that have explicit comparison rules to avoid duplicating
    // the same field via document-specific validations (e.g., SOA 'categorie').
    const ruleFields = new Set(rules.map(r => r.field))

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

    // Add document-specific validations for fields that don't already have a rule
    documentValidations.forEach(validation => {
      if (validation.field && !ruleFields.has(validation.field)) {
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
      }
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
          // Special handling for array-type fields (SOA categories, ISO certifications)
          if (rule.field === 'categorie' && supplierValue.includes(',')) {
            score = this.checkCategoriesMatch(String(ocrValue), supplierValue)
            status = score >= rule.threshold ? 'match' : 'mismatch'
            notes = score >= rule.threshold ? 'Categories found in supplier data' : 'Categories not found in supplier data'
          } else if (rule.field === 'standard' && supplierValue.includes(',')) {
            score = this.checkISOStandardMatch(String(ocrValue), supplierValue)
            status = score >= rule.threshold ? 'match' : 'mismatch'
            notes = score >= rule.threshold ? 'ISO standard found in certifications' : 'ISO standard not found in certifications'
          } else {
            const ai = await this.aiFieldMatch(rule.field, String(ocrValue), String(supplierValue))
            score = ai.match ? 100 : 0
            status = ai.match ? 'match' : 'mismatch'
            notes = ai.reason ? `AI: ${ai.reason}` : `AI verdict: ${ai.verdict}`
            
            if (!ai.usedAI) {
              score = this.exactMatch(String(ocrValue), String(supplierValue))
              status = score >= rule.threshold ? 'match' : 'mismatch'
              notes = 'Fallback: exact match comparison'
            }
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
        const dateResult = this.validateDate(ocrValue, rule.field)
        score = dateResult.score
        status = dateResult.status
        notes = dateResult.notes
        break

      default:
        status = 'invalid'
        notes = 'Unknown rule type'
    }

    return { score, status, notes }
  }

  private getExpectedValues(fieldName: string): string[] | null {
    const expectedValuesMap: Record<string, string[]> = {
      risultato: ['RISULTA REGOLARE', 'REGOLARE'],
      stato_attivita: ['ATTIVA', 'ATTIVO', 'ACTIVE']
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
        return supplierData?.fiscal_code || null // VAT and fiscal code are same in Italy
      case 'address_combined':
        return this.buildAddress(supplierData) || null
      case 'capitale_sociale':
        return supplierData?.capitale_sociale || null
      case 'soa_categories':
        return Array.isArray(supplierData?.soa_categories) 
          ? supplierData.soa_categories.join(', ') 
          : supplierData?.soa_categories || null
      case 'iso_certifications':
        return Array.isArray(supplierData?.iso_certifications) 
          ? supplierData.iso_certifications.join(', ') 
          : supplierData?.iso_certifications || null
      case 'cciaa_numero':
        return supplierData?.cciaa_numero || null
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

  private validateDate(value: string | null, fieldName: string): { score: number; status: 'match' | 'mismatch' | 'invalid'; notes: string } {
    if (!value) {
      return { score: 0, status: 'invalid', notes: 'Date value is missing' }
    }
    
    // Parse various date formats: DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, and YYYY-MM-DD
    // Normalize separators to '/'
    const raw = String(value).trim()
    const normalized = raw.replace(/[.\-]/g, '/').replace(/\s+/g, '/')

    let date: Date | null = null
    let day: number | null = null
    let month: number | null = null
    let year: number | null = null

    // Prefer DD/MM/YYYY when ambiguous
    let m = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) {
      day = parseInt(m[1], 10)
      month = parseInt(m[2], 10)
      year = parseInt(m[3], 10)
    } else {
      // Try YYYY/MM/DD
      m = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
      if (m) {
        year = parseInt(m[1], 10)
        month = parseInt(m[2], 10)
        day = parseInt(m[3], 10)
      }
    }

    if (day == null || month == null || year == null) {
      return { score: 0, status: 'invalid', notes: 'Invalid date format' }
    }

    // Basic range checks
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      return { score: 0, status: 'invalid', notes: 'Invalid date format' }
    }

    date = new Date(year, month - 1, day)
    // Verify constructed date matches components (catches 31/02 etc.)
    if (
      isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return { score: 0, status: 'invalid', notes: 'Invalid date format' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build canonical display format DD/MM/YYYY
    const dd = String(day).padStart(2, '0')
    const mm = String(month).padStart(2, '0')
    const yyyy = String(year)
    const display = `${dd}/${mm}/${yyyy}`

    if (date < today) {
      return { score: 0, status: 'mismatch', notes: `Document expired on ${display}` }
    }

    return { score: 100, status: 'match', notes: `Valid until ${display}` }
  }

  private dateValidation(value: string | null): number {
    const result = this.validateDate(value, '')
    return result.score
  }

  private cleanString(str: string): string {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
  }

  private checkCategoriesMatch(ocrCategories: string, supplierCategories: string): number {
    if (!ocrCategories || !supplierCategories) return 0
    
    const ocrCats = ocrCategories.split(/[,;]/).map(cat => cat.trim().toUpperCase())
    const supplierCats = supplierCategories.split(/[,;]/).map(cat => cat.trim().toUpperCase())
    
    const matchedCategories = ocrCats.filter(ocrCat => 
      supplierCats.some(supplierCat => 
        supplierCat.includes(ocrCat) || ocrCat.includes(supplierCat)
      )
    )
    
    return matchedCategories.length > 0 ? 100 : 0
  }

  private checkISOStandardMatch(ocrStandard: string, supplierCertifications: string): number {
    if (!ocrStandard || !supplierCertifications) return 0
    
    const cleanOcrStandard = ocrStandard.replace(/[^\w\d]/g, '').toUpperCase()
    const cleanSupplierCerts = supplierCertifications.toUpperCase()
    
    // Check for ISO standard patterns (e.g., ISO 9001, ISO 14001, etc.)
    const isoMatch = cleanOcrStandard.match(/ISO\s*(\d+)/)
    if (isoMatch) {
      const isoNumber = isoMatch[1]
      return cleanSupplierCerts.includes(`ISO ${isoNumber}`) || cleanSupplierCerts.includes(`ISO${isoNumber}`) ? 100 : 0
    }
    
    return cleanSupplierCerts.includes(cleanOcrStandard) ? 100 : 0
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
    
    let analysis = `Document Verification Analysis (Fallback):\n\n`
    
    if (matches.length > 0) {
      analysis += `✓ Matched Fields (${matches.length}):\n`
      matches.forEach(match => {
        analysis += `  - ${match.field_name}: ${match.match_score}% match\n`
      })
      analysis += '\n'
    }
    
    if (mismatches.length > 0) {
      analysis += `✗ Issues Found (${mismatches.length}):\n`
      mismatches.forEach(mismatch => {
        analysis += `  - ${mismatch.field_name}: ${mismatch.status} (${mismatch.match_score}%)\n`
        if (mismatch.notes) {
          analysis += `    Note: ${mismatch.notes}\n`
        }
      })
      analysis += '\n'
    }
    
    const overallScore = comparisons.reduce((sum, comp) => sum + comp.match_score, 0) / comparisons.length
    const riskLevel = overallScore >= 80 ? 'Low' : overallScore >= 60 ? 'Medium' : 'High'
    
    analysis += `Overall Match Score: ${overallScore.toFixed(1)}%\n`
    analysis += `Compliance Risk: ${riskLevel}\n`
    
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
               (SELECT doc_type FROM document_analysis WHERE id = $1), 'completed', $2, $3, $4, $5, $6, 'ai_agent', 'custom_ai_service', $7)`,
      [
        analysisId,
        result.overall_result,
        result.confidence_score,
        JSON.stringify(result.field_comparisons),
        JSON.stringify(result.discrepancies),
        JSON.stringify(result.ai_analysis),
        result.processing_time
      ]
    )
  }

  private async generateAIAnalysisWithStrategyAndStore(
    ocrData: any,
    supplierData: any,
    fieldComparisons: VerificationField[],
    strategy: DocumentVerificationStrategy,
    analysisId: string
  ): Promise<string> {
    const aiAnalysis = await this.generateAIAnalysisWithStrategy(ocrData, supplierData, fieldComparisons, strategy)
    const overallResult = this.calculateOverallResult(fieldComparisons)
    await this.storeVerificationResult(analysisId, { ...overallResult, ai_analysis: aiAnalysis })
    return JSON.stringify({
      ai_analysis: aiAnalysis,
      overall_result: overallResult.overall_result,
      confidence_score: overallResult.confidence_score,
      field_comparisons: overallResult.field_comparisons,
      discrepancies: overallResult.discrepancies
    })
  }
}
