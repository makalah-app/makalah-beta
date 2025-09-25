-- Migration: Create AI Interactions Table
-- Description: Comprehensive logging of AI interactions with performance metrics
-- Author: Database Architect
-- Date: 2025-01-25

-- Create AI provider enum
CREATE TYPE ai_provider AS ENUM (
    'openai',
    'openrouter', 
    'anthropic',
    'google',
    'huggingface',
    'local'
);

-- Create interaction type enum
CREATE TYPE interaction_type AS ENUM (
    'chat_completion',
    'streaming_response',
    'tool_calling',
    'function_execution',
    'content_generation',
    'content_analysis',
    'quality_assessment',
    'translation',
    'summarization'
);

-- Create interaction status enum
CREATE TYPE interaction_status AS ENUM (
    'initiated',
    'in_progress',
    'completed',
    'failed',
    'timeout',
    'cancelled',
    'rate_limited'
);

-- Create ai_interactions table
CREATE TABLE IF NOT EXISTS public.ai_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NULL REFERENCES public.workflows(id) ON DELETE SET NULL,
    phase_id UUID NULL REFERENCES public.workflow_phases(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id UUID NULL, -- Links to user session
    interaction_type interaction_type NOT NULL,
    provider ai_provider NOT NULL,
    model VARCHAR(100) NOT NULL,
    status interaction_status DEFAULT 'initiated' NOT NULL,
    request_id VARCHAR(200) NULL, -- Provider's request ID
    parent_interaction_id UUID NULL REFERENCES public.ai_interactions(id),
    conversation_id UUID NULL, -- Groups related interactions
    persona VARCHAR(100) NULL,
    prompt_template VARCHAR(200) NULL,
    system_prompt TEXT NULL,
    user_prompt TEXT NOT NULL,
    context_data JSONB DEFAULT '{}'::jsonb,
    response_content TEXT NULL,
    response_structured JSONB NULL,
    finish_reason VARCHAR(50) NULL,
    tool_calls JSONB NULL, -- Array of tool calls made during interaction
    function_results JSONB NULL, -- Results from function executions
    error_message TEXT NULL,
    error_code VARCHAR(50) NULL,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    -- Performance metrics
    tokens_prompt INTEGER NULL,
    tokens_completion INTEGER NULL,
    tokens_total INTEGER NULL,
    request_duration INTERVAL NULL,
    response_time_ms INTEGER NULL,
    processing_time_ms INTEGER NULL,
    estimated_cost DECIMAL(10,6) NULL, -- Cost in USD
    -- Quality metrics
    response_quality_score DECIMAL(3,2) CHECK (response_quality_score >= 0.0 AND response_quality_score <= 1.0),
    relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
    coherence_score DECIMAL(3,2) CHECK (coherence_score >= 0.0 AND coherence_score <= 1.0),
    -- Request metadata
    temperature DECIMAL(3,2) NULL,
    max_tokens INTEGER NULL,
    top_p DECIMAL(3,2) NULL,
    frequency_penalty DECIMAL(3,2) NULL,
    presence_penalty DECIMAL(3,2) NULL,
    request_metadata JSONB DEFAULT '{}'::jsonb,
    response_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_ai_interactions_workflow_id ON public.ai_interactions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_phase_id ON public.ai_interactions(phase_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON public.ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_session_id ON public.ai_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_type ON public.ai_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_provider ON public.ai_interactions(provider);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_model ON public.ai_interactions(model);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_status ON public.ai_interactions(status);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_conversation_id ON public.ai_interactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_parent_id ON public.ai_interactions(parent_interaction_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_persona ON public.ai_interactions(persona);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON public.ai_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_completed_at ON public.ai_interactions(completed_at);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_workflow ON public.ai_interactions(user_id, workflow_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_provider_model ON public.ai_interactions(provider, model, status);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_performance ON public.ai_interactions(provider, model, response_time_ms) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_ai_interactions_costs ON public.ai_interactions(user_id, created_at, estimated_cost) WHERE estimated_cost IS NOT NULL;

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_ai_interactions_context_data ON public.ai_interactions USING gin(context_data);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_response_structured ON public.ai_interactions USING gin(response_structured);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_tool_calls ON public.ai_interactions USING gin(tool_calls);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_function_results ON public.ai_interactions USING gin(function_results);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_request_metadata ON public.ai_interactions USING gin(request_metadata);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_response_metadata ON public.ai_interactions USING gin(response_metadata);

-- Create full text search index for prompts and responses
CREATE INDEX IF NOT EXISTS idx_ai_interactions_content_search ON public.ai_interactions USING gin(
    to_tsvector('simple', 
        coalesce(user_prompt, '') || ' ' || 
        coalesce(response_content, '')
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_ai_interactions_updated_at
    BEFORE UPDATE ON public.ai_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to manage interaction completion
CREATE OR REPLACE FUNCTION complete_ai_interaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Set completion timestamp when status changes to completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
        
        -- Calculate total duration
        IF NEW.created_at IS NOT NULL THEN
            NEW.request_duration = NEW.completed_at - NEW.created_at;
        END IF;
    END IF;
    
    -- Calculate total tokens if individual counts are available
    IF NEW.tokens_prompt IS NOT NULL AND NEW.tokens_completion IS NOT NULL THEN
        NEW.tokens_total = NEW.tokens_prompt + NEW.tokens_completion;
    END IF;
    
    -- Update workflow phase with AI interaction results if linked
    IF NEW.phase_id IS NOT NULL AND NEW.status = 'completed' AND NEW.response_structured IS NOT NULL THEN
        UPDATE public.workflow_phases
        SET 
            ai_response = NEW.response_structured,
            performance_metrics = jsonb_build_object(
                'tokens_used', NEW.tokens_total,
                'response_time_ms', NEW.response_time_ms,
                'estimated_cost', NEW.estimated_cost,
                'interaction_id', NEW.id
            ),
            updated_at = NOW()
        WHERE id = NEW.phase_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create interaction completion trigger
CREATE TRIGGER complete_interaction_on_status_change
    BEFORE UPDATE ON public.ai_interactions
    FOR EACH ROW
    EXECUTE FUNCTION complete_ai_interaction();

-- Create function to get interaction statistics
CREATE OR REPLACE FUNCTION get_ai_interaction_stats(
    user_uuid UUID DEFAULT NULL,
    workflow_uuid UUID DEFAULT NULL,
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
    stats_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_interactions', COUNT(*),
        'completed_interactions', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_interactions', COUNT(*) FILTER (WHERE status = 'failed'),
        'total_tokens', SUM(tokens_total),
        'total_cost', SUM(estimated_cost),
        'avg_response_time_ms', AVG(response_time_ms),
        'provider_breakdown', jsonb_object_agg(
            provider, 
            jsonb_build_object(
                'count', COUNT(*),
                'avg_tokens', AVG(tokens_total),
                'avg_cost', AVG(estimated_cost)
            )
        ),
        'period_start', start_date,
        'period_end', end_date,
        'generated_at', NOW()
    ) INTO stats_result
    FROM public.ai_interactions
    WHERE (user_uuid IS NULL OR user_id = user_uuid)
    AND (workflow_uuid IS NULL OR workflow_id = workflow_uuid)
    AND created_at BETWEEN start_date AND end_date;
    
    RETURN stats_result;
END;
$$ language 'plpgsql';

-- Create function to cleanup old interactions
CREATE OR REPLACE FUNCTION cleanup_old_ai_interactions()
RETURNS void AS $$
BEGIN
    -- Archive old interactions (older than 6 months) to reduce table size
    -- Keep only essential fields for historical analysis
    CREATE TABLE IF NOT EXISTS public.ai_interactions_archive (
        LIKE public.ai_interactions INCLUDING DEFAULTS
    );
    
    -- Move old records to archive
    WITH old_interactions AS (
        DELETE FROM public.ai_interactions 
        WHERE created_at < NOW() - INTERVAL '6 months'
        AND status IN ('completed', 'failed', 'cancelled')
        RETURNING *
    )
    INSERT INTO public.ai_interactions_archive 
    SELECT * FROM old_interactions;
    
    -- Delete very old archive records (older than 2 years)
    DELETE FROM public.ai_interactions_archive 
    WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.ai_interactions IS 'Comprehensive logging of AI provider interactions with performance metrics';
COMMENT ON COLUMN public.ai_interactions.conversation_id IS 'Groups related interactions in a conversation thread';
COMMENT ON COLUMN public.ai_interactions.context_data IS 'JSON context passed to AI (workflow state, user preferences, etc.)';
COMMENT ON COLUMN public.ai_interactions.response_structured IS 'JSON structured response from AI for programmatic use';
COMMENT ON COLUMN public.ai_interactions.tool_calls IS 'JSON array of tool calls made during interaction';
COMMENT ON COLUMN public.ai_interactions.function_results IS 'JSON results from executed functions/tools';
COMMENT ON COLUMN public.ai_interactions.estimated_cost IS 'Estimated cost in USD based on token usage';
COMMENT ON COLUMN public.ai_interactions.response_quality_score IS 'AI-assessed quality of response (0.0-1.0)';
COMMENT ON COLUMN public.ai_interactions.request_metadata IS 'JSON metadata about request (headers, settings, etc.)';
COMMENT ON COLUMN public.ai_interactions.response_metadata IS 'JSON metadata from AI response (usage, model info, etc.)';