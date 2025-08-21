-- Enhanced Multi-Document Verification Rules
-- Updated field mappings based on OCR vs DB field specifications

-- Clear existing rules and add enhanced ones
DELETE FROM verification_rules;

-- CCIAA Document Rules
-- OCR Fields: [Denominazione/Ragione Sociale, Codice fiscale/P:IVA, Sede Legale, Numero REA, Data iscrizione]
-- DB Fields: [Denominazione/Ragione Sociale, Codice fiscale/P:IVA, Sede Legale]
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, validation_regex, expected_values, created_at) VALUES
('CCIAA', 'denominazione_ragione_sociale', 'fuzzy_match', 85.00, true, NULL, NULL, NOW()),
('CCIAA', 'codice_fiscale', 'exact_match', 100.00, true, '^[0-9]{11}$|^[A-Z0-9]{16}$', NULL, NOW()),
('CCIAA', 'sede_legale', 'fuzzy_match', 80.00, true, NULL, NULL, NOW()),
('CCIAA', 'rea', 'document_specific', 100.00, true, '^[A-Z]{2}-[0-9]{7}$', NULL, NOW()),
('CCIAA', 'data_iscrizione', 'date_validation', 100.00, true, NULL, NULL, NOW());

-- VISURA Document Rules  
-- OCR Fields: [Denominazione/Ragione Sociale, Codice fiscale/P:IVA, Sede Legale, Attività Esercitata, Stato Attività, Capitale Sociale Sottoscritto, Data Estratto]
-- DB Fields: [Denominazione/Ragione Sociale, Codice fiscale/P:IVA, Sede Legale, Capitale Sociale Sottoscritto]
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, validation_regex, expected_values, created_at) VALUES
('VISURA', 'denominazione_ragione_sociale', 'fuzzy_match', 85.00, true, NULL, NULL, NOW()),
('VISURA', 'codice_fiscale', 'exact_match', 100.00, true, '^[0-9]{11}$|^[A-Z0-9]{16}$', NULL, NOW()),
('VISURA', 'partita_iva', 'exact_match', 100.00, true, '^[0-9]{11}$', NULL, NOW()),
('VISURA', 'sede_legale', 'fuzzy_match', 80.00, true, NULL, NULL, NOW()),
('VISURA', 'attivita_esercitata', 'document_specific', 100.00, true, NULL, NULL, NOW()),
('VISURA', 'stato_attivita', 'status_check', 100.00, true, NULL, ARRAY['ATTIVA', 'ATTIVO', 'ACTIVE'], NOW()),
('VISURA', 'capitale_sociale_sottoscritto', 'fuzzy_match', 90.00, false, NULL, NULL, NOW()),
('VISURA', 'data_estratto', 'date_validation', 100.00, true, NULL, NULL, NOW());

-- DURC Document Rules
-- OCR Fields: [Denominazione/Ragione Sociale, Codice fiscale/P:IVA, Sede Legale, Scadenza Validità, Risultato]
-- DB Fields: [Denominazione/Ragione Sociale, Codice fiscale/P:IVA, Sede Legale]
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, validation_regex, expected_values, created_at) VALUES
('DURC', 'denominazione_ragione_sociale', 'fuzzy_match', 85.00, true, NULL, NULL, NOW()),
('DURC', 'codice_fiscale', 'exact_match', 100.00, true, '^[0-9]{11}$|^[A-Z0-9]{16}$', NULL, NOW()),
('DURC', 'sede_legale', 'fuzzy_match', 80.00, true, NULL, NULL, NOW()),
('DURC', 'scadenza_validita', 'date_validation', 100.00, true, NULL, NULL, NOW()),
('DURC', 'risultato', 'status_check', 100.00, true, NULL, ARRAY['RISULTA REGOLARE', 'REGOLARE'], NOW());

-- ISO Document Rules
-- OCR Fields: [Denominazione/Ragione Sociale, Numero Certificazione, Standard ISO, Ente Certificatore, Data Emissione, Data Scadenza]
-- DB Fields: [Denominazione/Ragione Sociale]
-- Note: Fiscal Code is NOT present in ISO certificates
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, validation_regex, expected_values, created_at) VALUES
('ISO', 'denominazione_ragione_sociale', 'fuzzy_match', 85.00, true, NULL, NULL, NOW()),
('ISO', 'numero_certificazione', 'document_specific', 100.00, true, NULL, NULL, NOW()),
('ISO', 'standard', 'fuzzy_match', 90.00, true, NULL, NULL, NOW()),
('ISO', 'ente_certificatore', 'document_specific', 100.00, true, NULL, NULL, NOW()),
('ISO', 'data_emissione', 'date_validation', 100.00, true, NULL, NULL, NOW()),
('ISO', 'data_scadenza', 'date_validation', 100.00, true, NULL, NULL, NOW());

-- SOA Document Rules
-- OCR Fields: [Denominazione/Ragione Sociale, Codice fiscale/P:IVA, Categorie SOA, Ente Attestazione, Data Emissione, Scadenza Triennale, Scadenza Quinquennale]
-- DB Fields: [Denominazione/Ragione Sociale, Codice fiscale/P:IVA, Categorie SOA]
INSERT INTO verification_rules (doc_type, field_name, rule_type, threshold, is_required, validation_regex, expected_values, created_at) VALUES
('SOA', 'denominazione_ragione_sociale', 'fuzzy_match', 85.00, true, NULL, NULL, NOW()),
('SOA', 'codice_fiscale', 'exact_match', 100.00, true, '^[0-9]{11}$|^[A-Z0-9]{16}$', NULL, NOW()),
('SOA', 'categorie', 'fuzzy_match', 90.00, true, NULL, NULL, NOW()),
('SOA', 'ente_attestazione', 'document_specific', 100.00, true, NULL, NULL, NOW()),
('SOA', 'data_emissione', 'date_validation', 100.00, true, NULL, NULL, NOW()),
('SOA', 'data_scadenza_validita_triennale', 'date_validation', 100.00, true, NULL, NULL, NOW()),
('SOA', 'data_scadenza_validita_quinquennale', 'date_validation', 100.00, true, NULL, NULL, NOW());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_verification_rules_doc_type_field ON verification_rules(doc_type, field_name);
CREATE INDEX IF NOT EXISTS idx_document_verification_doc_type ON document_verification(doc_type);

-- Update document_verification table to ensure document_type column exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='document_verification' AND column_name='document_type') THEN
        ALTER TABLE document_verification ADD COLUMN document_type TEXT;
    END IF;
END $$;

-- Add constraint for valid document types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'document_verification_doc_type_check') THEN
        ALTER TABLE document_verification 
        ADD CONSTRAINT document_verification_doc_type_check 
        CHECK (doc_type IN ('DURC', 'VISURA', 'SOA', 'ISO', 'CCIAA'));
    END IF;
END $$;
