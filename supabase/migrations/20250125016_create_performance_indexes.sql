-- Migration: Create Performance Indexes and Optimization
-- Description: Comprehensive indexing strategy for optimal query performance
-- Author: Database Architect
-- Date: 2025-01-25

-- =====================================================
-- COMPOSITE INDEXES FOR FREQUENT QUERY PATTERNS
-- =====================================================

-- User authentication and session management indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_lookup 
ON public.users(email, is_active, password_hash) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_active_lookup 
ON public.user_sessions(user_id, is_active, expires_at) 
WHERE is_active = true;

-- Workflow management composite indexes
CREATE INDEX IF NOT EXISTS idx_workflows_user_active_progress 
ON public.workflows(user_id, status, progress_percentage, created_at) 
WHERE status IN ('active', 'draft');

CREATE INDEX IF NOT EXISTS idx_workflows_completion_tracking 
ON public.workflows(status, actual_completion_time, completed_phases);

-- Workflow phase execution indexes
CREATE INDEX IF NOT EXISTS idx_workflow_phases_execution_order 
ON public.workflow_phases(workflow_id, phase_order, status);

CREATE INDEX IF NOT EXISTS idx_workflow_phases_pending_approval 
ON public.workflow_phases(workflow_id, approval_required, approval_status) 
WHERE approval_required = true AND approval_status IN ('waiting_approval', 'pending');

CREATE INDEX IF NOT EXISTS idx_workflow_phases_ai_performance 
ON public.workflow_phases(phase_name, status, quality_score, created_at) 
WHERE status = 'completed';

-- Artifact access and management indexes
CREATE INDEX IF NOT EXISTS idx_artifacts_workflow_type_status 
ON public.artifacts(workflow_id, artifact_type, status, current_version);

CREATE INDEX IF NOT EXISTS idx_artifacts_user_recent 
ON public.artifacts(user_id, created_at DESC, status) 
WHERE status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_artifacts_public_templates 
ON public.artifacts(is_template, is_public, template_category, quality_score) 
WHERE is_template = true AND is_public = true;

CREATE INDEX IF NOT EXISTS idx_artifacts_file_management 
ON public.artifacts(file_path, processing_status, file_size) 
WHERE file_path IS NOT NULL;

-- AI interaction performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_recent 
ON public.ai_interactions(user_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_provider_performance 
ON public.ai_interactions(provider, model, status, response_time_ms, tokens_total) 
WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_ai_interactions_workflow_context 
ON public.ai_interactions(workflow_id, phase_id, interaction_type, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_conversation_thread 
ON public.ai_interactions(conversation_id, parent_interaction_id, created_at) 
WHERE conversation_id IS NOT NULL;

-- Tool usage analytics indexes
CREATE INDEX IF NOT EXISTS idx_tool_usage_performance_analytics 
ON public.tool_usage_logs(tool_name, execution_status, execution_duration, created_at) 
WHERE execution_status = 'completed';

CREATE INDEX IF NOT EXISTS idx_tool_usage_error_tracking 
ON public.tool_usage_logs(tool_name, error_type, created_at) 
WHERE execution_status = 'failed';

CREATE INDEX IF NOT EXISTS idx_tool_usage_workflow_sequence 
ON public.tool_usage_logs(workflow_id, sequence_number, tool_category);

-- Research query optimization indexes
CREATE INDEX IF NOT EXISTS idx_research_queries_domain_performance 
ON public.research_queries(academic_domain, query_type, status, results_quality_score);

CREATE INDEX IF NOT EXISTS idx_research_queries_user_recent 
ON public.research_queries(user_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_research_query_results_quality_ranking 
ON public.research_query_results(research_query_id, relevance_score, source_credibility, result_rank);

CREATE INDEX IF NOT EXISTS idx_research_query_results_citation_usage 
ON public.research_query_results(selected_for_citation, used_in_content, source_credibility) 
WHERE selected_for_citation = true OR used_in_content = true;

-- =====================================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- =====================================================

-- Active workflow processing
CREATE INDEX IF NOT EXISTS idx_workflows_active_processing 
ON public.workflows(user_id, current_phase, updated_at) 
WHERE status = 'active';

-- Failed AI interactions for monitoring
CREATE INDEX IF NOT EXISTS idx_ai_interactions_failures 
ON public.ai_interactions(provider, model, error_code, created_at) 
WHERE status = 'failed';

-- High-value artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_high_quality 
ON public.artifacts(artifact_type, quality_score, created_at) 
WHERE quality_score >= 0.8;

-- Recent user activity
CREATE INDEX IF NOT EXISTS idx_user_recent_activity 
ON public.users(last_login_at DESC, is_active, role) 
WHERE is_active = true;

-- =====================================================
-- COVERING INDEXES FOR READ-HEAVY QUERIES
-- =====================================================

-- Workflow dashboard queries (includes commonly accessed fields)
CREATE INDEX IF NOT EXISTS idx_workflows_dashboard_covering 
ON public.workflows(user_id, status, created_at) 
INCLUDE (title, current_phase, progress_percentage, updated_at);

-- Artifact listing with metadata
CREATE INDEX IF NOT EXISTS idx_artifacts_listing_covering 
ON public.artifacts(workflow_id, status, created_at) 
INCLUDE (name, artifact_type, file_size, quality_score);

-- AI interaction history with performance data
CREATE INDEX IF NOT EXISTS idx_ai_interactions_history_covering 
ON public.ai_interactions(user_id, created_at) 
INCLUDE (interaction_type, provider, model, tokens_total, estimated_cost);

-- =====================================================
-- EXPRESSION INDEXES FOR COMPUTED VALUES
-- =====================================================

-- Index on workflow completion percentage calculation
CREATE INDEX IF NOT EXISTS idx_workflows_completion_rate 
ON public.workflows((completed_phases::DECIMAL / total_phases::DECIMAL)) 
WHERE status IN ('active', 'completed');

-- Index on AI interaction cost per token
CREATE INDEX IF NOT EXISTS idx_ai_interactions_cost_efficiency 
ON public.ai_interactions((estimated_cost / NULLIF(tokens_total, 0))) 
WHERE status = 'completed' AND tokens_total > 0 AND estimated_cost > 0;

-- Index on research query success rate
CREATE INDEX IF NOT EXISTS idx_research_queries_success_rate 
ON public.research_queries((relevant_results_count::DECIMAL / NULLIF(total_results_found, 0))) 
WHERE status = 'completed' AND total_results_found > 0;

-- =====================================================
-- SPECIALIZED INDEXES FOR ANALYTICS
-- =====================================================

-- Time-series indexes for analytics and reporting
CREATE INDEX IF NOT EXISTS idx_ai_interactions_hourly_stats 
ON public.ai_interactions(created_at, provider, status);

CREATE INDEX IF NOT EXISTS idx_tool_usage_daily_stats 
ON public.tool_usage_logs(created_at, tool_name, execution_status);

CREATE INDEX IF NOT EXISTS idx_workflows_monthly_completion 
ON public.workflows(actual_completion_time, status) 
WHERE status = 'completed';

-- User activity patterns
CREATE INDEX IF NOT EXISTS idx_user_activity_patterns 
ON public.ai_interactions(user_id, created_at, interaction_type);

-- =====================================================
-- BTREE INDEXES FOR RANGE QUERIES
-- =====================================================

-- Artifact size management
CREATE INDEX IF NOT EXISTS idx_artifacts_size_management 
ON public.artifacts(file_size, created_at) 
WHERE file_size IS NOT NULL;

-- AI interaction response time analysis
CREATE INDEX IF NOT EXISTS idx_ai_interactions_response_time_analysis 
ON public.ai_interactions(response_time_ms, created_at) 
WHERE response_time_ms IS NOT NULL AND status = 'completed';

-- Tool execution duration tracking
CREATE INDEX IF NOT EXISTS idx_tool_usage_duration_tracking 
ON public.tool_usage_logs(execution_duration, created_at) 
WHERE execution_duration IS NOT NULL;

-- =====================================================
-- HASH INDEXES FOR EQUALITY LOOKUPS
-- =====================================================

-- Content hash lookups for deduplication
CREATE INDEX IF NOT EXISTS idx_artifacts_content_hash_lookup 
ON public.artifacts USING hash(content_hash) 
WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_research_results_content_hash 
ON public.research_query_results USING hash(content_hash) 
WHERE content_hash IS NOT NULL;

-- Session token lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_lookup 
ON public.user_sessions USING hash(session_token);

-- =====================================================
-- MULTICOLUMN STATISTICS FOR QUERY OPTIMIZATION
-- =====================================================

-- Create extended statistics for correlated columns
CREATE STATISTICS IF NOT EXISTS stats_workflows_user_status_progress 
ON user_id, status, progress_percentage 
FROM public.workflows;

CREATE STATISTICS IF NOT EXISTS stats_ai_interactions_provider_model_performance 
ON provider, model, response_time_ms, tokens_total 
FROM public.ai_interactions;

CREATE STATISTICS IF NOT EXISTS stats_artifacts_type_quality_size 
ON artifact_type, quality_score, file_size 
FROM public.artifacts;

-- =====================================================
-- INDEX MAINTENANCE AND MONITORING
-- =====================================================

-- Create function to monitor index usage
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    num_rows BIGINT,
    table_size TEXT,
    index_size TEXT,
    unique_scans BIGINT,
    index_scans BIGINT,
    index_tup_read BIGINT,
    index_tup_fetch BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.schemaname::TEXT,
        t.tablename::TEXT,
        t.indexname::TEXT,
        pg_class.reltuples::BIGINT AS num_rows,
        pg_size_pretty(pg_relation_size(i.indexrelid))::TEXT AS table_size,
        pg_size_pretty(pg_relation_size(t.indexname::regclass))::TEXT AS index_size,
        s.idx_scan AS unique_scans,
        s.idx_scan AS index_scans,
        s.idx_tup_read AS index_tup_read,
        s.idx_tup_fetch AS index_tup_fetch
    FROM pg_indexes t
    LEFT JOIN pg_stat_user_indexes s ON s.indexrelname = t.indexname
    LEFT JOIN pg_index i ON i.indexrelid = s.indexrelid
    LEFT JOIN pg_class ON pg_class.oid = i.indrelid
    WHERE t.schemaname = 'public'
    ORDER BY s.idx_scan DESC NULLS LAST;
END;
$$ language 'plpgsql';

-- Create function to identify missing indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
    table_name TEXT,
    column_names TEXT,
    query_count BIGINT,
    suggestion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Missing index analysis'::TEXT,
        'Run EXPLAIN ANALYZE on slow queries'::TEXT,
        0::BIGINT,
        'Use pg_stat_statements to identify slow queries and create appropriate indexes'::TEXT;
END;
$$ language 'plpgsql';

-- Create function for index maintenance recommendations
CREATE OR REPLACE FUNCTION get_index_maintenance_recommendations()
RETURNS JSONB AS $$
DECLARE
    recommendations JSONB;
    unused_indexes INTEGER;
    large_indexes INTEGER;
    total_index_size BIGINT;
BEGIN
    -- Count unused indexes (no scans in recent period)
    SELECT COUNT(*) INTO unused_indexes
    FROM pg_stat_user_indexes s
    JOIN pg_indexes i ON i.indexname = s.indexrelname
    WHERE i.schemaname = 'public'
    AND s.idx_scan = 0;
    
    -- Count large indexes (> 100MB)
    SELECT COUNT(*) INTO large_indexes
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
    AND pg_relation_size(i.indexname::regclass) > 104857600;
    
    -- Calculate total index size
    SELECT SUM(pg_relation_size(indexname::regclass)) INTO total_index_size
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    recommendations := jsonb_build_object(
        'unused_indexes_count', unused_indexes,
        'large_indexes_count', large_indexes,
        'total_index_size_mb', ROUND(total_index_size::DECIMAL / 1048576, 2),
        'recommendations', CASE
            WHEN unused_indexes > 5 THEN 'Consider dropping unused indexes to improve write performance'
            WHEN large_indexes > 10 THEN 'Monitor large indexes for query optimization opportunities'
            ELSE 'Index usage appears optimal'
        END,
        'generated_at', NOW()
    );
    
    RETURN recommendations;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON FUNCTION get_index_usage_stats() IS 'Returns comprehensive index usage statistics for monitoring';
COMMENT ON FUNCTION suggest_missing_indexes() IS 'Analyzes query patterns to suggest missing indexes';
COMMENT ON FUNCTION get_index_maintenance_recommendations() IS 'Provides index maintenance recommendations based on usage patterns';

-- Create view for easy index monitoring
CREATE OR REPLACE VIEW public.index_performance_summary AS
SELECT 
    i.schemaname,
    i.tablename,
    i.indexname,
    s.idx_scan as scans,
    s.idx_tup_read as tuples_read,
    s.idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(i.indexname::regclass)) as index_size,
    CASE 
        WHEN s.idx_scan = 0 THEN 'UNUSED'
        WHEN s.idx_scan < 100 THEN 'LOW_USAGE'
        WHEN s.idx_scan < 1000 THEN 'MODERATE_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category
FROM pg_stat_user_indexes s
JOIN pg_indexes i ON i.indexname = s.indexrelname
WHERE i.schemaname = 'public'
ORDER BY s.idx_scan DESC;

COMMENT ON VIEW public.index_performance_summary IS 'Summary view of index performance and usage patterns';