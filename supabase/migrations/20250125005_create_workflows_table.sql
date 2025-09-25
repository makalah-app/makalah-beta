-- Migration: Create Workflows Table
-- Description: Academic workflow state management supporting 7-phase writing process
-- Author: Database Architect
-- Date: 2025-01-25

-- Create workflow status enum
CREATE TYPE workflow_status AS ENUM (
    'draft',
    'active', 
    'paused',
    'completed',
    'cancelled',
    'failed'
);

-- Create academic phase enum
CREATE TYPE academic_phase AS ENUM (
    'research_analysis',
    'outline_generation',
    'draft_composition',
    'content_refinement',
    'citation_integration',
    'academic_review',
    'final_formatting'
);

-- Create workflow table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    workflow_type VARCHAR(100) DEFAULT 'academic_paper' NOT NULL,
    status workflow_status DEFAULT 'draft' NOT NULL,
    current_phase academic_phase DEFAULT 'research_analysis' NOT NULL,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    total_phases INTEGER DEFAULT 7 NOT NULL,
    completed_phases INTEGER DEFAULT 0 NOT NULL,
    estimated_completion_time INTERVAL NULL,
    actual_start_time TIMESTAMPTZ NULL,
    actual_completion_time TIMESTAMPTZ NULL,
    auto_approve_enabled BOOLEAN DEFAULT false NOT NULL,
    approval_required_phases TEXT[] DEFAULT '{"academic_review", "final_formatting"}',
    workflow_config JSONB DEFAULT '{}'::jsonb NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_current_phase ON public.workflows(current_phase);
CREATE INDEX IF NOT EXISTS idx_workflows_workflow_type ON public.workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON public.workflows(created_at);
CREATE INDEX IF NOT EXISTS idx_workflows_progress ON public.workflows(progress_percentage);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_workflows_user_status ON public.workflows(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workflows_active_lookup ON public.workflows(user_id, status, current_phase) WHERE status = 'active';

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_workflows_config ON public.workflows USING gin(workflow_config);
CREATE INDEX IF NOT EXISTS idx_workflows_metadata ON public.workflows USING gin(metadata);

-- Create full text search index for title and description
CREATE INDEX IF NOT EXISTS idx_workflows_search ON public.workflows USING gin(
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Create updated_at trigger
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate workflow state transitions
CREATE OR REPLACE FUNCTION validate_workflow_transitions()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate progress percentage matches completed phases
    IF NEW.completed_phases > NEW.total_phases THEN
        RAISE EXCEPTION 'Completed phases cannot exceed total phases: % > %', NEW.completed_phases, NEW.total_phases;
    END IF;
    
    -- Auto-calculate progress percentage
    NEW.progress_percentage = ROUND((NEW.completed_phases::DECIMAL / NEW.total_phases::DECIMAL) * 100);
    
    -- Set actual start time when workflow becomes active
    IF OLD.status != 'active' AND NEW.status = 'active' AND NEW.actual_start_time IS NULL THEN
        NEW.actual_start_time = NOW();
    END IF;
    
    -- Set actual completion time when workflow is completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' AND NEW.actual_completion_time IS NULL THEN
        NEW.actual_completion_time = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create validation trigger
CREATE TRIGGER validate_workflow_state
    BEFORE INSERT OR UPDATE ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION validate_workflow_transitions();

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.workflows IS 'Academic workflow instances with 7-phase writing process management';
COMMENT ON COLUMN public.workflows.workflow_type IS 'Type of academic workflow (academic_paper, thesis, research_proposal)';
COMMENT ON COLUMN public.workflows.current_phase IS 'Current active phase in the academic workflow';
COMMENT ON COLUMN public.workflows.progress_percentage IS 'Auto-calculated progress percentage (0-100)';
COMMENT ON COLUMN public.workflows.approval_required_phases IS 'Array of phases requiring human approval';
COMMENT ON COLUMN public.workflows.workflow_config IS 'JSON configuration for workflow behavior';
COMMENT ON COLUMN public.workflows.metadata IS 'JSON metadata for workflow context and settings';