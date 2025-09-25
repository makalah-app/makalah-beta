-- Migration: Create Workflow Phases Table
-- Description: Individual workflow phase tracking with detailed state management
-- Author: Database Architect
-- Date: 2025-01-25

-- Create phase status enum
CREATE TYPE phase_status AS ENUM (
    'pending',
    'in_progress',
    'waiting_approval',
    'approved',
    'rejected',
    'completed',
    'skipped',
    'failed'
);

-- Create approval action enum
CREATE TYPE approval_action AS ENUM (
    'approve',
    'reject',
    'request_revision',
    'skip'
);

-- Create workflow_phases table
CREATE TABLE IF NOT EXISTS public.workflow_phases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    phase_name academic_phase NOT NULL,
    phase_order INTEGER NOT NULL,
    status phase_status DEFAULT 'pending' NOT NULL,
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    estimated_duration INTERVAL NULL,
    actual_duration INTERVAL NULL,
    assigned_persona VARCHAR(100) NULL,
    ai_provider VARCHAR(50) NULL,
    ai_model VARCHAR(100) NULL,
    input_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    output_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    ai_response JSONB DEFAULT '{}'::jsonb NOT NULL,
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    approval_required BOOLEAN DEFAULT false NOT NULL,
    approval_status phase_status NULL,
    approved_by UUID NULL REFERENCES public.users(id),
    approved_at TIMESTAMPTZ NULL,
    rejection_reason TEXT NULL,
    revision_count INTEGER DEFAULT 0 NOT NULL,
    error_messages TEXT[] NULL,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_workflow_phases_workflow_id ON public.workflow_phases(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_phase_name ON public.workflow_phases(phase_name);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_status ON public.workflow_phases(status);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_phase_order ON public.workflow_phases(phase_order);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_approval_status ON public.workflow_phases(approval_status);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_approved_by ON public.workflow_phases(approved_by);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_created_at ON public.workflow_phases(created_at);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_workflow_phases_workflow_order ON public.workflow_phases(workflow_id, phase_order);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_pending_approval ON public.workflow_phases(workflow_id, approval_required, approval_status) WHERE approval_required = true;

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_workflow_phases_input_data ON public.workflow_phases USING gin(input_data);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_output_data ON public.workflow_phases USING gin(output_data);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_ai_response ON public.workflow_phases USING gin(ai_response);
CREATE INDEX IF NOT EXISTS idx_workflow_phases_performance ON public.workflow_phases USING gin(performance_metrics);

-- Create updated_at trigger
CREATE TRIGGER update_workflow_phases_updated_at
    BEFORE UPDATE ON public.workflow_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to manage phase transitions and timing
CREATE OR REPLACE FUNCTION manage_phase_transitions()
RETURNS TRIGGER AS $$
BEGIN
    -- Set started_at when phase begins
    IF OLD.status != 'in_progress' AND NEW.status = 'in_progress' AND NEW.started_at IS NULL THEN
        NEW.started_at = NOW();
    END IF;
    
    -- Set completed_at and calculate actual_duration when phase completes
    IF OLD.status NOT IN ('completed', 'approved') AND NEW.status IN ('completed', 'approved') AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
        IF NEW.started_at IS NOT NULL THEN
            NEW.actual_duration = NEW.completed_at - NEW.started_at;
        END IF;
    END IF;
    
    -- Auto-set approval_status based on status
    IF NEW.approval_required = true THEN
        IF NEW.status = 'completed' AND NEW.approval_status IS NULL THEN
            NEW.approval_status = 'waiting_approval';
        ELSIF NEW.status = 'approved' THEN
            NEW.approval_status = 'approved';
            NEW.approved_at = COALESCE(NEW.approved_at, NOW());
        ELSIF NEW.status = 'rejected' THEN
            NEW.approval_status = 'rejected';
        END IF;
    END IF;
    
    -- Update workflow progress when phase status changes
    IF OLD.status != NEW.status THEN
        -- This will be handled by a separate trigger or function
        PERFORM update_workflow_progress(NEW.workflow_id);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create phase transition trigger
CREATE TRIGGER manage_workflow_phase_transitions
    BEFORE UPDATE ON public.workflow_phases
    FOR EACH ROW
    EXECUTE FUNCTION manage_phase_transitions();

-- Create function to update workflow progress
CREATE OR REPLACE FUNCTION update_workflow_progress(workflow_uuid UUID)
RETURNS void AS $$
DECLARE
    completed_count INTEGER;
    total_count INTEGER;
    current_phase_name academic_phase;
BEGIN
    -- Count completed phases
    SELECT COUNT(*) INTO completed_count
    FROM public.workflow_phases 
    WHERE workflow_id = workflow_uuid 
    AND status IN ('completed', 'approved', 'skipped');
    
    -- Count total phases
    SELECT COUNT(*) INTO total_count
    FROM public.workflow_phases 
    WHERE workflow_id = workflow_uuid;
    
    -- Get next active phase
    SELECT phase_name INTO current_phase_name
    FROM public.workflow_phases 
    WHERE workflow_id = workflow_uuid 
    AND status IN ('pending', 'in_progress')
    ORDER BY phase_order ASC
    LIMIT 1;
    
    -- Update workflow with progress
    UPDATE public.workflows 
    SET 
        completed_phases = completed_count,
        total_phases = total_count,
        current_phase = COALESCE(current_phase_name, current_phase),
        status = CASE 
            WHEN completed_count = total_count THEN 'completed'::workflow_status
            WHEN completed_count > 0 THEN 'active'::workflow_status
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = workflow_uuid;
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.workflow_phases ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.workflow_phases IS 'Individual workflow phase instances with detailed tracking';
COMMENT ON COLUMN public.workflow_phases.phase_order IS 'Sequential order of this phase in the workflow (1-7)';
COMMENT ON COLUMN public.workflow_phases.assigned_persona IS 'AI persona assigned to execute this phase';
COMMENT ON COLUMN public.workflow_phases.input_data IS 'JSON input data passed to AI for this phase';
COMMENT ON COLUMN public.workflow_phases.output_data IS 'JSON structured output from AI phase execution';
COMMENT ON COLUMN public.workflow_phases.ai_response IS 'JSON raw AI response including metadata';
COMMENT ON COLUMN public.workflow_phases.quality_score IS 'AI-generated quality assessment score (0.0-1.0)';
COMMENT ON COLUMN public.workflow_phases.performance_metrics IS 'JSON performance data (tokens, duration, cost)';