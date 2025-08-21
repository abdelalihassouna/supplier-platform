# AI-Powered DURC Verification Setup Guide

## Quick Setup Steps

### 1. Install Dependencies
```bash
npm install openai@^4.67.3
```

### 2. Environment Configuration
Add to your `.env.local` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Database Tables
The verification tables will be created automatically on first API call. If you prefer manual setup:
```sql
-- Run this in your PostgreSQL database
\i scripts/05_document_verification_schema.sql
```

## API Endpoints

### Start Verification
```http
POST /api/documents/verify
Content-Type: application/json

{
  "analysisId": "uuid-of-completed-analysis"
}
```

### Get Verification Results
```http
GET /api/documents/verify?analysisId=uuid-of-analysis
```

## Troubleshooting

### Common Issues

1. **404 Error on GET**: Verification not started yet
   - Solution: Call POST endpoint first

2. **400 Error on POST**: Missing analysisId or analysis not completed
   - Solution: Ensure document analysis is completed first

3. **OpenAI API Errors**: Missing API key or network issues
   - Solution: Check OPENAI_API_KEY in environment
   - Fallback: System uses rule-based analysis automatically

### Verification Workflow

1. **Document Upload** → Attachment created
2. **OCR Analysis** → Mistral extracts text fields  
3. **AI Verification** → Compares with supplier data using GPT
4. **Results Display** → Shows verification status and analysis

## Features

- **Intelligent Analysis**: GPT-4o-mini provides expert-level DURC verification
- **Fallback System**: Rule-based analysis if OpenAI unavailable  
- **Automatic Setup**: Database tables created on first use
- **Comprehensive Reports**: Detailed field-by-field comparison
- **Risk Assessment**: Compliance status and recommendations

## Testing

Use the test script:
```bash
node test-verification.js
```

Or test via frontend:
1. Go to Supplier Details
2. Click on a DURC document
3. Run "Analyze Document" 
4. Click "AI Verification" tab
5. Click "Start Verification"
