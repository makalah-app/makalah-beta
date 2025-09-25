-- Migration: Create Approval Gates Table
-- Description: Human approval gates for academic workflow phases
-- Author: Database Architect
-- Date: 2025-01-25

-- Create approval gates table
CREATE TABLE IF NOT EXISTS public.approval_gates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES public.workflow_phases(id) ON DELETE CASCADE,
    gate_name VARCHAR(200) NOT NULL,
    gate_description TEXT NULL,
    required_approvers INTEGER DEFAULT 1 NOT NULL CHECK (required_approvers >= 1),
    approval_threshold DECIMAL(3,2) DEFAULT 1.0 CHECK (approval_threshold > 0.0 AND approval_threshold <= 1.0),
    is_mandatory BOOLEAN DEFAULT true NOT NULL,
    timeout_duration INTERVAL DEFAULT '24 hours',
    auto_approve_after_timeout BOOLEAN DEFAULT false NOT NULL,
    notification_enabled BOOLEAN DEFAULT true NOT NULL,
    escalation_enabled BOOLEAN DEFAULT false NOT NULL,
    escalation_after INTERVAL DEFAULT '48 hours',
    escalation_to UUID[] NULL,
    approval_criteria JSONB DEFAULT '{}'::jsonb,
    gate_status phase_status DEFAULT 'pending' NOT NULL,
    submitted_at TIMESTAMPTZ NULL,
    submitted_by UUID REFERENCES public.users(id),
    deadline TIMESTAMPTZ NULL,
    approved_count INTEGER DEFAULT 0 NOT NULL,
    rejected_count INTEGER DEFAULT 0 NOT NULL,
    total_responses INTEGER DEFAULT 0 NOT NULL,
    final_decision approval_action NULL,
    decision_made_at TIMESTAMPTZ NULL,
    decision_rationale TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create approval_responses table for individual approver responses
CREATE TABLE IF NOT EXISTS public.approval_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    approval_gate_id UUID NOT NULL REFERENCES public.approval_gates(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    response_action approval_action NOT NULL,
    response_text TEXT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    time_spent_reviewing INTERVAL NULL,
    review_notes JSONB DEFAULT '{}'::jsonb,
    revision_suggestions TEXT[] NULL,
    quality_assessment JSONB DEFAULT '{}'::jsonb,
    responded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for approval_gates
CREATE INDEX IF NOT EXISTS idx_approval_gates_workflow_id ON public.approval_gates(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_gates_phase_id ON public.approval_gates(phase_id);
CREATE INDEX IF NOT EXISTS idx_approval_gates_status ON public.approval_gates(gate_status);
CREATE INDEX IF NOT EXISTS idx_approval_gates_submitted_by ON public.approval_gates(submitted_by);
CREATE INDEX IF NOT EXISTS idx_approval_gates_deadline ON public.approval_gates(deadline);
CREATE INDEX IF NOT EXISTS idx_approval_gates_created_at ON public.approval_gates(created_at);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_approval_gates_pending ON public.approval_gates(workflow_id, gate_status, deadline) WHERE gate_status = 'waiting_approval';

-- Create GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_approval_gates_criteria ON public.approval_gates USING gin(approval_criteria);
CREATE INDEX IF NOT EXISTS idx_approval_gates_escalation_to ON public.approval_gates USING gin(escalation_to);

-- Create indexes for approval_responses
CREATE INDEX IF NOT EXISTS idx_approval_responses_gate_id ON public.approval_responses(approval_gate_id);
CREATE INDEX IF NOT EXISTS idx_approval_responses_approver_id ON public.approval_responses(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_responses_action ON public.approval_responses(response_action);
CREATE INDEX IF NOT EXISTS idx_approval_responses_responded_at ON public.approval_responses(responded_at);

-- Create composite index for response lookups
CREATE INDEX IF NOT EXISTS idx_approval_responses_lookup ON public.approval_responses(approval_gate_id, approver_id);

-- Create GIN indexes for JSONB columns in responses
CREATE INDEX IF NOT EXISTS idx_approval_responses_notes ON public.approval_responses USING gin(review_notes);
CREATE INDEX IF NOT EXISTS idx_approval_responses_quality ON public.approval_responses USING gin(quality_assessment);

-- Create updated_at triggers
CREATE TRIGGER update_approval_gates_updated_at
    BEFORE UPDATE ON public.approval_gates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_responses_updated_at
    BEFORE UPDATE ON public.approval_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to manage approval gate state
CREATE OR REPLACE FUNCTION manage_approval_gate_state()
RETURNS TRIGGER AS $$
DECLARE
    gate_record public.approval_gates%ROWTYPE;
BEGIN
    -- Get the approval gate record
    SELECT * INTO gate_record FROM public.approval_gates WHERE id = NEW.approval_gate_id;
    
    -- Update approval gate statistics
    UPDATE public.approval_gates 
    SET 
        approved_count = (
            SELECT COUNT(*) FROM public.approval_responses 
            WHERE approval_gate_id = NEW.approval_gate_id 
            AND response_action = 'approve'
        ),
        rejected_count = (
            SELECT COUNT(*) FROM public.approval_responses 
            WHERE approval_gate_id = NEW.approval_gate_id 
            AND response_action = 'reject'
        ),
        total_responses = (
            SELECT COUNT(*) FROM public.approval_responses 
            WHERE approval_gate_id = NEW.approval_gate_id
        ),
        updated_at = NOW()
    WHERE id = NEW.approval_gate_id;
    
    -- Check if approval threshold is met
    PERFORM evaluate_approval_gate(NEW.approval_gate_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for approval response changes
CREATE TRIGGER update_approval_gate_on_response
    AFTER INSERT OR UPDATE ON public.approval_responses
    FOR EACH ROW
    EXECUTE FUNCTION manage_approval_gate_state();

-- Create function to evaluate approval gate decisions
CREATE OR REPLACE FUNCTION evaluate_approval_gate(gate_id UUID)
RETURNS void AS $$
DECLARE
    gate_record public.approval_gates%ROWTYPE;
    approval_ratio DECIMAL;
    decision approval_action;
BEGIN
    -- Get gate details
    SELECT * INTO gate_record FROM public.approval_gates WHERE id = gate_id;
    
    -- Calculate approval ratio
    IF gate_record.total_responses > 0 THEN
        approval_ratio = gate_record.approved_count::DECIMAL / gate_record.total_responses::DECIMAL;
    ELSE
        approval_ratio = 0.0;
    END IF;
    
    -- Determine decision based on threshold and responses
    IF gate_record.total_responses >= gate_record.required_approvers THEN
        IF approval_ratio >= gate_record.approval_threshold THEN
            decision = 'approve';
        ELSE
            decision = 'reject';
        END IF;
        
        -- Update gate with final decision
        UPDATE public.approval_gates
        SET 
            final_decision = decision,
            decision_made_at = NOW(),
            gate_status = CASE 
                WHEN decision = 'approve' THEN 'approved'::phase_status
                ELSE 'rejected'::phase_status
            END,
            updated_at = NOW()
        WHERE id = gate_id;
        
        -- Update corresponding workflow phase
        UPDATE public.workflow_phases
        SET 
            status = CASE 
                WHEN decision = 'approve' THEN 'approved'::phase_status
                ELSE 'rejected'::phase_status
            END,
            approval_status = CASE 
                WHEN decision = 'approve' THEN 'approved'::phase_status
                ELSE 'rejected'::phase_status
            END,
            approved_at = CASE WHEN decision = 'approve' THEN NOW() ELSE approved_at END,
            updated_at = NOW()
        WHERE id = gate_record.phase_id;
    END IF;
END;
$$ language 'plpgsql';

-- Create function to handle approval gate timeouts
CREATE OR REPLACE FUNCTION handle_approval_timeouts()
RETURNS void AS $$
BEGIN
    -- Handle expired approval gates
    UPDATE public.approval_gates
    SET 
        gate_status = CASE 
            WHEN auto_approve_after_timeout THEN 'approved'::phase_status
            ELSE 'failed'::phase_status
        END,
        final_decision = CASE 
            WHEN auto_approve_after_timeout THEN 'approve'::approval_action
            ELSE NULL
        END,
        decision_made_at = NOW(),
        decision_rationale = 'Timeout reached',
        updated_at = NOW()
    WHERE deadline <= NOW()
    AND gate_status = 'waiting_approval'::phase_status;
    
    -- Update corresponding workflow phases for timed-out gates
    UPDATE public.workflow_phases
    SET 
        status = CASE 
            WHEN ag.auto_approve_after_timeout THEN 'approved'::phase_status
            ELSE 'failed'::phase_status
        END,
        updated_at = NOW()
    FROM public.approval_gates ag
    WHERE public.workflow_phases.id = ag.phase_id
    AND ag.deadline <= NOW()
    AND ag.gate_status IN ('approved'::phase_status, 'failed'::phase_status)
    AND ag.decision_made_at >= NOW() - INTERVAL '1 minute';
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.approval_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_responses ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.approval_gates IS 'Human approval gates for workflow phase transitions';
COMMENT ON COLUMN public.approval_gates.approval_threshold IS 'Percentage of approvals needed (0.0-1.0)';
COMMENT ON COLUMN public.approval_gates.required_approvers IS 'Minimum number of approvers needed';
COMMENT ON COLUMN public.approval_gates.escalation_to IS 'Array of user IDs to escalate to on timeout';
COMMENT ON COLUMN public.approval_gates.approval_criteria IS 'JSON criteria for approval evaluation';

COMMENT ON TABLE public.approval_responses IS 'Individual approver responses to approval gates';
COMMENT ON COLUMN public.approval_responses.confidence_score IS 'Approver confidence in decision (0.0-1.0)';
COMMENT ON COLUMN public.approval_responses.quality_assessment IS 'JSON quality metrics from approver';
COMMENT ON COLUMN public.approval_responses.revision_suggestions IS 'Array of suggested revisions';