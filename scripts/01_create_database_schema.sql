-- PostgreSQL Schema per Supplier Certification Management
-- Conversione da Supabase per installazione locale

-- Abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabella utenti (sostituisce auth.users di Supabase)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella profili utenti
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    department TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabella fornitori principale
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bravo_id TEXT UNIQUE,
    company_name TEXT NOT NULL,
    fiscal_code TEXT,
    vat_number TEXT,
    legal_form TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Italy',
    phone TEXT,
    email TEXT,
    website TEXT,
    pec_email TEXT,
    legal_representative TEXT,
    verification_status TEXT DEFAULT 'not_started' 
        CHECK (verification_status IN ('not_started', 'in_progress', 'completed', 'error', 'pending', 'qualified_q1')),
    compliance_score INTEGER DEFAULT 0,
    last_sync_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella allegati
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    document_type TEXT,
    secure_token TEXT,
    jaggaer_attachment_id TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT attachments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Tabella certificazioni fornitori
CREATE TABLE supplier_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID,
    certification_type TEXT NOT NULL,
    certification_name TEXT NOT NULL,
    issuing_authority TEXT,
    certificate_number TEXT,
    issue_date DATE,
    expiry_date DATE,
    status TEXT DEFAULT 'pending' 
        CHECK (status IN ('valid', 'expired', 'pending', 'invalid')),
    attachment_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT supplier_certifications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    CONSTRAINT supplier_certifications_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES attachments(id)
);

-- Tabella verifiche fornitori
CREATE TABLE supplier_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID,
    verification_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' 
        CHECK (status IN ('passed', 'failed', 'pending', 'in_progress')),
    verified_by UUID,
    verification_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    automated_check BOOLEAN DEFAULT FALSE,
    confidence_score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT supplier_verifications_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    CONSTRAINT supplier_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Tabella workflow
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID,
    workflow_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    assigned_to UUID,
    created_by UUID,
    priority TEXT DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    workflow_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT workflows_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    CONSTRAINT workflows_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id),
    CONSTRAINT workflows_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabella log sincronizzazioni
CREATE TABLE supplier_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL,
    status TEXT DEFAULT 'running' 
        CHECK (status IN ('running', 'completed', 'failed')),
    started_by UUID,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_details JSONB,
    CONSTRAINT supplier_sync_logs_started_by_fkey FOREIGN KEY (started_by) REFERENCES users(id)
);

-- Tabella impostazioni sistema
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Indici per performance
CREATE INDEX idx_suppliers_bravo_id ON suppliers(bravo_id);
CREATE INDEX idx_suppliers_vat_number ON suppliers(vat_number);
CREATE INDEX idx_suppliers_verification_status ON suppliers(verification_status);
CREATE INDEX idx_attachments_supplier_id ON attachments(supplier_id);
CREATE INDEX idx_supplier_certifications_supplier_id ON supplier_certifications(supplier_id);
CREATE INDEX idx_supplier_certifications_expiry_date ON supplier_certifications(expiry_date);
CREATE INDEX idx_supplier_verifications_supplier_id ON supplier_verifications(supplier_id);
CREATE INDEX idx_workflows_supplier_id ON workflows(supplier_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_assigned_to ON workflows(assigned_to);

-- Trigger per aggiornamento automatico updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applica trigger alle tabelle con updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_certifications_updated_at BEFORE UPDATE ON supplier_certifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_verifications_updated_at BEFORE UPDATE ON supplier_verifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserimento dati di esempio per testing
INSERT INTO users (id, email, password_hash, email_confirmed) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'admin@pizzarotti.com', '$2b$10$example_hash', TRUE),
    ('550e8400-e29b-41d4-a716-446655440001', 'manager@pizzarotti.com', '$2b$10$example_hash', TRUE);

INSERT INTO user_profiles (id, email, full_name, role, department) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'admin@pizzarotti.com', 'Admin Pizzarotti', 'admin', 'IT'),
    ('550e8400-e29b-41d4-a716-446655440001', 'manager@pizzarotti.com', 'Manager Procurement', 'manager', 'Procurement');

-- Impostazioni sistema di default
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
    ('jaggaer_api_url', '"https://pizzarotti.bravosolution.com/api"', 'URL API Jaggaer'),
    ('document_retention_days', '2555', 'Giorni di conservazione documenti (7 anni)'),
    ('auto_verification_enabled', 'true', 'Abilitazione verifiche automatiche'),
    ('notification_email', '"procurement@pizzarotti.com"', 'Email per notifiche sistema');

-- Commenti per documentazione
COMMENT ON TABLE suppliers IS 'Tabella principale fornitori con dati anagrafici e stato verifica';
COMMENT ON TABLE attachments IS 'Allegati e documenti caricati dai fornitori';
COMMENT ON TABLE supplier_certifications IS 'Certificazioni ISO, SOA e altre del fornitore';
COMMENT ON TABLE supplier_verifications IS 'Storico verifiche manuali e automatiche';
COMMENT ON TABLE workflows IS 'Flussi di lavoro per approvazioni e verifiche';
COMMENT ON TABLE supplier_sync_logs IS 'Log delle sincronizzazioni con sistemi esterni';