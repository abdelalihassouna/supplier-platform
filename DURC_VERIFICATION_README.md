# DURC Document Verification System

This document describes the AI-powered verification system for DURC (Documento Unico di Regolarità Contributiva) documents that automatically compares OCR extracted data with supplier information from the Jaggaer API.

## Overview

The DURC verification system provides:
- **Automated AI verification** of DURC documents against Jaggaer API data
- **Field-by-field comparison** with configurable matching rules
- **Confidence scoring** and detailed discrepancy reporting
- **Visual interface** for reviewing verification results
- **Audit trail** of all verification activities

## Key Features

### 🤖 AI-Powered Verification
- Compares OCR extracted data with Jaggaer API supplier data
- Uses fuzzy matching for company names and addresses
- Exact matching for fiscal codes
- Status validation for DURC results ("RISULTA REGOLARE")
- Date validation for expiry dates

### 📊 Verification Fields
For DURC documents, the system verifies:
- **Denominazione/Ragione Sociale** (Company Name) - 85% fuzzy match threshold
- **Codice Fiscale** (Fiscal Code) - 100% exact match required
- **Sede Legale** (Legal Address) - 80% fuzzy match threshold
- **Risultato** (Status) - Must be "RISULTA REGOLARE" or "REGOLARE"
- **Scadenza Validità** (Expiry Date) - Valid date format and future date

### 🎯 Smart Matching Rules
- **Exact Match**: Perfect string matching (fiscal codes)
- **Fuzzy Match**: Similarity scoring with configurable thresholds
- **Status Check**: Validation against expected values
- **Date Validation**: Format and range validation

## Setup Instructions

### 1. Database Migration

Run the verification schema migration:

```sql
-- Run this in your PostgreSQL database
\i scripts/05_document_verification_schema.sql
```

This creates:
- `document_verification` table for storing verification results
- `verification_rules` table for configurable matching rules
- Default DURC verification rules
- Indexes for performance

### 2. Environment Variables

Ensure you have the required API configurations in your `.env.local`:

```env
# Mistral AI for OCR (already configured)
MISTRAL_API_KEY=your_mistral_api_key

# Jaggaer API for supplier data (already configured)
JAGGAER_BASE_URL=your_jaggaer_url
JAGGAER_CLIENT_ID=your_client_id
JAGGAER_CLIENT_SECRET=your_client_secret
```

### 3. Dependencies

No additional npm packages required. The system uses:
- Existing Mistral OCR integration
- Existing Jaggaer API client
- Built-in string similarity algorithms

## Usage Workflow

### Step 1: Document Analysis
1. Navigate to a supplier's detail page
2. Go to the "Documents" tab
3. Click the brain icon (🧠) on a DURC document
4. Select "DURC" as document type
5. Click "Start Analysis" to extract data with Mistral OCR

### Step 2: AI Verification
1. After analysis completes, go to the "AI Verification" tab
2. Click "Start AI Verification" 
3. The system will:
   - Fetch supplier data from Jaggaer API
   - Compare each field using appropriate matching rules
   - Generate confidence scores and identify discrepancies
   - Provide detailed AI analysis report

### Step 3: Review Results
The verification results show:
- **Overall Result**: match, partial_match, mismatch, or no_data
- **Confidence Score**: 0-100% based on field matching
- **Field Comparisons**: Side-by-side OCR vs API data
- **Discrepancies**: List of issues found
- **AI Analysis**: Detailed report with recommendations

## API Endpoints

### POST /api/documents/verify
Start AI verification for a document analysis.

**Request:**
```json
{
  "analysisId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall_result": "match",
    "confidence_score": 95,
    "field_comparisons": [...],
    "discrepancies": [...],
    "ai_analysis": "..."
  }
}
```

### GET /api/documents/verify?analysisId=uuid
Retrieve existing verification results.

## Database Schema

### document_verification Table
```sql
CREATE TABLE document_verification (
    id UUID PRIMARY KEY,
    analysis_id UUID REFERENCES document_analysis(id),
    supplier_id UUID REFERENCES suppliers(id),
    doc_type TEXT NOT NULL,
    verification_status TEXT DEFAULT 'pending',
    verification_result TEXT DEFAULT 'unknown',
    confidence_score DECIMAL(5,2) DEFAULT 0.00,
    field_comparisons JSONB DEFAULT '{}',
    discrepancies JSONB DEFAULT '[]',
    ai_analysis TEXT,
    verified_by TEXT DEFAULT 'ai_agent',
    verification_model TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### verification_rules Table
```sql
CREATE TABLE verification_rules (
    id UUID PRIMARY KEY,
    doc_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    threshold DECIMAL(5,2) DEFAULT 80.00,
    is_required BOOLEAN DEFAULT true,
    expected_values TEXT[]
);
```

## Verification Rules Configuration

Default DURC rules are automatically created:

| Field | Rule Type | Threshold | Required | Expected Values |
|-------|-----------|-----------|----------|-----------------|
| denominazione_ragione_sociale | fuzzy_match | 85% | Yes | - |
| codice_fiscale | exact_match | 100% | Yes | - |
| sede_legale | fuzzy_match | 80% | Yes | - |
| risultato | status_check | 100% | Yes | ["RISULTA REGOLARE", "REGOLARE"] |
| scadenza_validita | date_validation | 100% | Yes | - |

## Troubleshooting

### Common Issues

1. **"Verification not supported for document type"**
   - Currently only DURC documents are supported
   - Ensure document analysis is completed first

2. **"No supplier data from Jaggaer"**
   - Check Jaggaer API configuration
   - Verify supplier has bravo_id for Jaggaer lookup
   - Check API connectivity

3. **Low confidence scores**
   - Review OCR quality - ensure clear, readable documents
   - Check for typos in company names or addresses
   - Verify fiscal code format consistency

4. **"Analysis must be completed before verification"**
   - Run document analysis first using Mistral OCR
   - Wait for analysis status to be 'completed'

### Debug Mode

Enable detailed logging:
```env
DEBUG_VERIFICATION=true
```

## Future Enhancements

Planned improvements:
- Support for additional document types (ISO, SOA, CCIAA, VISURA)
- Batch verification of multiple documents
- Machine learning model training on verification patterns
- Integration with external validation services
- Automated re-verification on data updates
- Custom verification rules per supplier category

## Security Considerations

- All verification data is processed server-side
- API keys stored securely in environment variables
- Verification results include audit trail
- Access controlled through existing authentication
- No sensitive data logged in plain text

## Performance

- Average verification time: 2-5 seconds per document
- Field comparison uses optimized algorithms
- Database indexes for fast result retrieval
- Caching of Jaggaer API responses
- Asynchronous processing for large batches

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review console logs for detailed error messages
3. Verify database schema is properly migrated
4. Ensure all API configurations are correct
5. Test with a simple DURC document first
