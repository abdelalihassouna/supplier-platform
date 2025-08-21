# VISURA Document Verification Extension

## Overview

This document describes the extension of the AI Verification Service to support VISURA (Italian business registry extract) documents. The implementation follows software architecture best practices using the **Strategy Pattern** for extensible, maintainable multi-document verification.

## Architecture Design

### Strategy Pattern Implementation

The solution uses an extensible architecture that allows adding new document types without modifying existing code:

```typescript
// Abstract strategy for document verification
abstract class DocumentVerificationStrategy {
  abstract getFieldMappings(): Record<string, string>
  abstract getVerificationRules(): { field: string; rule: string; threshold: number; required: boolean }[]
  abstract generatePromptContext(ocrData: any, supplierData: any): string
  abstract validateDocumentSpecificFields(ocrData: any): { field: string; status: string; notes: string }[]
}

// VISURA-specific implementation
class VISURAVerificationStrategy extends DocumentVerificationStrategy {
  // Implementation details...
}
```

### Key Benefits

- **Open/Closed Principle**: Open for extension, closed for modification
- **Single Responsibility**: Each strategy handles one document type
- **Polymorphism**: Unified interface for all document types
- **Maintainability**: Easy to add new document types (SOA, ISO, etc.)

## VISURA Document Fields

### Verifiable Fields (Against Supplier DB)

| VISURA Field | Supplier DB Field | Verification Rule | Required |
|--------------|-------------------|-------------------|----------|
| `denominazione_ragione_sociale` | `company_name` | fuzzy_match (80%) | ✅ |
| `codice_fiscale` | `fiscal_code` | exact_match (100%) | ✅ |
| `partita_iva` | `vat_number` | exact_match (100%) | ✅ |
| `sede_legale` | `address + city + province` | fuzzy_match (70%) | ✅ |

### Document-Specific Fields

| Field | Validation | Purpose |
|-------|------------|---------|
| `stato_attivita` | Status check ("ATTIVA", "ATTIVO") | Company activity status |
| `attivita_esercitata` | No validation | Business activity description |
| `capitale_sociale_sottoscritto` | No validation | Share capital information |
| `data_estratto` | No validation | Extract date |

## Implementation Details

### VISURA Verification Strategy

```typescript
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

  validateDocumentSpecificFields(ocrData: any) {
    const validations = []
    
    // Company activity status validation
    if (ocrData.stato_attivita) {
      const isActive = ocrData.stato_attivita.toUpperCase().includes('ATTIVA')
      validations.push({
        field: 'stato_attivita',
        status: isActive ? 'match' : 'mismatch',
        notes: isActive ? 'Company is active' : 'Company status may be inactive'
      })
    }
    
    // Fiscal code format validation (16 characters)
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
    
    // VAT number format validation (11 digits)
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
```

## Usage Examples

### Basic VISURA Verification

```typescript
const verificationService = new AIVerificationService()

// Verify VISURA document
const result = await verificationService.verifyVISURADocument(analysisId)

console.log('Overall Result:', result.overall_result)
console.log('Confidence Score:', result.confidence_score)
console.log('AI Analysis:', result.ai_analysis)
```

### Universal Document Verification

```typescript
// Using the universal method
const durcResult = await verificationService.verifyDocument(analysisId, 'DURC')
const visuraResult = await verificationService.verifyDocument(analysisId, 'VISURA')

// Future document types
// const soaResult = await verificationService.verifyDocument(analysisId, 'SOA')
// const isoResult = await verificationService.verifyDocument(analysisId, 'ISO')
```

### Field-by-Field Analysis

```typescript
const result = await verificationService.verifyVISURADocument(analysisId)

result.field_comparisons.forEach(field => {
  console.log(`${field.field_name}: ${field.status}`)
  console.log(`  OCR: ${field.ocr_value}`)
  console.log(`  DB: ${field.api_value}`)
  console.log(`  Score: ${field.match_score}%`)
  console.log(`  Notes: ${field.notes}`)
})
```

## Database Schema

### Verification Rules

```sql
-- VISURA verification rules
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required) VALUES
('VISURA', 'denominazione_ragione_sociale', 'fuzzy_match', 80, true),
('VISURA', 'codice_fiscale', 'exact_match', 100, true),
('VISURA', 'partita_iva', 'exact_match', 100, true),
('VISURA', 'sede_legale', 'fuzzy_match', 70, true),
('VISURA', 'stato_attivita', 'status_check', 100, false);
```

### Document Verification Table

```sql
-- Add document_type column for multi-document support
ALTER TABLE document_verification 
ADD COLUMN document_type VARCHAR(20) DEFAULT 'DURC';

-- Create indexes for performance
CREATE INDEX idx_document_verification_doc_type ON document_verification(document_type);
CREATE INDEX idx_verification_rules_doc_type ON verification_rules(doc_type);
```

## AI-Powered Verification Features

### Intelligent Field Matching

The VISURA verification leverages AI for smart field comparison:

- **Company Name Matching**: Handles variations like "S.R.L." vs "SRL", punctuation differences
- **Address Matching**: Recognizes abbreviations ("VIA" vs "V.", "ROMA" vs "RM")
- **Format Validation**: Ensures fiscal codes and VAT numbers meet Italian standards

### Context-Aware Analysis

```typescript
generatePromptContext(ocrData: any, supplierData: any): string {
  return `VISURA Document Verification - Italian business registry extract for company information validation.`
}
```

The AI receives document-specific context to provide more accurate analysis and recommendations.

## Validation Rules

### Exact Match Rules

- **Fiscal Code**: Must match exactly (16 alphanumeric characters)
- **VAT Number**: Must match exactly (11 digits)

### Fuzzy Match Rules

- **Company Name**: 80% similarity threshold with AI-powered matching
- **Address**: 70% similarity threshold considering Italian address formats

### Status Check Rules

- **Activity Status**: Must contain "ATTIVA" or "ATTIVO"

### Format Validations

- **Fiscal Code**: `/^[A-Z0-9]{16}$/` pattern
- **VAT Number**: `/^\d{11}$/` pattern

## Error Handling

### Missing Fields

```typescript
if (!ocrValue) {
  return { 
    score: 0, 
    status: 'missing', 
    notes: 'Required field missing from OCR' 
  }
}
```

### Invalid Formats

```typescript
if (!isValidFormat) {
  validations.push({
    field: 'codice_fiscale',
    status: 'invalid',
    notes: 'Invalid fiscal code format - must be 16 alphanumeric characters'
  })
}
```

### AI Fallback

When AI is unavailable, the system automatically falls back to exact string matching with appropriate logging.

## Extending to New Document Types

To add support for new document types (e.g., SOA, ISO):

1. **Create Strategy Class**:
```typescript
class SOAVerificationStrategy extends DocumentVerificationStrategy {
  getFieldMappings() { /* SOA-specific mappings */ }
  getVerificationRules() { /* SOA-specific rules */ }
  generatePromptContext() { /* SOA-specific context */ }
  validateDocumentSpecificFields() { /* SOA validations */ }
}
```

2. **Update Factory**:
```typescript
class VerificationStrategyFactory {
  static create(docType: DocumentType): DocumentVerificationStrategy {
    switch (docType) {
      case 'DURC': return new DURCVerificationStrategy()
      case 'VISURA': return new VISURAVerificationStrategy()
      case 'SOA': return new SOAVerificationStrategy() // New
      default: throw new Error(`Unsupported document type: ${docType}`)
    }
  }
}
```

3. **Add Database Rules**:
```sql
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required) VALUES
('SOA', 'denominazione_ragione_sociale', 'fuzzy_match', 80, true),
('SOA', 'codice_fiscale', 'exact_match', 100, true);
-- ... additional SOA rules
```

4. **Add Convenience Method**:
```typescript
async verifySOADocument(analysisId: string): Promise<VerificationResult> {
  return this.verifyDocument(analysisId, 'SOA')
}
```

## Performance Considerations

- **Strategy Pattern**: Minimal overhead, strategies are lightweight
- **Database Indexing**: Optimized queries with document type indexes
- **AI Usage**: Efficient token usage with focused prompts
- **Caching**: Field mappings and rules are computed once per verification

## Testing

### Unit Tests

```typescript
describe('VISURAVerificationStrategy', () => {
  it('should map fields correctly', () => {
    const strategy = new VISURAVerificationStrategy()
    const mappings = strategy.getFieldMappings()
    expect(mappings.partita_iva).toBe('vat_number')
  })

  it('should validate VAT number format', () => {
    const strategy = new VISURAVerificationStrategy()
    const validations = strategy.validateDocumentSpecificFields({
      partita_iva: '12345678901' // Valid 11-digit VAT
    })
    expect(validations).toHaveLength(0) // No validation errors
  })
})
```

### Integration Tests

```typescript
describe('VISURA Document Verification', () => {
  it('should verify VISURA document successfully', async () => {
    const service = new AIVerificationService()
    const result = await service.verifyVISURADocument(testAnalysisId)
    
    expect(result.overall_result).toBe('match')
    expect(result.confidence_score).toBeGreaterThan(80)
    expect(result.field_comparisons).toContainEqual(
      expect.objectContaining({
        field_name: 'partita_iva',
        status: 'match'
      })
    )
  })
})
```

## Conclusion

The VISURA verification extension demonstrates a well-architected solution that:

- **Follows SOLID Principles**: Single responsibility, open/closed, dependency inversion
- **Uses Design Patterns**: Strategy pattern for extensibility
- **Maintains Backward Compatibility**: Existing DURC functionality unchanged
- **Enables Future Growth**: Easy to add SOA, ISO, and other document types
- **Leverages AI Intelligently**: Context-aware verification with fallback mechanisms

This implementation provides a robust foundation for multi-document verification while maintaining code quality and architectural integrity.
