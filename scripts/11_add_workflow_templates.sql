-- Create workflow_templates table for storing workflow builder designs
-- This is separate from workflow_runs which tracks execution

CREATE TABLE IF NOT EXISTS public.workflow_templates
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    template_type text COLLATE pg_catalog."default" DEFAULT 'custom'::text,
    nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
    edges jsonb NOT NULL DEFAULT '[]'::jsonb,
    config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    version integer DEFAULT 1,
    tags text[] DEFAULT '{}'::text[],
    CONSTRAINT workflow_templates_pkey PRIMARY KEY (id),
    CONSTRAINT workflow_templates_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT workflow_templates_template_type_check CHECK (template_type = ANY (ARRAY['custom'::text, 'system'::text, 'shared'::text]))
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.workflow_templates
    OWNER to postgres;

COMMENT ON TABLE public.workflow_templates
    IS 'Templates for workflow designs created in the workflow builder';

COMMENT ON COLUMN public.workflow_templates.nodes IS 'React Flow nodes configuration (JSON array)';
COMMENT ON COLUMN public.workflow_templates.edges IS 'React Flow edges/connections configuration (JSON array)';
COMMENT ON COLUMN public.workflow_templates.config IS 'Additional workflow configuration and metadata';
COMMENT ON COLUMN public.workflow_templates.template_type IS 'Type: custom (user-created), system (built-in), shared (organization-wide)';
COMMENT ON COLUMN public.workflow_templates.is_default IS 'Whether this is the default template for new workflows';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_templates_created_by
    ON public.workflow_templates USING btree
    (created_by ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_template_type
    ON public.workflow_templates USING btree
    (template_type COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_active
    ON public.workflow_templates USING btree
    (is_active ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_tags
    ON public.workflow_templates USING gin
    (tags)
    TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_workflow_templates_updated_at
    BEFORE UPDATE 
    ON public.workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger if audit function exists
CREATE OR REPLACE TRIGGER workflow_templates_audit_trigger
    AFTER INSERT OR DELETE OR UPDATE 
    ON public.workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Update the existing workflows table to reference templates
ALTER TABLE public.workflows 
ADD COLUMN IF NOT EXISTS template_id uuid;

ALTER TABLE public.workflows 
ADD CONSTRAINT workflows_template_id_fkey 
FOREIGN KEY (template_id) REFERENCES public.workflow_templates(id) 
ON UPDATE NO ACTION ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workflows_template_id
    ON public.workflows USING btree
    (template_id ASC NULLS LAST)
    TABLESPACE pg_default;

COMMENT ON COLUMN public.workflows.template_id IS 'Reference to the workflow template used to create this workflow instance';

-- Insert some default workflow templates
INSERT INTO public.workflow_templates (name, description, template_type, nodes, edges, is_default, tags)
VALUES 
(
    'Q1 Supplier Qualification',
    'Standard Q1 qualification workflow with all verification steps',
    'system',
    '[
        {"id": "start-1", "type": "builderNode", "position": {"x": 250, "y": 50}, "data": {"id": "start-1", "label": "Start", "type": "start", "config": {"description": "Workflow starting point"}}},
        {"id": "verification-durc", "type": "builderNode", "position": {"x": 250, "y": 150}, "data": {"id": "verification-durc", "label": "DURC Verification", "type": "verification", "verificationType": "DURC", "config": {"timeout": 300, "retries": 3, "required": true, "description": "Verify DURC document compliance"}}},
        {"id": "verification-visura", "type": "builderNode", "position": {"x": 250, "y": 250}, "data": {"id": "verification-visura", "label": "VISURA Verification", "type": "verification", "verificationType": "VISURA", "config": {"timeout": 300, "retries": 3, "required": true, "description": "Verify company registration data"}}},
        {"id": "verification-soa", "type": "builderNode", "position": {"x": 250, "y": 350}, "data": {"id": "verification-soa", "label": "SOA Verification", "type": "verification", "verificationType": "SOA", "config": {"timeout": 300, "retries": 3, "required": false, "description": "Verify SOA attestation"}}},
        {"id": "verification-iso", "type": "builderNode", "position": {"x": 250, "y": 450}, "data": {"id": "verification-iso", "label": "ISO Verification", "type": "verification", "verificationType": "ISO", "config": {"timeout": 300, "retries": 3, "required": false, "description": "Verify ISO certification"}}},
        {"id": "verification-cciaa", "type": "builderNode", "position": {"x": 250, "y": 550}, "data": {"id": "verification-cciaa", "label": "CCIAA Verification", "type": "verification", "verificationType": "CCIAA", "config": {"timeout": 300, "retries": 3, "required": true, "description": "Verify Chamber of Commerce data"}}},
        {"id": "end-1", "type": "builderNode", "position": {"x": 250, "y": 650}, "data": {"id": "end-1", "label": "End", "type": "end", "config": {"description": "Workflow completion point"}}}
    ]'::jsonb,
    '[
        {"id": "e1", "source": "start-1", "target": "verification-durc"},
        {"id": "e2", "source": "verification-durc", "target": "verification-visura"},
        {"id": "e3", "source": "verification-visura", "target": "verification-soa"},
        {"id": "e4", "source": "verification-soa", "target": "verification-iso"},
        {"id": "e5", "source": "verification-iso", "target": "verification-cciaa"},
        {"id": "e6", "source": "verification-cciaa", "target": "end-1"}
    ]'::jsonb,
    true,
    ARRAY['Q1', 'supplier', 'qualification', 'verification']
),
(
    'Basic Document Verification',
    'Simple workflow for basic document verification',
    'system',
    '[
        {"id": "start-1", "type": "builderNode", "position": {"x": 250, "y": 50}, "data": {"id": "start-1", "label": "Start", "type": "start", "config": {"description": "Workflow starting point"}}},
        {"id": "verification-durc", "type": "builderNode", "position": {"x": 250, "y": 150}, "data": {"id": "verification-durc", "label": "DURC Verification", "type": "verification", "verificationType": "DURC", "config": {"timeout": 300, "retries": 3, "required": true, "description": "Verify DURC document compliance"}}},
        {"id": "verification-visura", "type": "builderNode", "position": {"x": 250, "y": 250}, "data": {"id": "verification-visura", "label": "VISURA Verification", "type": "verification", "verificationType": "VISURA", "config": {"timeout": 300, "retries": 3, "required": true, "description": "Verify company registration data"}}},
        {"id": "end-1", "type": "builderNode", "position": {"x": 250, "y": 350}, "data": {"id": "end-1", "label": "End", "type": "end", "config": {"description": "Workflow completion point"}}}
    ]'::jsonb,
    '[
        {"id": "e1", "source": "start-1", "target": "verification-durc"},
        {"id": "e2", "source": "verification-durc", "target": "verification-visura"},
        {"id": "e3", "source": "verification-visura", "target": "end-1"}
    ]'::jsonb,
    false,
    ARRAY['basic', 'document', 'verification']
)
ON CONFLICT DO NOTHING;
