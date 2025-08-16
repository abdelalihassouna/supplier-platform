-- Tabelle aggiuntive per PostgreSQL locale
-- Conversione da Supabase (rimuove auth.users e RLS)

-- Tabella notifiche
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella audit logs per tracciamento modifiche
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella sessioni utente per gestione autenticazione
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indici per performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- Trigger per aggiornamento automatico updated_at
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger per pulizia automatica sessioni scadute
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Esegui pulizia sessioni ogni inserimento
CREATE TRIGGER cleanup_sessions_trigger 
    AFTER INSERT ON user_sessions 
    FOR EACH STATEMENT EXECUTE FUNCTION cleanup_expired_sessions();

-- Funzione per audit automatico
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), current_setting('app.current_user_id', true)::UUID);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('app.current_user_id', true)::UUID);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), current_setting('app.current_user_id', true)::UUID);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Applica audit trigger alle tabelle principali
CREATE TRIGGER suppliers_audit_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON suppliers 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER supplier_certifications_audit_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON supplier_certifications 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER supplier_verifications_audit_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON supplier_verifications 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER workflows_audit_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON workflows 
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Funzioni di utilità per notifiche
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (p_user_id, p_title, p_message, p_type)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Funzione per marcare notifiche come lette
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID, p_notification_ids UUID[] DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Marca tutte le notifiche dell'utente come lette
        UPDATE notifications 
        SET read = TRUE, updated_at = NOW()
        WHERE user_id = p_user_id AND read = FALSE;
    ELSE
        -- Marca solo le notifiche specificate
        UPDATE notifications 
        SET read = TRUE, updated_at = NOW()
        WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND read = FALSE;
    END IF;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Vista per statistiche notifiche
CREATE VIEW user_notification_stats AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = FALSE) as unread_count,
    COUNT(*) FILTER (WHERE read = TRUE) as read_count,
    COUNT(*) FILTER (WHERE type = 'error') as error_count,
    COUNT(*) FILTER (WHERE type = 'warning') as warning_count,
    MAX(created_at) as last_notification_date
FROM notifications
GROUP BY user_id;

-- Vista per audit trail con dettagli utente
CREATE VIEW audit_trail AS
SELECT 
    al.id,
    al.table_name,
    al.record_id,
    al.action,
    al.old_values,
    al.new_values,
    al.created_at,
    up.full_name as user_name,
    up.email as user_email,
    al.ip_address,
    al.user_agent
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY al.created_at DESC;

-- Commenti per documentazione
COMMENT ON TABLE notifications IS 'Sistema notifiche per utenti';
COMMENT ON TABLE audit_logs IS 'Log completo di tutte le modifiche ai dati';
COMMENT ON TABLE user_sessions IS 'Gestione sessioni utente e autenticazione';
COMMENT ON FUNCTION create_notification IS 'Crea una nuova notifica per un utente';
COMMENT ON FUNCTION mark_notifications_read IS 'Marca notifiche come lette';
COMMENT ON VIEW user_notification_stats IS 'Statistiche notifiche per utente';
COMMENT ON VIEW audit_trail IS 'Vista completa audit trail con dettagli utente';