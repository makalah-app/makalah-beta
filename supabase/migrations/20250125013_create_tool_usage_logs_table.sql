-- Migration: Create Tool Usage Logs Table  
-- Description: Logging of AI tool usage and function executions
-- Author: Database Architect
-- Date: 2025-01-25

-- Create tool category enum
CREATE TYPE tool_category AS ENUM (
    'search',
    'research',
    'citation',
    'analysis',
    'content_generation',
    'quality_assessment',
    'collaboration',
    'storage',
    'workflow_management',
    'external_api'
);

-- Create tool execution status enum
CREATE TYPE tool_execution_status AS ENUM (
    'initiated',
    'in_progress',
    'completed',
    'failed',
    'timeout',
    'cancelled',
    'rate_limited',
    'unauthorized'
);

-- Create tool_usage_logs table
CREATE TABLE IF NOT EXISTS public.tool_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ai_interaction_id UUID NULL REFERENCES public.ai_interactions(id) ON DELETE CASCADE,
    workflow_id UUID NULL REFERENCES public.workflows(id) ON DELETE SET NULL,
    phase_id UUID NULL REFERENCES public.workflow_phases(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tool_name VARCHAR(200) NOT NULL,
    tool_category tool_category NOT NULL,
    tool_version VARCHAR(50) NULL,
    execution_status tool_execution_status DEFAULT 'initiated' NOT NULL,
    execution_id VARCHAR(200) NULL, -- External execution ID if applicable
    parent_tool_id UUID NULL REFERENCES public.tool_usage_logs(id),
    sequence_number INTEGER DEFAULT 1 NOT NULL, -- Order of execution in workflow
    -- Input data
    input_parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
    input_validation_status VARCHAR(50) DEFAULT 'valid' CHECK (input_validation_status IN ('valid', 'invalid', 'warning')),
    input_validation_errors TEXT[] NULL,
    -- Output data  
    output_data JSONB NULL,
    output_format VARCHAR(100) NULL, -- 'json', 'text', 'binary', 'stream'
    output_size_bytes BIGINT NULL,
    output_validation_status VARCHAR(50) DEFAULT 'pending' CHECK (output_validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    -- Execution metrics
    started_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    execution_duration INTERVAL NULL,
    cpu_time_ms INTEGER NULL,
    memory_used_mb INTEGER NULL,
    network_requests_count INTEGER DEFAULT 0,
    external_api_calls INTEGER DEFAULT 0,
    -- Error handling
    error_message TEXT NULL,
    error_code VARCHAR(100) NULL,
    error_type VARCHAR(100) NULL, -- 'validation', 'network', 'api_limit', 'timeout', 'permission'
    retry_count INTEGER DEFAULT 0 NOT NULL,
    retry_strategy VARCHAR(100) NULL,
    -- Quality and performance
    success_rate DECIMAL(5,2) CHECK (success_rate >= 0.0 AND success_rate <= 100.0),
    performance_score DECIMAL(3,2) CHECK (performance_score >= 0.0 AND performance_score <= 1.0),
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),
    -- Cost tracking
    estimated_cost DECIMAL(10,6) NULL,
    cost_currency VARCHAR(3) DEFAULT 'USD',
    billing_category VARCHAR(100) NULL,
    -- Metadata and context
    execution_context JSONB DEFAULT '{}'::jsonb,
    tool_configuration JSONB DEFAULT '{}'::jsonb,
    environment_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_ai_interaction_id ON public.tool_usage_logs(ai_interaction_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_workflow_id ON public.tool_usage_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_phase_id ON public.tool_usage_logs(phase_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_user_id ON public.tool_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_tool_name ON public.tool_usage_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_tool_category ON public.tool_usage_logs(tool_category);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_execution_status ON public.tool_usage_logs(execution_status);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_parent_tool_id ON public.tool_usage_logs(parent_tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_sequence_number ON public.tool_usage_logs(sequence_number);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_started_at ON public.tool_usage_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_completed_at ON public.tool_usage_logs(completed_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_created_at ON public.tool_usage_logs(created_at);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_workflow_sequence ON public.tool_usage_logs(workflow_id, phase_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_user_tool ON public.tool_usage_logs(user_id, tool_name, created_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_performance ON public.tool_usage_logs(tool_name, execution_status, execution_duration) WHERE execution_status = 'completed';
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_errors ON public.tool_usage_logs(tool_name, error_type, created_at) WHERE execution_status = 'failed';

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_input_parameters ON public.tool_usage_logs USING gin(input_parameters);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_output_data ON public.tool_usage_logs USING gin(output_data);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_execution_context ON public.tool_usage_logs USING gin(execution_context);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_tool_configuration ON public.tool_usage_logs USING gin(tool_configuration);
CREATE INDEX IF NOT EXISTS idx_tool_usage_logs_environment_info ON public.tool_usage_logs USING gin(environment_info);

-- Create updated_at trigger
CREATE TRIGGER update_tool_usage_logs_updated_at
    BEFORE UPDATE ON public.tool_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to manage tool execution lifecycle
CREATE OR REPLACE FUNCTION manage_tool_execution_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Set started_at when execution begins
    IF OLD.execution_status != 'in_progress' AND NEW.execution_status = 'in_progress' AND NEW.started_at IS NULL THEN
        NEW.started_at = NOW();
    END IF;
    
    -- Set completed_at and calculate duration when execution completes
    IF OLD.execution_status NOT IN ('completed', 'failed', 'cancelled') 
       AND NEW.execution_status IN ('completed', 'failed', 'cancelled') 
       AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
        
        -- Calculate execution duration
        IF NEW.started_at IS NOT NULL THEN
            NEW.execution_duration = NEW.completed_at - NEW.started_at;
        END IF;
    END IF;
    
    -- Auto-calculate output size for JSON output
    IF NEW.output_data IS NOT NULL AND NEW.output_size_bytes IS NULL THEN
        NEW.output_size_bytes = length(NEW.output_data::text);
    END IF;
    
    -- Update parent AI interaction with tool results
    IF NEW.ai_interaction_id IS NOT NULL AND NEW.execution_status = 'completed' AND NEW.output_data IS NOT NULL THEN
        -- Update the function_results in the AI interaction
        UPDATE public.ai_interactions
        SET 
            function_results = COALESCE(function_results, '{}'::jsonb) || 
                jsonb_build_object(NEW.tool_name, NEW.output_data),
            updated_at = NOW()
        WHERE id = NEW.ai_interaction_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create tool execution lifecycle trigger
CREATE TRIGGER manage_tool_execution_lifecycle_trigger
    BEFORE UPDATE ON public.tool_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION manage_tool_execution_lifecycle();

-- Create function to get tool usage statistics
CREATE OR REPLACE FUNCTION get_tool_usage_statistics(
    user_uuid UUID DEFAULT NULL,
    tool_name_filter VARCHAR DEFAULT NULL,
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
    stats_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_executions', COUNT(*),
        'successful_executions', COUNT(*) FILTER (WHERE execution_status = 'completed'),
        'failed_executions', COUNT(*) FILTER (WHERE execution_status = 'failed'),
        'avg_execution_time_ms', AVG(EXTRACT(EPOCH FROM execution_duration) * 1000),
        'total_cost', SUM(estimated_cost),
        'tool_breakdown', jsonb_object_agg(
            tool_name, 
            jsonb_build_object(
                'count', COUNT(*),
                'success_rate', ROUND(
                    COUNT(*) FILTER (WHERE execution_status = 'completed')::DECIMAL / COUNT(*) * 100, 2
                ),
                'avg_duration_ms', AVG(EXTRACT(EPOCH FROM execution_duration) * 1000),
                'avg_cost', AVG(estimated_cost)
            )
        ),
        'category_breakdown', jsonb_object_agg(
            tool_category, 
            jsonb_build_object(
                'count', COUNT(*),
                'avg_performance_score', AVG(performance_score),
                'total_cost', SUM(estimated_cost)
            )
        ),
        'error_breakdown', jsonb_object_agg(
            COALESCE(error_type, 'no_error'),
            COUNT(*)
        ),
        'period_start', start_date,
        'period_end', end_date,
        'generated_at', NOW()
    ) INTO stats_result
    FROM public.tool_usage_logs
    WHERE (user_uuid IS NULL OR user_id = user_uuid)
    AND (tool_name_filter IS NULL OR tool_name = tool_name_filter)
    AND created_at BETWEEN start_date AND end_date;
    
    RETURN stats_result;
END;
$$ language 'plpgsql';

-- Create function to get tool execution chain
CREATE OR REPLACE FUNCTION get_tool_execution_chain(root_tool_id UUID)
RETURNS TABLE(
    id UUID,
    tool_name VARCHAR,
    tool_category tool_category,
    execution_status tool_execution_status,
    sequence_number INTEGER,
    execution_duration INTERVAL,
    parent_tool_id UUID,
    level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE tool_chain AS (
        -- Base case: root tool
        SELECT 
            tul.id,
            tul.tool_name,
            tul.tool_category,
            tul.execution_status,
            tul.sequence_number,
            tul.execution_duration,
            tul.parent_tool_id,
            0 as level
        FROM public.tool_usage_logs tul
        WHERE tul.id = root_tool_id
        
        UNION ALL
        
        -- Recursive case: child tools
        SELECT 
            tul.id,
            tul.tool_name,
            tul.tool_category,
            tul.execution_status,
            tul.sequence_number,
            tul.execution_duration,
            tul.parent_tool_id,
            tc.level + 1
        FROM public.tool_usage_logs tul
        JOIN tool_chain tc ON tul.parent_tool_id = tc.id
    )
    SELECT * FROM tool_chain ORDER BY level, sequence_number;
END;
$$ language 'plpgsql';

-- Create function to analyze tool performance trends
CREATE OR REPLACE FUNCTION analyze_tool_performance_trends(
    tool_name_param VARCHAR,
    days_back INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    trend_data JSONB;
BEGIN
    WITH daily_stats AS (
        SELECT 
            DATE(created_at) as usage_date,
            COUNT(*) as executions,
            AVG(EXTRACT(EPOCH FROM execution_duration)) as avg_duration_seconds,
            COUNT(*) FILTER (WHERE execution_status = 'completed')::DECIMAL / COUNT(*) as success_rate,
            AVG(performance_score) as avg_performance_score
        FROM public.tool_usage_logs
        WHERE tool_name = tool_name_param
        AND created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE(created_at)
        ORDER BY usage_date
    )
    SELECT jsonb_build_object(
        'tool_name', tool_name_param,
        'analysis_period_days', days_back,
        'daily_trends', jsonb_agg(
            jsonb_build_object(
                'date', usage_date,
                'executions', executions,
                'avg_duration_seconds', avg_duration_seconds,
                'success_rate_percent', ROUND(success_rate * 100, 2),
                'avg_performance_score', avg_performance_score
            ) ORDER BY usage_date
        ),
        'overall_trend', jsonb_build_object(
            'total_executions', SUM(executions),
            'avg_success_rate_percent', ROUND(AVG(success_rate) * 100, 2),
            'performance_trend', 
                CASE 
                    WHEN AVG(avg_performance_score) OVER (ORDER BY usage_date ROWS BETWEEN 7 PRECEDING AND CURRENT ROW) > 
                         AVG(avg_performance_score) OVER (ORDER BY usage_date ROWS BETWEEN 14 PRECEDING AND 7 PRECEDING) 
                    THEN 'improving'
                    ELSE 'declining'
                END
        ),
        'generated_at', NOW()
    ) INTO trend_data
    FROM daily_stats;
    
    RETURN trend_data;
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.tool_usage_logs ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.tool_usage_logs IS 'Comprehensive logging of AI tool usage and function executions';
COMMENT ON COLUMN public.tool_usage_logs.sequence_number IS 'Order of tool execution within workflow/interaction';
COMMENT ON COLUMN public.tool_usage_logs.input_parameters IS 'JSON parameters passed to tool';
COMMENT ON COLUMN public.tool_usage_logs.output_data IS 'JSON output data from tool execution';
COMMENT ON COLUMN public.tool_usage_logs.execution_context IS 'JSON context about execution environment';
COMMENT ON COLUMN public.tool_usage_logs.tool_configuration IS 'JSON tool-specific configuration used';
COMMENT ON COLUMN public.tool_usage_logs.performance_score IS 'Tool execution performance score (0.0-1.0)';
COMMENT ON COLUMN public.tool_usage_logs.user_satisfaction_rating IS 'User rating of tool output quality (1-5)';