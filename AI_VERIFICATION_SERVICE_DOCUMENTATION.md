# AI Verification Service Documentation

## Overview

The AI Verification Service is a sophisticated document verification system designed to validate DURC (Documento Unico di Regolarità Contributiva) documents using AI-powered field matching and compliance analysis. The service compares OCR-extracted data with supplier database information to ensure document authenticity and compliance.

## Architecture

### Core Components

1. **AIVerificationService Class** - Main service orchestrating the verification process
2. **AI Field Matching** - OpenAI GPT-4o-mini powered intelligent field comparison
3. **Rule-based Validation** - Fallback validation using predefined rules
4. **Database Integration** - PostgreSQL integration for data persistence

### Key Interfaces

```typescript
interface VerificationField {
  field_name: string
  ocr_value: string | null
  api_value: string | null
  rule_type: 'exact_match' | 'fuzzy_match' | 'date_validation' | 'status_check'
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
```

## Features

### 1. AI-Powered Field Matching

**Purpose**: Intelligent comparison of OCR data with supplier database using natural language processing.

**How it works**:
- Uses OpenAI GPT-4o-mini for fuzzy matching
- Field-specific instructions for different data types
- Returns binary match/no-match decisions with explanations
- Handles variations in formatting, abbreviations, and legal forms

**Supported Fields**:
- `denominazione_ragione_sociale` (Company Name)
- `codice_fiscale` (Fiscal Code) 
- `sede_legale` (Legal Address)

**Example**:
```typescript
// Company name matching ignores punctuation and legal forms
// "ACME S.P.A." matches "ACME SPA" or "Acme SpA"

// Address matching handles abbreviations
// "VIA S.S. ROMEA" matches "VIA STS ROMEA"
// "VENEZIA" matches "VE"
```

### 2. Rule-Based Validation

**Purpose**: Structured validation using predefined rules as fallback when AI is unavailable.

**Rule Types**:

#### Exact Match
- **Use case**: Fiscal codes, precise identifiers
- **Logic**: Character-by-character comparison
- **Threshold**: 100% match required

#### Fuzzy Match
- **Use case**: Company names, addresses with variations
- **Logic**: AI-powered or fallback to exact match
- **Threshold**: Configurable (typically 80-90%)

#### Status Check
- **Use case**: DURC status validation
- **Logic**: Matches against expected values
- **Expected**: "RISULTA REGOLARE"

#### Date Validation
- **Use case**: Expiry date verification
- **Logic**: Format validation + expiry check
- **Format**: DD/MM/YYYY
- **Validation**: Must be future date

### 3. Document Analysis Pipeline

**Workflow**:
1. **Data Retrieval**: Fetch document analysis and supplier data
2. **Rule Application**: Apply verification rules to each field
3. **Field Comparison**: Execute AI or rule-based matching
4. **Result Calculation**: Determine overall verification status
5. **AI Analysis**: Generate comprehensive compliance report
6. **Storage**: Persist results to database

### 4. Compliance Analysis

**AI-Generated Analysis**:
- Binary verdicts for critical fields
- Risk assessment (High/Medium/Low)
- Required actions for compliance
- Business-focused explanations

**Output Format**:
```json
{
  "company_match": true,
  "fiscal_code_match": true, 
  "address_match": false,
  "durc_valid": true,
  "compliance_risk": "Medium",
  "required_actions": "Verify address discrepancy"
}
```

## Usage

### Basic Verification

```typescript
const verificationService = new AIVerificationService()

// Verify a DURC document
const result = await verificationService.verifyDURCDocument(analysisId)

console.log('Overall Result:', result.overall_result)
console.log('Confidence Score:', result.confidence_score)
console.log('AI Analysis:', result.ai_analysis)
```

### Field-by-Field Analysis

```typescript
// Access individual field comparisons
result.field_comparisons.forEach(field => {
  console.log(`${field.field_name}: ${field.status}`)
  console.log(`  OCR: ${field.ocr_value}`)
  console.log(`  DB: ${field.api_value}`)
  console.log(`  Score: ${field.match_score}%`)
  console.log(`  Notes: ${field.notes}`)
})
```

## Configuration

### Environment Variables

```bash
# Required for AI-powered matching
OPENAI_API_KEY=your_openai_api_key

# Database connection
DATABASE_URL=postgresql://user:password@host:port/database
```

### Database Schema

**Required Tables**:
- `document_analysis` - OCR extracted data
- `suppliers` - Supplier master data
- `verification_rules` - Field validation rules
- `document_verification` - Verification results

### Verification Rules Setup

```sql
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, expected_values) VALUES
('DURC', 'denominazione_ragione_sociale', 'fuzzy_match', 80, true, NULL),
('DURC', 'codice_fiscale', 'exact_match', 100, true, NULL),
('DURC', 'sede_legale', 'fuzzy_match', 70, true, NULL),
('DURC', 'risultato', 'status_check', 100, true, '["RISULTA REGOLARE"]'),
('DURC', 'scadenza_validita', 'date_validation', 100, true, NULL);
```

## Error Handling

### AI Service Failures
- **Fallback**: Automatic fallback to rule-based matching
- **Logging**: Comprehensive error logging for debugging
- **Graceful Degradation**: Service continues without AI enhancement

### Data Quality Issues
- **Missing Fields**: Marked as 'missing' status
- **Invalid Formats**: Marked as 'invalid' status  
- **Threshold Failures**: Marked as 'mismatch' with score details

### Database Errors
- **Connection Issues**: Proper error propagation
- **Transaction Safety**: Atomic operations for data consistency

## Performance Considerations

### Optimizations Applied
- **Reduced Code Size**: From 669 to ~580 lines (13% reduction)
- **Simplified AI Parsing**: Streamlined JSON response handling
- **Removed Debug Logging**: Eliminated verbose console outputs
- **Consolidated Methods**: Combined similar operations

### AI Usage Optimization
- **Token Efficiency**: Reduced max_completion_tokens from 150 to 100
- **Model Selection**: Uses cost-effective gpt-4o-mini
- **Prompt Optimization**: Concise, focused prompts

### Database Optimization
- **Selective Queries**: Only fetch required fields
- **Indexed Lookups**: Efficient supplier data retrieval
- **Batch Operations**: Single transaction for result storage

## Monitoring and Debugging

### Key Metrics
- **Processing Time**: Tracked per verification
- **AI Usage**: Success/failure rates
- **Confidence Scores**: Average verification confidence
- **Field Match Rates**: Success rates by field type

### Logging Strategy
- **Error Logging**: All failures logged with context
- **Performance Logging**: Processing time tracking
- **AI Response Logging**: Failed parsing attempts

### Troubleshooting

**Common Issues**:
1. **Low Confidence Scores**: Check OCR quality and supplier data completeness
2. **AI Parsing Failures**: Verify OpenAI API key and model availability
3. **Missing Supplier Data**: Ensure Jaggaer synchronization is working
4. **Date Validation Failures**: Check date format consistency

## Security Considerations

### Data Protection
- **API Key Security**: Environment variable storage
- **Data Sanitization**: Input validation and cleaning
- **Audit Trail**: Complete verification history

### Access Control
- **Service Level**: Internal service, no direct external access
- **Database Level**: Proper user permissions and roles
- **API Level**: Secure OpenAI API communication

## Future Enhancements

### Planned Features
1. **Multi-Document Support**: Extend beyond DURC documents
2. **Batch Processing**: Handle multiple documents simultaneously
3. **Custom AI Models**: Fine-tuned models for specific document types
4. **Real-time Monitoring**: Dashboard for verification metrics
5. **Advanced Analytics**: Trend analysis and reporting

### Scalability Improvements
1. **Caching Layer**: Redis for frequently accessed data
2. **Queue System**: Async processing for high volumes
3. **Load Balancing**: Multiple service instances
4. **Database Sharding**: Horizontal scaling for large datasets

## API Reference

### Main Methods

#### `verifyDURCDocument(analysisId: string): Promise<VerificationResult>`
Primary verification method for DURC documents.

**Parameters**:
- `analysisId`: Unique identifier for document analysis record

**Returns**: Complete verification result with AI analysis

**Throws**: Error if document analysis not found or verification fails

#### Private Methods

- `aiFieldMatch()`: AI-powered field comparison
- `getFieldInstructions()`: Field-specific matching rules
- `parseAIResponse()`: AI response parsing with fallbacks
- `compareFields()`: Execute field-by-field verification
- `calculateOverallResult()`: Determine final verification status
- `generateAIAnalysis()`: Create comprehensive AI analysis
- `storeVerificationResult()`: Persist results to database

## Conclusion

The AI Verification Service provides a robust, intelligent solution for DURC document verification. By combining AI-powered fuzzy matching with rule-based validation, it ensures high accuracy while maintaining reliability through fallback mechanisms. The optimized codebase is maintainable, performant, and ready for production use.
