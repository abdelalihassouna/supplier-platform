-- Adds telemetry/cost columns to document_analysis
-- Safe to re-run (IF NOT EXISTS guards)

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analysis' AND column_name = 'analysis_duration_ms'
  ) THEN
    ALTER TABLE document_analysis 
      ADD COLUMN analysis_duration_ms BIGINT,
      ADD COLUMN analysis_cost_eur NUMERIC(10,4),
      ADD COLUMN pages_count INTEGER,
      ADD COLUMN annotation_used BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Optional helpful indexes
CREATE INDEX IF NOT EXISTS idx_document_analysis_updated_at ON document_analysis (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_analysis_status ON document_analysis (analysis_status);

COMMIT;
