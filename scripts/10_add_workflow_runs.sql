-- Migration: Add workflow runs and step results tables
-- Purpose: Support Q1 supplier qualification workflow execution tracking
-- Date: 2025-08-21

-- Create workflow_runs table
CREATE TABLE IF NOT EXISTS workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL DEFAULT 'Q1_supplier_qualification',
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'canceled')),
    overall TEXT CHECK (overall IN ('qualified', 'conditionally_qualified', 'not_qualified')),
    notes JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create workflow_step_results table
CREATE TABLE IF NOT EXISTS workflow_step_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    step_key TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'skip')),
    issues TEXT[] DEFAULT ARRAY[]::TEXT[],
    details JSONB DEFAULT '{}'::jsonb,
    score NUMERIC(5,2),
    order_index INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_runs_supplier_id ON workflow_runs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_type ON workflow_runs(workflow_type);

CREATE INDEX IF NOT EXISTS idx_workflow_step_results_run_id ON workflow_step_results(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_results_step_key ON workflow_step_results(step_key);
CREATE INDEX IF NOT EXISTS idx_workflow_step_results_status ON workflow_step_results(status);
CREATE INDEX IF NOT EXISTS idx_workflow_step_results_order ON workflow_step_results(run_id, order_index);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_workflow_runs_updated_at ON workflow_runs;
CREATE TRIGGER update_workflow_runs_updated_at
    BEFORE UPDATE ON workflow_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_step_results_updated_at ON workflow_step_results;
CREATE TRIGGER update_workflow_step_results_updated_at
    BEFORE UPDATE ON workflow_step_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample workflow step definitions for Q1 qualification
INSERT INTO workflow_step_results (run_id, step_key, name, status, order_index, started_at, ended_at)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid as run_id,
    step_key,
    name,
    'skip' as status,
    order_index,
    NOW() as started_at,
    NOW() as ended_at
FROM (VALUES
    ('registration', 'Registration Check', 1),
    ('preliminary', 'Preliminary Data Verification', 2),
    ('durc', 'DURC Verification', 3),
    ('whitelist_insurance', 'White List & Insurance', 4),
    ('visura', 'Qualification Questionnaire (VISURA)', 5),
    ('certifications', 'Certifications Verification', 6),
    ('soa', 'SOA Verification', 7),
    ('scorecard', 'Q1 Scorecard Generation', 8),
    ('finalize', 'Final Outcome & Follow-up', 9)
) AS steps(step_key, name, order_index)
WHERE FALSE; -- This is just for documentation, won't actually insert

-- Add comments for documentation
COMMENT ON TABLE workflow_runs IS 'Tracks execution of supplier qualification workflows';
COMMENT ON TABLE workflow_step_results IS 'Stores results of individual workflow steps';

COMMENT ON COLUMN workflow_runs.workflow_type IS 'Type of workflow: Q1_supplier_qualification, etc.';
COMMENT ON COLUMN workflow_runs.overall IS 'Final qualification result, set when workflow completes';
COMMENT ON COLUMN workflow_runs.notes IS 'JSON array of summary notes and remarks';

COMMENT ON COLUMN workflow_step_results.step_key IS 'Stable identifier for step type (registration, durc, etc.)';
COMMENT ON COLUMN workflow_step_results.issues IS 'Array of human-readable issue descriptions';
COMMENT ON COLUMN workflow_step_results.details IS 'Raw AI verification results and detailed data';
COMMENT ON COLUMN workflow_step_results.score IS 'Optional numeric score for this step (0-100)';
COMMENT ON COLUMN workflow_step_results.order_index IS 'Execution order within the workflow run';
