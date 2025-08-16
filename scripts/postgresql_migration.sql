-- PostgreSQL Migration Script
-- Migrating from Supabase to Local PostgreSQL Database

-- Create database (run this separately as superuser)
-- CREATE DATABASE supplier_certification_db;
-- CREATE USER supplier_app WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE supplier_certification_db TO supplier_app;

-- Connect to the database and run the following:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    department TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    verification_status TEXT DEFAULT 'pending',
    compliance_score INTEGER DEFAULT 0,
    last_sync_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    jaggaer_attachment_id TEXT,
    secure_token TEXT,
    uploaded_by UUID REFERENCES user_profiles(id),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_certifications table
CREATE TABLE supplier_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    certification_name TEXT NOT NULL,
    certification_type TEXT NOT NULL,
    certificate_number TEXT,
    issuing_authority TEXT,
    issue_date DATE,
    expiry_date DATE,
    status TEXT DEFAULT 'active',
    attachment_id UUID REFERENCES attachments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_verifications table
CREATE TABLE supplier_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    verified_by UUID REFERENCES user_profiles(id),
    verification_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    automated_check BOOLEAN DEFAULT FALSE,
    confidence_score NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflows table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    assigned_to UUID REFERENCES user_profiles(id),
    created_by UUID REFERENCES user_profiles(id),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    workflow_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_sync_logs table
CREATE TABLE supplier_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    started_by UUID REFERENCES user_profiles(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    sync_details JSONB
);

-- Create system_settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES user_profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_suppliers_bravo_id ON suppliers(bravo_id);
CREATE INDEX idx_suppliers_company_name ON suppliers(company_name);
CREATE INDEX idx_suppliers_verification_status ON suppliers(verification_status);
CREATE INDEX idx_attachments_supplier_id ON attachments(supplier_id);
CREATE INDEX idx_attachments_document_type ON attachments(document_type);
CREATE INDEX idx_certifications_supplier_id ON supplier_certifications(supplier_id);
CREATE INDEX idx_certifications_expiry_date ON supplier_certifications(expiry_date);
CREATE INDEX idx_verifications_supplier_id ON supplier_verifications(supplier_id);
CREATE INDEX idx_workflows_supplier_id ON workflows(supplier_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_sync_logs_started_at ON supplier_sync_logs(started_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON supplier_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verifications_updated_at BEFORE UPDATE ON supplier_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('app_name', '"Supplier Certification Platform"', 'Application name'),
('default_language', '"it"', 'Default language for the application'),
('max_file_size', '52428800', 'Maximum file upload size in bytes (50MB)'),
('allowed_file_types', '["pdf", "jpg", "jpeg", "png", "doc", "docx"]', 'Allowed file types for uploads'),
('sync_interval', '3600', 'Sync interval in seconds (1 hour)'),
('notification_settings', '{"email_enabled": true, "push_enabled": false}', 'Notification preferences');
