-- Migration: Create Workflow Context Table
-- Description: Context storage for academic workflows with version control
-- Author: Database Architect
-- Date: 2025-01-25

-- Create context type enum
CREATE TYPE context_type AS ENUM (
    'research_data',
    'user_instructions',
    'domain_knowledge', 
    'style_preferences',
    'citation_sources',
    'previous_outputs',
    'feedback_history',
    'quality_standards'
);

-- Create workflow_context table
CREATE TABLE IF NOT EXISTS public.workflow_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    context_type context_type NOT NULL,
    context_key VARCHAR(200) NOT NULL,
    context_value JSONB NOT NULL,
    context_metadata JSONB DEFAULT '{}'::jsonb,
    version INTEGER DEFAULT 1 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    phase_scope academic_phase[] NULL,
    expiry_date TIMESTAMPTZ NULL,
    source_reference TEXT NULL,
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    usage_count INTEGER DEFAULT 0 NOT NULL,
    last_used_at TIMESTAMPTZ NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_workflow_context_workflow_id ON public.workflow_context(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_context_type ON public.workflow_context(context_type);
CREATE INDEX IF NOT EXISTS idx_workflow_context_key ON public.workflow_context(context_key);
CREATE INDEX IF NOT EXISTS idx_workflow_context_is_active ON public.workflow_context(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_context_version ON public.workflow_context(version);
CREATE INDEX IF NOT EXISTS idx_workflow_context_created_at ON public.workflow_context(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_context_usage ON public.workflow_context(usage_count);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_workflow_context_lookup ON public.workflow_context(workflow_id, context_type, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_context_key_version ON public.workflow_context(workflow_id, context_key, version);

-- Create GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_workflow_context_value ON public.workflow_context USING gin(context_value);
CREATE INDEX IF NOT EXISTS idx_workflow_context_metadata ON public.workflow_context USING gin(context_metadata);
CREATE INDEX IF NOT EXISTS idx_workflow_context_phase_scope ON public.workflow_context USING gin(phase_scope);

-- Create full text search index for context values
CREATE INDEX IF NOT EXISTS idx_workflow_context_search ON public.workflow_context USING gin(
    to_tsvector('simple', coalesce(context_key, '') || ' ' || coalesce(context_value::text, ''))
);

-- Create updated_at trigger
CREATE TRIGGER update_workflow_context_updated_at
    BEFORE UPDATE ON public.workflow_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to manage context versioning
CREATE OR REPLACE FUNCTION manage_context_versioning()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-increment version for updates to same context_key
    IF TG_OP = 'INSERT' THEN
        SELECT COALESCE(MAX(version), 0) + 1 
        INTO NEW.version
        FROM public.workflow_context 
        WHERE workflow_id = NEW.workflow_id 
        AND context_key = NEW.context_key;
        
        -- Deactivate previous versions if this is a new active version
        IF NEW.is_active = true THEN
            UPDATE public.workflow_context 
            SET is_active = false, updated_at = NOW()
            WHERE workflow_id = NEW.workflow_id 
            AND context_key = NEW.context_key 
            AND version < NEW.version
            AND is_active = true;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create versioning trigger
CREATE TRIGGER manage_workflow_context_versioning
    BEFORE INSERT ON public.workflow_context
    FOR EACH ROW
    EXECUTE FUNCTION manage_context_versioning();

-- Create function to update usage statistics
CREATE OR REPLACE FUNCTION update_context_usage()
RETURNS TRIGGER AS $$
BEGIN
    NEW.usage_count = NEW.usage_count + 1;
    NEW.last_used_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to get active context for workflow
CREATE OR REPLACE FUNCTION get_workflow_context(
    workflow_uuid UUID,
    context_type_filter context_type DEFAULT NULL,
    phase_filter academic_phase DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    context_type context_type,
    context_key VARCHAR,
    context_value JSONB,
    context_metadata JSONB,
    version INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wc.id,
        wc.context_type,
        wc.context_key,
        wc.context_value,
        wc.context_metadata,
        wc.version
    FROM public.workflow_context wc
    WHERE wc.workflow_id = workflow_uuid
    AND wc.is_active = true
    AND (wc.expiry_date IS NULL OR wc.expiry_date > NOW())
    AND (context_type_filter IS NULL OR wc.context_type = context_type_filter)
    AND (phase_filter IS NULL OR phase_filter = ANY(wc.phase_scope) OR wc.phase_scope IS NULL)
    ORDER BY wc.context_type, wc.context_key, wc.version DESC;
END;
$$ language 'plpgsql';

-- Create function to clean up expired context
CREATE OR REPLACE FUNCTION cleanup_expired_context()
RETURNS void AS $$
BEGIN
    -- Mark expired context as inactive
    UPDATE public.workflow_context
    SET is_active = false, updated_at = NOW()
    WHERE expiry_date IS NOT NULL 
    AND expiry_date <= NOW()
    AND is_active = true;
    
    -- Delete old inactive context (older than 90 days)
    DELETE FROM public.workflow_context
    WHERE is_active = false
    AND updated_at < NOW() - INTERVAL '90 days';
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.workflow_context ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.workflow_context IS 'Versioned context storage for academic workflows';
COMMENT ON COLUMN public.workflow_context.context_key IS 'Unique identifier for this context item within workflow';
COMMENT ON COLUMN public.workflow_context.context_value IS 'JSON context data (research, instructions, preferences)';
COMMENT ON COLUMN public.workflow_context.phase_scope IS 'Array of phases where this context applies (NULL = all phases)';
COMMENT ON COLUMN public.workflow_context.version IS 'Auto-incrementing version number for context updates';
COMMENT ON COLUMN public.workflow_context.quality_score IS 'Quality assessment of context relevance and accuracy';
COMMENT ON COLUMN public.workflow_context.source_reference IS 'Reference to original source of context data';