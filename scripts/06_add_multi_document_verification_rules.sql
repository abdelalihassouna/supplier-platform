-- Add verification rules for SOA, ISO, and CCIAA document types
-- This script extends the verification system to handle multiple document types

-- Insert SOA verification rules
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, expected_values, created_at, updated_at) VALUES
-- Core identity fields that must match supplier database
('SOA', 'denominazione_ragione_sociale', 'fuzzy_match', 80, true, NULL, NOW(), NOW()),
('SOA', 'codice_fiscale', 'exact_match', 100, true, NULL, NOW(), NOW()),
('SOA', 'categorie', 'exact_match', 100, true, NULL, NOW(), NOW()),
('SOA', 'ente_attestazione', 'exact_match', 100, true, NULL, NOW(), NOW()),
('SOA', 'data_emissione', 'date_validation', 100, true, NULL, NOW(), NOW()),
('SOA', 'data_scadenza_validita_triennale', 'date_validation', 100, true, NULL, NOW(), NOW()),
('SOA', 'data_scadenza_validita_quinquennale', 'date_validation', 100, false, NULL, NOW()),

-- Insert ISO verification rules
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, expected_values, created_at) VALUES
-- Core identity fields that must match supplier database
('ISO', 'numero_certificazione', 'exact_match', 100, true, NULL, NOW()),
('ISO', 'denominazione_ragione_sociale', 'fuzzy_match', 80, true, NULL, NOW()),
('ISO', 'standard', 'exact_match', 100, true, NULL, NOW()),
('ISO', 'ente_certificatore', 'exact_match', 100, true, NULL, NOW()),
-- Document-specific validation fields
('ISO', 'data_emissione', 'date_validation', 100, true, NULL, NOW()),
('ISO', 'data_scadenza', 'date_validation', 100, true, NULL, NOW());

-- Insert CCIAA verification rules
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, expected_values, created_at) VALUES
-- Core identity fields that must match supplier database
('CCIAA', 'denominazione_ragione_sociale', 'fuzzy_match', 80, true, NULL, NOW()),
('CCIAA', 'codice_fiscale', 'exact_match', 100, true, NULL, NOW()),
('CCIAA', 'sede_legale', 'fuzzy_match', 70, true, NULL, NOW()),
('CCIAA', 'rea', 'exact_match', 100, true, NULL, NOW()),
('CCIAA', 'data_iscrizione', 'date_validation', 100, true, NULL, NOW());

-- Update the document_type enum if it exists, or ensure varchar supports all types
DO $$ 
BEGIN
    -- Check if document_type column exists and update its constraint if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'document_verification' 
               AND column_name = 'document_type') THEN
        
        -- Drop existing check constraint if it exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'document_verification' 
                   AND constraint_type = 'CHECK' 
                   AND constraint_name LIKE '%document_type%') THEN
            ALTER TABLE document_verification DROP CONSTRAINT IF EXISTS document_verification_document_type_check;
        END IF;
        
        -- Add new check constraint with all document types
        ALTER TABLE document_verification 
        ADD CONSTRAINT document_verification_document_type_check 
        CHECK (document_type IN ('DURC', 'VISURA', 'SOA', 'ISO', 'CCIAA'));
    END IF;
END $$;

-- Create additional indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_verification_rules_doc_type_field 
ON verification_rules(doc_type, field_name);

CREATE INDEX IF NOT EXISTS idx_document_verification_doc_type_status 
ON document_verification(document_type, verification_status);

-- Add comments for documentation
COMMENT ON COLUMN verification_rules.doc_type IS 'Document type: DURC, VISURA, SOA, ISO, CCIAA';

-- Insert sample data for testing (optional - remove in production)
-- This helps verify the schema works correctly
DO $$
BEGIN
    -- Only insert if no test data exists
    IF NOT EXISTS (SELECT 1 FROM suppliers WHERE company_name = 'Test Company SOA') THEN
        INSERT INTO suppliers (company_name, fiscal_code, vat_number, address, city, province, country, created_at, updated_at) VALUES
        ('Test Company SOA', '12345678901234567', '12345678901', 'Via Test 123', 'Milano', 'MI', 'Italy', NOW(), NOW()),
        ('Test Company ISO', '23456789012345678', '23456789012', 'Via Certificazione 456', 'Roma', 'RM', 'Italy', NOW(), NOW()),
        ('Test Company CCIAA', '34567890123456789', '34567890123', 'Via Camera Commercio 789', 'Torino', 'TO', 'Italy', NOW(), NOW());
    END IF;
END $$;

-- Verification rules summary
SELECT 
    doc_type,
    COUNT(*) as rule_count,
    STRING_AGG(field_name, ', ' ORDER BY field_name) as fields
FROM verification_rules 
GROUP BY doc_type 
ORDER BY doc_type;
