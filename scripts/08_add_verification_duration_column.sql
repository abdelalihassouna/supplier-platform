-- Add missing verification_duration_ms column to document_verification table
-- This column tracks the time taken for AI verification process

DO $$ 
BEGIN
    -- Add verification_duration_ms column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verification' 
                   AND column_name = 'verification_duration_ms') THEN
        ALTER TABLE document_verification 
        ADD COLUMN verification_duration_ms BIGINT;
    END IF;
    
    -- Add overall_match column if it doesn't exist (for analytics)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verification' 
                   AND column_name = 'overall_match') THEN
        ALTER TABLE document_verification 
        ADD COLUMN overall_match BOOLEAN;
    END IF;
    
    -- Add verification_error column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_verification' 
                   AND column_name = 'verification_error') THEN
        ALTER TABLE document_verification 
        ADD COLUMN verification_error TEXT;
    END IF;
END $$;

-- Add index for performance on verification duration queries
CREATE INDEX IF NOT EXISTS idx_document_verification_duration 
ON document_verification(verification_duration_ms) 
WHERE verification_duration_ms IS NOT NULL;

-- Add index for overall match queries
CREATE INDEX IF NOT EXISTS idx_document_verification_overall_match 
ON document_verification(overall_match) 
WHERE overall_match IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN document_verification.verification_duration_ms IS 'Time taken for AI verification process in milliseconds';
COMMENT ON COLUMN document_verification.overall_match IS 'Boolean indicating if the document passed overall verification';
COMMENT ON COLUMN document_verification.verification_error IS 'Error message if verification failed';
