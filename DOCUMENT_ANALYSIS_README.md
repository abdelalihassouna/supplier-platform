# Document Analysis with Mistral OCR

This document describes the implementation of AI-powered document analysis using Mistral OCR for extracting structured data from supplier documents.

## Overview

The document analysis system allows you to:
- Automatically extract structured data from PDF and image documents
- Support for multiple document types (CCIAA, DURC, ISO, SOA, VISURA)
- Validate and review extracted data through a user-friendly interface
- Track analysis status and maintain audit trails

## Setup Instructions

### 1. Environment Variables

Add the following environment variable to your `.env.local` file:

```env
# Mistral AI API Key for document OCR
MISTRAL_API_KEY=your_mistral_api_key_here
```

To get a Mistral API key:
1. Visit [Mistral AI Console](https://console.mistral.ai/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key to your environment file

### 2. Database Schema

Run the database migration to create the required tables:

```bash
# Apply the document analysis schema
psql -d your_database -f scripts/03_document_analysis_schema.sql
```

This creates:
- `document_analysis` table for storing extracted data
- Analysis status tracking on `supplier_attachments`
- Proper indexes and constraints

### 3. Dependencies

The implementation uses existing dependencies in your project:
- Next.js API routes
- Supabase for database operations
- Existing UI components (shadcn/ui)

No additional npm packages are required.

## Usage

### Starting Document Analysis

1. Navigate to a supplier's detail page
2. Go to the "Documents" tab
3. For any downloaded document, click the brain icon (🧠) to start analysis
4. Select the document type or let the system auto-detect it
5. Click "Start Analysis" to begin the Mistral OCR process

### Document Types Supported

- **CCIAA**: Camera di Commercio certificates
- **DURC**: Documento Unico di Regolarità Contributiva
- **ISO**: ISO certifications (9001, 14001, etc.)
- **SOA**: Attestazione SOA for construction companies
- **VISURA**: Visura Camerale company records

### Review and Validation

After analysis completes:
1. Review the extracted fields in the dialog
2. Edit any incorrect values
3. Add validation notes if needed
4. Choose validation status:
   - **Approve**: Data is correct and complete
   - **Reject**: Data is incorrect or unusable
   - **Needs Review**: Requires additional verification

## API Endpoints

### POST /api/documents/analyze
Starts document analysis for a specific attachment.

**Request:**
```json
{
  "attachmentId": "uuid",
  "docType": "CCIAA|DURC|ISO|SOA|VISURA",
  "pages": [0, 1]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "analysis-uuid",
    "extracted_fields": {...},
    "analysis_status": "completed"
  }
}
```

### POST /api/documents/validate
Validates and updates extracted document data.

**Request:**
```json
{
  "analysisId": "uuid",
  "validatedFields": {...},
  "validationStatus": "approved|rejected|needs_review",
  "validationNotes": "Optional notes"
}
```

### GET /api/documents/analyze?attachmentId=uuid
Retrieves analysis results for a specific document.

### GET /api/documents/validate?supplierId=uuid
Gets validation statistics for a supplier's documents.

## Database Schema

### document_analysis Table

```sql
CREATE TABLE document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  attachment_id UUID NOT NULL REFERENCES supplier_attachments(id),
  doc_type TEXT NOT NULL,
  extracted_fields JSONB NOT NULL DEFAULT '{}',
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  validation_status TEXT DEFAULT 'pending',
  analysis_error TEXT,
  validation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Extracted Fields Structure

Each document type has specific fields:

**CCIAA:**
- `denominazione_ragione_sociale`
- `codice_fiscale`
- `sede_legale`
- `rea`
- `data_iscrizione`

**DURC:**
- `denominazione_ragione_sociale`
- `codice_fiscale`
- `sede_legale`
- `scadenza_validita`
- `risultato`

**ISO:**
- `numero_certificazione`
- `denominazione_ragione_sociale`
- `codice_fiscale`
- `standard`
- `ente_certificatore`
- `data_emissione`
- `data_scadenza`

**SOA:**
- `denominazione_ragione_sociale`
- `codice_fiscale`
- `categorie`
- `ente_attestazione`
- `data_emissione`
- `data_scadenza_validita_triennale`
- `data_scadenza_validita_quinquennale`

**VISURA:**
- `denominazione_ragione_sociale`
- `codice_fiscale`
- `partita_iva`
- `sede_legale`
- `attivita_esercitata`
- `stato_attivita`
- `capitale_sociale_sottoscritto`
- `data_estratto`

## Data Validation and Normalization

The system automatically normalizes extracted data:

- **Codice Fiscale/P.IVA**: Removes spaces and formatting, validates length
- **Dates**: Converts to dd/mm/YYYY format
- **Addresses**: Cleans up spacing and punctuation
- **Company Names**: Trims whitespace

## Error Handling

The system handles various error scenarios:
- Invalid or corrupted documents
- Mistral API failures
- Network timeouts
- Missing or invalid document types

Errors are logged with detailed messages and displayed to users appropriately.

## Performance Considerations

- Analysis is limited to first 2 pages by default for speed
- Documents are processed asynchronously
- Results are cached in the database
- No re-analysis of already processed documents

## Security

- API key is stored securely in environment variables
- Document data is processed server-side only
- Extracted data is validated before storage
- Access is controlled through existing authentication

## Troubleshooting

### Common Issues

1. **"MISTRAL_API_KEY not set"**
   - Add the API key to your `.env.local` file
   - Restart your development server

2. **"Document analysis failed"**
   - Check document quality (clear text, good resolution)
   - Verify document type selection
   - Check Mistral API status

3. **"Database error"**
   - Ensure migration scripts have been run
   - Check database connection
   - Verify table permissions

### Debug Mode

Enable debug logging by setting:
```env
DEBUG_DOCUMENT_ANALYSIS=true
```

This will log detailed information about the analysis process.

## Future Enhancements

Potential improvements include:
- Batch processing of multiple documents
- Custom field extraction rules
- Integration with document management systems
- Advanced validation workflows
- Machine learning model fine-tuning
- Real-time analysis progress tracking

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console logs for detailed error messages
3. Verify your Mistral API key and quota
4. Ensure all database migrations are applied
