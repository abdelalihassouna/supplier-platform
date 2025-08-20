-- Document Analysis Schema
-- Table to store extracted document data from Mistral OCR

CREATE TABLE IF NOT EXISTS document_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL REFERENCES supplier_attachments(id) ON DELETE CASCADE,
  
  -- Document classification
  doc_type TEXT NOT NULL, -- 'CCIAA', 'DURC', 'ISO', 'SOA', 'VISURA'
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Extracted structured data
  extracted_fields JSONB NOT NULL DEFAULT '{}',
  
  -- Analysis metadata
  analysis_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  analysis_error TEXT,
  mistral_model TEXT DEFAULT 'mistral-ocr-latest',
  pages_analyzed INTEGER[],
  
  -- Validation and review
  validation_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_review'
  validated_by UUID REFERENCES users(id),
  validation_notes TEXT,
  validated_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(attachment_id), -- One analysis per attachment
  CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  CHECK (validation_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  CHECK (doc_type IN ('CCIAA', 'DURC', 'ISO', 'SOA', 'VISURA'))
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_analysis_supplier_id ON document_analysis(supplier_id);
CREATE INDEX IF NOT EXISTS idx_document_analysis_status ON document_analysis(analysis_status);
CREATE INDEX IF NOT EXISTS idx_document_analysis_validation ON document_analysis(validation_status);
CREATE INDEX IF NOT EXISTS idx_document_analysis_doc_type ON document_analysis(doc_type);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_document_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_analysis_updated_at
  BEFORE UPDATE ON document_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_document_analysis_updated_at();

-- Add analysis tracking to supplier_attachments if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'supplier_attachments' 
                 AND column_name = 'analysis_status') THEN
    ALTER TABLE supplier_attachments 
    ADD COLUMN analysis_status TEXT DEFAULT 'not_analyzed',
    ADD COLUMN analysis_requested_at TIMESTAMPTZ,
    ADD CONSTRAINT chk_analysis_status 
    CHECK (analysis_status IN ('not_analyzed', 'pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;
