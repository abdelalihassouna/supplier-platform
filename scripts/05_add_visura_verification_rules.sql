-- Add VISURA verification rules to support multi-document verification
-- This script extends the verification system to handle VISURA documents

-- Insert VISURA verification rules
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, expected_values, created_at, updated_at) VALUES
-- Core identity fields that must match supplier database
('VISURA', 'denominazione_ragione_sociale', 'fuzzy_match', 80, true, NULL, NOW(), NOW()),
('VISURA', 'codice_fiscale', 'exact_match', 100, true, NULL, NOW(), NOW()),
('VISURA', 'partita_iva', 'exact_match', 100, true, NULL, NOW(), NOW()),
('VISURA', 'sede_legale', 'fuzzy_match', 70, true, NULL, NOW(), NOW()),
('VISURA', 'attivita_esercitata', 'fuzzy_match', 70, true, NULL, NOW(), NOW()),

-- Document-specific validation fields
('VISURA', 'stato_attivita', 'status_check', 100, false, '{"ATTIVA", "ATTIVO"}', NOW(), NOW());

-- Update document_verification table to support document_type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verification' 
                   AND column_name = 'document_type') THEN
        ALTER TABLE document_verification 
        ADD COLUMN document_type VARCHAR(20) DEFAULT 'DURC';
    END IF;
END $$;

-- Create index for better performance on document type queries
CREATE INDEX IF NOT EXISTS idx_document_verification_doc_type 
ON document_verification(document_type);

-- Create index for verification rules by document type
CREATE INDEX IF NOT EXISTS idx_verification_rules_doc_type 
ON verification_rules(doc_type);

-- Add comment for documentation
COMMENT ON TABLE verification_rules IS 'Stores verification rules for different document types (DURC, VISURA, SOA, ISO)';
COMMENT ON COLUMN verification_rules.doc_type IS 'Document type: DURC, VISURA, SOA, ISO';
COMMENT ON COLUMN verification_rules.field_name IS 'Field name from OCR extraction schema';
COMMENT ON COLUMN verification_rules.rule_type IS 'Verification rule: exact_match, fuzzy_match, status_check, date_validation';
    "stato_attivita": null,
    

-- Document-specific validation fields
('VISURA', 'stato_attivita', 'status_check', 100, false, '["ATTIVA", "ATTIVO"]', NOW(), NOW());

-- Update document_verification table to support document_type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verification' 
                   AND column_name = 'document_type') THEN
        ALTER TABLE document_verification 
        ADD COLUMN document_type VARCHAR(20) DEFAULT 'DURC';
    END IF;
END $$;

-- Create index for better performance on document type queries
CREATE INDEX IF NOT EXISTS idx_document_verification_doc_type 
ON document_verification(document_type);

-- Create index for verification rules by document type
CREATE INDEX IF NOT EXISTS idx_verification_rules_doc_type 
ON verification_rules(doc_type);

-- Add comment for documentation
COMMENT ON TABLE verification_rules IS 'Stores verification rules for different document types (DURC, VISURA, SOA, ISO)';
COMMENT ON COLUMN verification_rules.doc_type IS 'Document type: DURC, VISURA, SOA, ISO';
COMMENT ON COLUMN verification_rules.field_name IS 'Field name from OCR extraction schema';
COMMENT ON COLUMN verification_rules.rule_type IS 'Verification rule: exact_match, fuzzy_match, status_check, date_validation';
