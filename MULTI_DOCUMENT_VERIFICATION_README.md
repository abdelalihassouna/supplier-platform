# Multi-Document Verification System

## Overview

The AI Verification Service now supports comprehensive verification for **5 Italian business document types**: DURC, VISURA, SOA, ISO, and CCIAA. The system uses an extensible **Strategy Pattern** architecture that enables intelligent field matching and document-specific validations.

## Supported Document Types

| Document Type | Description | Primary Use Case |
|---------------|-------------|------------------|
| **DURC** | Documento Unico di Regolarità Contributiva | Tax and social security compliance |
| **VISURA** | Business registry extract | Company information validation |
| **SOA** | Società Organismi di Attestazione | Construction company qualifications |
| **ISO** | International certification | Quality management systems |
| **CCIAA** | Camera di Commercio certificate | Chamber of Commerce registration |

## Architecture

### Strategy Pattern Implementation

```typescript
// Abstract strategy base class
abstract class DocumentVerificationStrategy {
  abstract getFieldMappings(): Record<string, string>
  abstract getVerificationRules(): { field: string; rule: string; threshold: number; required: boolean }[]
  abstract generatePromptContext(ocrData: any, supplierData: any): string
  abstract validateDocumentSpecificFields(ocrData: any): { field: string; status: string; notes: string }[]
}

// Factory for strategy creation
class VerificationStrategyFactory {
  static create(docType: DocumentType): DocumentVerificationStrategy
}
```

## Document-Specific Verification Details

### 1. DURC (Documento Unico di Regolarità Contributiva)

**Verifiable Fields:**
- `denominazione_ragione_sociale` → `company_name` (fuzzy match, 80%)
- `codice_fiscale` → `fiscal_code` (exact match, 100%)
- `sede_legale` → `address_combined` (fuzzy match, 70%)

**Document-Specific Validations:**
- Status must be "RISULTA REGOLARE"
- Expiry date validation (must be future date)

**Usage:**
```typescript
const result = await verificationService.verifyDURCDocument(analysisId)
// or
const result = await verificationService.verifyDocument(analysisId, 'DURC')
```

### 2. VISURA (Business Registry Extract)

**Verifiable Fields:**
- `denominazione_ragione_sociale` → `company_name` (fuzzy match, 80%)
- `codice_fiscale` → `fiscal_code` (exact match, 100%)
- `partita_iva` → `vat_number` (exact match, 100%)
- `sede_legale` → `address_combined` (fuzzy match, 70%)

**Document-Specific Validations:**
- Company activity status ("ATTIVA", "ATTIVO")
- Fiscal code format (16 alphanumeric characters)
- VAT number format (11 digits)

**Usage:**
```typescript
const result = await verificationService.verifyVISURADocument(analysisId)
// or
const result = await verificationService.verifyDocument(analysisId, 'VISURA')
```

### 3. SOA (Società Organismi di Attestazione)

**Verifiable Fields:**
- `denominazione_ragione_sociale` → `company_name` (fuzzy match, 80%)
- `codice_fiscale` → `fiscal_code` (exact match, 100%)

**Document-Specific Validations:**
- SOA categories format validation (e.g., "OG1 III", "OS30 II")
- Attestation entity validation
- Triennale expiry date validation
- Quinquennale expiry date validation (optional)

**Usage:**
```typescript
const result = await verificationService.verifySOADocument(analysisId)
// or
const result = await verificationService.verifyDocument(analysisId, 'SOA')
```

**SOA Categories Examples:**
- `OG1 III` - General construction works, Class III
- `OS30 II` - Specialized works, Class II
- Pattern: `(OG|OS)\d+ (I{1,5}|V{1,3})`

### 4. ISO (International Certification)

**Verifiable Fields:**
- `denominazione_ragione_sociale` → `company_name` (fuzzy match, 80%)
- `codice_fiscale` → `fiscal_code` (exact match, 100%)

**Document-Specific Validations:**
- ISO standard format validation (e.g., "ISO 9001:2015")
- Certification body validation (DNV, TÜV, RINA, SGS, etc.)
- Certificate number format validation
- Expiry date validation

**Usage:**
```typescript
const result = await verificationService.verifyISODocument(analysisId)
// or
const result = await verificationService.verifyDocument(analysisId, 'ISO')
```

**Recognized Certification Bodies:**
- DNV, TÜV, RINA, SGS, BUREAU VERITAS, LLOYD, CERTIQUALITY

### 5. CCIAA (Camera di Commercio)

**Verifiable Fields:**
- `denominazione_ragione_sociale` → `company_name` (fuzzy match, 80%)
- `codice_fiscale` → `fiscal_code` (exact match, 100%)
- `sede_legale` → `address_combined` (fuzzy match, 70%)

**Document-Specific Validations:**
- REA number format validation (e.g., "MI-1234567", "RM1234567")
- Registration date validation (reasonable date range)

**Usage:**
```typescript
const result = await verificationService.verifyCCIAADocument(analysisId)
// or
const result = await verificationService.verifyDocument(analysisId, 'CCIAA')
```

**REA Number Format:**
- Pattern: `[A-Z]{2}[-\s]?\d{6,7}`
- Examples: "MI-1234567", "RM1234567", "TO 1234567"

## API Reference

### Universal Verification Method

```typescript
async verifyDocument(analysisId: string, docType: DocumentType): Promise<VerificationResult>
```

**Parameters:**
- `analysisId`: Document analysis ID from OCR processing
- `docType`: 'DURC' | 'VISURA' | 'SOA' | 'ISO' | 'CCIAA'

**Returns:** `VerificationResult` with overall status, confidence score, field comparisons, and AI analysis

### Document-Specific Methods

```typescript
// Backward compatible methods
async verifyDURCDocument(analysisId: string): Promise<VerificationResult>
async verifyVISURADocument(analysisId: string): Promise<VerificationResult>

// New document type methods
async verifySOADocument(analysisId: string): Promise<VerificationResult>
async verifyISODocument(analysisId: string): Promise<VerificationResult>
async verifyCCIAADocument(analysisId: string): Promise<VerificationResult>
```

## Usage Examples

### Basic Verification

```typescript
const verificationService = new AIVerificationService()

// Verify different document types
const durcResult = await verificationService.verifyDURCDocument(analysisId)
const visuraResult = await verificationService.verifyVISURADocument(analysisId)
const soaResult = await verificationService.verifySOADocument(analysisId)
const isoResult = await verificationService.verifyISODocument(analysisId)
const cciaaResult = await verificationService.verifyCCIAADocument(analysisId)

console.log('DURC Result:', durcResult.overall_result)
console.log('VISURA Confidence:', visuraResult.confidence_score)
console.log('SOA Analysis:', soaResult.ai_analysis)
```

### Batch Verification

```typescript
const documentTypes: DocumentType[] = ['DURC', 'VISURA', 'SOA', 'ISO', 'CCIAA']
const results = await Promise.all(
  documentTypes.map(docType => 
    verificationService.verifyDocument(analysisId, docType)
  )
)

results.forEach((result, index) => {
  console.log(`${documentTypes[index]}: ${result.overall_result}`)
})
```

### Field-by-Field Analysis

```typescript
const result = await verificationService.verifySOADocument(analysisId)

result.field_comparisons.forEach(field => {
  console.log(`Field: ${field.field_name}`)
  console.log(`  Status: ${field.status}`)
  console.log(`  OCR Value: ${field.ocr_value}`)
  console.log(`  DB Value: ${field.api_value}`)
  console.log(`  Match Score: ${field.match_score}%`)
  console.log(`  Notes: ${field.notes}`)
  console.log('---')
})
```

### Error Handling

```typescript
try {
  const result = await verificationService.verifyDocument(analysisId, 'SOA')
  
  if (result.overall_result === 'mismatch') {
    console.log('Verification failed. Discrepancies:')
    result.discrepancies.forEach(discrepancy => {
      console.log(`- ${discrepancy}`)
    })
  }
} catch (error) {
  console.error('Verification error:', error.message)
}
```

## Database Schema

### Verification Rules

The system uses a unified `verification_rules` table for all document types:

```sql
-- Example rules for each document type
SELECT doc_type, field_name, rule_type, threshold, is_required 
FROM verification_rules 
ORDER BY doc_type, field_name;

-- Results:
-- CCIAA | codice_fiscale | exact_match | 100 | true
-- CCIAA | denominazione_ragione_sociale | fuzzy_match | 80 | true
-- CCIAA | sede_legale | fuzzy_match | 70 | true
-- DURC | codice_fiscale | exact_match | 100 | true
-- DURC | denominazione_ragione_sociale | fuzzy_match | 80 | true
-- DURC | risultato | status_check | 100 | true
-- DURC | scadenza_validita | date_validation | 100 | true
-- DURC | sede_legale | fuzzy_match | 70 | true
-- ISO | codice_fiscale | exact_match | 100 | true
-- ISO | data_scadenza | date_validation | 100 | true
-- ISO | denominazione_ragione_sociale | fuzzy_match | 80 | true
-- SOA | codice_fiscale | exact_match | 100 | true
-- SOA | data_scadenza_validita_quinquennale | date_validation | 100 | false
-- SOA | data_scadenza_validita_triennale | date_validation | 100 | true
-- SOA | denominazione_ragione_sociale | fuzzy_match | 80 | true
-- VISURA | codice_fiscale | exact_match | 100 | true
-- VISURA | denominazione_ragione_sociale | fuzzy_match | 80 | true
-- VISURA | partita_iva | exact_match | 100 | true
-- VISURA | sede_legale | fuzzy_match | 70 | true
-- VISURA | stato_attivita | status_check | 100 | false
```

### Schema Installation

Run the database migration scripts in order:

```bash
# Install VISURA support
psql -d your_database -f scripts/05_add_visura_verification_rules.sql

# Install SOA, ISO, CCIAA support
psql -d your_database -f scripts/06_add_multi_document_verification_rules.sql
```

## Validation Rules Summary

### Rule Types

| Rule Type | Description | Use Case |
|-----------|-------------|----------|
| `exact_match` | Character-by-character comparison | Fiscal codes, VAT numbers |
| `fuzzy_match` | AI-powered intelligent matching | Company names, addresses |
| `date_validation` | Date format and expiry validation | Certificate expiry dates |
| `status_check` | Expected value validation | Document status fields |
| `document_specific` | Custom validation logic | Format validations, business rules |

### Threshold Guidelines

- **100%**: Exact match required (fiscal codes, VAT numbers)
- **80%**: High similarity for company names
- **70%**: Moderate similarity for addresses (accounts for formatting differences)

## AI-Powered Features

### Intelligent Field Matching

Each document type receives context-aware AI analysis:

```typescript
// SOA context
"SOA Document Verification - Italian qualification attestation for construction companies (Società Organismi di Attestazione)."

// ISO context  
"ISO Certificate Verification - International quality management system certification validation."

// CCIAA context
"CCIAA Document Verification - Italian Chamber of Commerce business registry certificate validation."
```

### Document-Specific Validations

- **Format Validations**: REA numbers, ISO standards, SOA categories
- **Business Logic**: Date ranges, entity validation, status checks
- **Regulatory Compliance**: Italian business registration requirements

## Performance Considerations

### Optimizations

- **Strategy Pattern**: Minimal runtime overhead
- **Database Indexing**: Optimized queries with document type indexes
- **AI Token Efficiency**: Document-specific prompts reduce token usage
- **Parallel Processing**: Support for batch verification

### Monitoring

```typescript
// Track verification performance by document type
const startTime = Date.now()
const result = await verificationService.verifyDocument(analysisId, docType)
const processingTime = Date.now() - startTime

console.log(`${docType} verification completed in ${processingTime}ms`)
console.log(`Confidence: ${result.confidence_score}%`)
```

## Extending to New Document Types

To add a new document type (e.g., "ANTITRUST"):

1. **Create Strategy Class**:
```typescript
class ANTITRUSTVerificationStrategy extends DocumentVerificationStrategy {
  getFieldMappings() { /* field mappings */ }
  getVerificationRules() { /* validation rules */ }
  generatePromptContext() { /* AI context */ }
  validateDocumentSpecificFields() { /* custom validations */ }
}
```

2. **Update Type Definition**:
```typescript
type DocumentType = 'DURC' | 'VISURA' | 'SOA' | 'ISO' | 'CCIAA' | 'ANTITRUST'
```

3. **Update Factory**:
```typescript
case 'ANTITRUST': return new ANTITRUSTVerificationStrategy()
```

4. **Add Database Rules**:
```sql
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required) VALUES
('ANTITRUST', 'denominazione_ragione_sociale', 'fuzzy_match', 80, true);
```

5. **Add Convenience Method**:
```typescript
async verifyANTITRUSTDocument(analysisId: string): Promise<VerificationResult> {
  return this.verifyDocument(analysisId, 'ANTITRUST')
}
```

## Testing

### Unit Tests

```typescript
describe('Multi-Document Verification', () => {
  const service = new AIVerificationService()

  test('SOA categories validation', () => {
    const strategy = new SOAVerificationStrategy()
    const validations = strategy.validateDocumentSpecificFields({
      categorie: 'OG1 III'
    })
    expect(validations[0].status).toBe('match')
  })

  test('ISO standard format validation', () => {
    const strategy = new ISOVerificationStrategy()
    const validations = strategy.validateDocumentSpecificFields({
      standard: 'ISO 9001:2015'
    })
    expect(validations[0].status).toBe('match')
  })

  test('CCIAA REA number validation', () => {
    const strategy = new CCIAAVerificationStrategy()
    const validations = strategy.validateDocumentSpecificFields({
      rea: 'MI-1234567'
    })
    expect(validations[0].status).toBe('match')
  })
})
```

### Integration Tests

```typescript
describe('Document Verification Integration', () => {
  test('should verify all document types', async () => {
    const documentTypes: DocumentType[] = ['DURC', 'VISURA', 'SOA', 'ISO', 'CCIAA']
    
    for (const docType of documentTypes) {
      const result = await service.verifyDocument(testAnalysisId, docType)
      expect(result.overall_result).toBeDefined()
      expect(result.confidence_score).toBeGreaterThanOrEqual(0)
      expect(result.field_comparisons.length).toBeGreaterThan(0)
    }
  })
})
```

## Conclusion

The multi-document verification system provides a comprehensive, extensible solution for validating Italian business documents. The Strategy Pattern architecture ensures maintainability while AI-powered matching delivers high accuracy across diverse document formats and variations.

**Key Benefits:**
- **Unified API**: Single interface for all document types
- **Intelligent Matching**: AI-powered fuzzy matching with fallback mechanisms
- **Extensible Design**: Easy addition of new document types
- **Production Ready**: Comprehensive error handling and performance optimization
- **Regulatory Compliance**: Italian business document standards compliance
