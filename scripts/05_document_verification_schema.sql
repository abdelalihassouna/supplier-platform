-- Document Verification Schema
-- This script adds tables for AI-powered document verification

-- Table to store verification results
CREATE TABLE IF NOT EXISTS document_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES document_analysis(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    doc_type TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
    verification_result TEXT NOT NULL DEFAULT 'unknown', -- match, mismatch, partial_match, no_data
    confidence_score DECIMAL(5,2) DEFAULT 0.00, -- 0.00 to 100.00
    
    -- Verification details
    field_comparisons JSONB NOT NULL DEFAULT '{}', -- detailed field-by-field comparison
    discrepancies JSONB NOT NULL DEFAULT '[]', -- array of found discrepancies
    ai_analysis TEXT, -- AI agent's detailed analysis
    verification_notes TEXT,
    
    -- Metadata
    verified_by TEXT DEFAULT 'ai_agent', -- ai_agent, manual, hybrid
    verification_model TEXT, -- which AI model was used
    processing_time_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store verification rules and thresholds
CREATE TABLE IF NOT EXISTS verification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- exact_match, fuzzy_match, date_validation, status_check
    threshold DECIMAL(5,2) DEFAULT 80.00, -- for fuzzy matching
    is_required BOOLEAN DEFAULT true,
    validation_regex TEXT,
    expected_values TEXT[], -- for status checks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doc_type, field_name, rule_type)
);

-- Insert default DURC verification rules
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, expected_values) VALUES
('DURC', 'denominazione_ragione_sociale', 'fuzzy_match', 85.00, true, NULL),
('DURC', 'codice_fiscale', 'exact_match', 100.00, true, NULL),
('DURC', 'sede_legale', 'fuzzy_match', 80.00, true, NULL),
('DURC', 'risultato', 'status_check', 100.00, true, ARRAY['RISULTA REGOLARE', 'REGOLARE']),
('DURC', 'scadenza_validita', 'date_validation', 100.00, true, NULL)
ON CONFLICT (doc_type, field_name, rule_type) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_verification_analysis_id ON document_verification(analysis_id);
CREATE INDEX IF NOT EXISTS idx_document_verification_supplier_id ON document_verification(supplier_id);
CREATE INDEX IF NOT EXISTS idx_document_verification_status ON document_verification(verification_status);
CREATE INDEX IF NOT EXISTS idx_document_verification_result ON document_verification(verification_result);
CREATE INDEX IF NOT EXISTS idx_verification_rules_doc_type ON verification_rules(doc_type);

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_document_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_verification_updated_at
    BEFORE UPDATE ON document_verification
    FOR EACH ROW
    EXECUTE FUNCTION update_document_verification_updated_at();

-- Add verification status to document_analysis table if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_analysis' AND column_name = 'needs_verification') THEN
        ALTER TABLE document_analysis ADD COLUMN needs_verification BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_analysis' AND column_name = 'verification_priority') THEN
        ALTER TABLE document_analysis ADD COLUMN verification_priority INTEGER DEFAULT 1; -- 1=low, 2=medium, 3=high
    END IF;
END $$;

-- Update existing DURC documents to need verification
UPDATE document_analysis 
SET needs_verification = true, verification_priority = 3 
WHERE doc_type = 'DURC' AND analysis_status = 'completed';
