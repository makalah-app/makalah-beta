-- Migration: Create Research Queries Table
-- Description: Logging and tracking of research queries with source management
-- Author: Database Architect
-- Date: 2025-01-25

-- Create research query type enum
CREATE TYPE research_query_type AS ENUM (
    'web_search',
    'academic_database',
    'literature_review',
    'citation_lookup',
    'fact_verification',
    'trend_analysis',
    'expert_opinion',
    'statistical_data',
    'regulatory_info',
    'patent_search'
);

-- Create query status enum  
CREATE TYPE research_query_status AS ENUM (
    'pending',
    'executing',
    'completed',
    'failed',
    'cancelled',
    'rate_limited',
    'no_results'
);

-- Create source credibility enum
CREATE TYPE source_credibility AS ENUM (
    'very_high',    -- Peer-reviewed, authoritative sources
    'high',         -- Reputable publications, verified data
    'medium',       -- General websites, news sources
    'low',          -- Unverified sources, opinions
    'unknown'       -- Credibility not assessed
);

-- Create research_queries table
CREATE TABLE IF NOT EXISTS public.research_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NULL REFERENCES public.workflows(id) ON DELETE SET NULL,
    phase_id UUID NULL REFERENCES public.workflow_phases(id) ON DELETE SET NULL,
    ai_interaction_id UUID NULL REFERENCES public.ai_interactions(id) ON DELETE CASCADE,
    tool_usage_id UUID NULL REFERENCES public.tool_usage_logs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_type research_query_type NOT NULL,
    status research_query_status DEFAULT 'pending' NOT NULL,
    search_provider VARCHAR(100) NULL, -- 'google', 'bing', 'semantic_scholar', 'pubmed'
    search_parameters JSONB DEFAULT '{}'::jsonb, -- Search filters, date ranges, etc.
    query_refinements TEXT[] NULL, -- Track query evolution
    parent_query_id UUID NULL REFERENCES public.research_queries(id),
    related_queries UUID[] NULL, -- Array of related query IDs
    -- Execution details
    executed_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    execution_duration INTERVAL NULL,
    api_requests_made INTEGER DEFAULT 0,
    rate_limit_hits INTEGER DEFAULT 0,
    -- Results metadata
    total_results_found INTEGER DEFAULT 0,
    relevant_results_count INTEGER DEFAULT 0,
    results_processed INTEGER DEFAULT 0,
    unique_sources_count INTEGER DEFAULT 0,
    avg_source_credibility DECIMAL(3,2) CHECK (avg_source_credibility >= 1.0 AND avg_source_credibility <= 5.0),
    -- Quality assessment
    query_relevance_score DECIMAL(3,2) CHECK (query_relevance_score >= 0.0 AND query_relevance_score <= 1.0),
    results_quality_score DECIMAL(3,2) CHECK (results_quality_score >= 0.0 AND results_quality_score <= 1.0),
    source_diversity_score DECIMAL(3,2) CHECK (source_diversity_score >= 0.0 AND source_diversity_score <= 1.0),
    bias_detection_score DECIMAL(3,2) CHECK (bias_detection_score >= 0.0 AND bias_detection_score <= 1.0),
    -- Error handling
    error_message TEXT NULL,
    error_type VARCHAR(100) NULL,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    -- Cost and performance
    estimated_cost DECIMAL(10,6) NULL,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    -- Context and metadata
    research_context JSONB DEFAULT '{}'::jsonb,
    academic_domain VARCHAR(200) NULL,
    geographic_scope TEXT[] NULL, -- Countries/regions of interest
    temporal_scope JSONB NULL, -- Date ranges, periods of interest
    language_preferences TEXT[] DEFAULT '{"en", "id"}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create research_query_results table for storing individual search results
CREATE TABLE IF NOT EXISTS public.research_query_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    research_query_id UUID NOT NULL REFERENCES public.research_queries(id) ON DELETE CASCADE,
    result_rank INTEGER NOT NULL, -- Position in search results (1-based)
    title TEXT NOT NULL,
    url TEXT NULL,
    description TEXT NULL,
    content_snippet TEXT NULL,
    content_full TEXT NULL, -- Full content if retrieved
    source_name VARCHAR(500) NULL,
    source_domain VARCHAR(200) NULL,
    source_credibility source_credibility DEFAULT 'unknown' NOT NULL,
    publication_date TIMESTAMPTZ NULL,
    author_names TEXT[] NULL,
    author_affiliations TEXT[] NULL,
    document_type VARCHAR(100) NULL, -- 'article', 'paper', 'report', 'webpage', 'book'
    citation_count INTEGER NULL,
    peer_reviewed BOOLEAN NULL,
    open_access BOOLEAN NULL,
    language_code VARCHAR(10) NULL,
    -- Content analysis
    relevance_score DECIMAL(3,2) CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
    quality_indicators JSONB DEFAULT '{}'::jsonb, -- Citations, impact factor, etc.
    content_categories TEXT[] NULL, -- Topics, subjects covered
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
    objectivity_score DECIMAL(3,2) CHECK (objectivity_score >= 0.0 AND objectivity_score <= 1.0),
    -- Usage tracking
    selected_for_citation BOOLEAN DEFAULT false NOT NULL,
    used_in_content BOOLEAN DEFAULT false NOT NULL,
    user_bookmark BOOLEAN DEFAULT false NOT NULL,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_notes TEXT NULL,
    -- Technical metadata
    content_hash VARCHAR(64) NULL, -- For deduplication
    retrieval_method VARCHAR(100) NULL, -- 'api', 'scraping', 'manual'
    processing_status VARCHAR(50) DEFAULT 'raw' CHECK (processing_status IN ('raw', 'processed', 'analyzed', 'verified', 'rejected')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for research_queries
CREATE INDEX IF NOT EXISTS idx_research_queries_workflow_id ON public.research_queries(workflow_id);
CREATE INDEX IF NOT EXISTS idx_research_queries_phase_id ON public.research_queries(phase_id);
CREATE INDEX IF NOT EXISTS idx_research_queries_ai_interaction_id ON public.research_queries(ai_interaction_id);
CREATE INDEX IF NOT EXISTS idx_research_queries_tool_usage_id ON public.research_queries(tool_usage_id);
CREATE INDEX IF NOT EXISTS idx_research_queries_user_id ON public.research_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_research_queries_query_type ON public.research_queries(query_type);
CREATE INDEX IF NOT EXISTS idx_research_queries_status ON public.research_queries(status);
CREATE INDEX IF NOT EXISTS idx_research_queries_search_provider ON public.research_queries(search_provider);
CREATE INDEX IF NOT EXISTS idx_research_queries_parent_query_id ON public.research_queries(parent_query_id);
CREATE INDEX IF NOT EXISTS idx_research_queries_academic_domain ON public.research_queries(academic_domain);
CREATE INDEX IF NOT EXISTS idx_research_queries_executed_at ON public.research_queries(executed_at);
CREATE INDEX IF NOT EXISTS idx_research_queries_created_at ON public.research_queries(created_at);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_research_queries_user_domain ON public.research_queries(user_id, academic_domain, created_at);
CREATE INDEX IF NOT EXISTS idx_research_queries_workflow_type ON public.research_queries(workflow_id, query_type, status);

-- Create GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_research_queries_search_parameters ON public.research_queries USING gin(search_parameters);
CREATE INDEX IF NOT EXISTS idx_research_queries_performance_metrics ON public.research_queries USING gin(performance_metrics);
CREATE INDEX IF NOT EXISTS idx_research_queries_research_context ON public.research_queries USING gin(research_context);
CREATE INDEX IF NOT EXISTS idx_research_queries_related_queries ON public.research_queries USING gin(related_queries);
CREATE INDEX IF NOT EXISTS idx_research_queries_geographic_scope ON public.research_queries USING gin(geographic_scope);
CREATE INDEX IF NOT EXISTS idx_research_queries_language_preferences ON public.research_queries USING gin(language_preferences);

-- Create full text search index for query text
CREATE INDEX IF NOT EXISTS idx_research_queries_query_search ON public.research_queries USING gin(
    to_tsvector('simple', query_text)
);

-- Create indexes for research_query_results
CREATE INDEX IF NOT EXISTS idx_research_query_results_query_id ON public.research_query_results(research_query_id);
CREATE INDEX IF NOT EXISTS idx_research_query_results_result_rank ON public.research_query_results(result_rank);
CREATE INDEX IF NOT EXISTS idx_research_query_results_source_credibility ON public.research_query_results(source_credibility);
CREATE INDEX IF NOT EXISTS idx_research_query_results_source_domain ON public.research_query_results(source_domain);
CREATE INDEX IF NOT EXISTS idx_research_query_results_document_type ON public.research_query_results(document_type);
CREATE INDEX IF NOT EXISTS idx_research_query_results_publication_date ON public.research_query_results(publication_date);
CREATE INDEX IF NOT EXISTS idx_research_query_results_relevance_score ON public.research_query_results(relevance_score);
CREATE INDEX IF NOT EXISTS idx_research_query_results_selected_citation ON public.research_query_results(selected_for_citation);
CREATE INDEX IF NOT EXISTS idx_research_query_results_used_content ON public.research_query_results(used_in_content);
CREATE INDEX IF NOT EXISTS idx_research_query_results_user_bookmark ON public.research_query_results(user_bookmark);
CREATE INDEX IF NOT EXISTS idx_research_query_results_processing_status ON public.research_query_results(processing_status);
CREATE INDEX IF NOT EXISTS idx_research_query_results_content_hash ON public.research_query_results(content_hash);
CREATE INDEX IF NOT EXISTS idx_research_query_results_created_at ON public.research_query_results(created_at);

-- Create composite indexes for research_query_results
CREATE INDEX IF NOT EXISTS idx_research_query_results_query_rank ON public.research_query_results(research_query_id, result_rank);
CREATE INDEX IF NOT EXISTS idx_research_query_results_quality_lookup ON public.research_query_results(research_query_id, relevance_score, source_credibility);

-- Create GIN indexes for JSONB and array columns in results
CREATE INDEX IF NOT EXISTS idx_research_query_results_quality_indicators ON public.research_query_results USING gin(quality_indicators);
CREATE INDEX IF NOT EXISTS idx_research_query_results_content_categories ON public.research_query_results USING gin(content_categories);
CREATE INDEX IF NOT EXISTS idx_research_query_results_author_names ON public.research_query_results USING gin(author_names);
CREATE INDEX IF NOT EXISTS idx_research_query_results_metadata ON public.research_query_results USING gin(metadata);

-- Create full text search index for research results content
CREATE INDEX IF NOT EXISTS idx_research_query_results_content_search ON public.research_query_results USING gin(
    to_tsvector('simple', 
        coalesce(title, '') || ' ' || 
        coalesce(description, '') || ' ' || 
        coalesce(content_snippet, '')
    )
);

-- Create unique constraint for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_query_results_unique_content 
ON public.research_query_results(research_query_id, content_hash) 
WHERE content_hash IS NOT NULL;

-- Create updated_at triggers
CREATE TRIGGER update_research_queries_updated_at
    BEFORE UPDATE ON public.research_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_query_results_updated_at
    BEFORE UPDATE ON public.research_query_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to manage query execution lifecycle
CREATE OR REPLACE FUNCTION manage_research_query_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Set execution timestamps
    IF OLD.status != 'executing' AND NEW.status = 'executing' AND NEW.executed_at IS NULL THEN
        NEW.executed_at = NOW();
    END IF;
    
    IF OLD.status NOT IN ('completed', 'failed', 'cancelled') 
       AND NEW.status IN ('completed', 'failed', 'cancelled') 
       AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
        
        -- Calculate execution duration
        IF NEW.executed_at IS NOT NULL THEN
            NEW.execution_duration = NEW.completed_at - NEW.executed_at;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create query lifecycle trigger
CREATE TRIGGER manage_research_query_lifecycle_trigger
    BEFORE UPDATE ON public.research_queries
    FOR EACH ROW
    EXECUTE FUNCTION manage_research_query_lifecycle();

-- Create function to calculate query result statistics
CREATE OR REPLACE FUNCTION calculate_query_result_stats()
RETURNS TRIGGER AS $$
DECLARE
    query_stats RECORD;
BEGIN
    -- Calculate statistics for the research query
    SELECT 
        COUNT(*) as total_results,
        COUNT(*) FILTER (WHERE relevance_score >= 0.7) as relevant_results,
        COUNT(DISTINCT source_domain) as unique_sources,
        AVG(
            CASE source_credibility
                WHEN 'very_high' THEN 5.0
                WHEN 'high' THEN 4.0
                WHEN 'medium' THEN 3.0
                WHEN 'low' THEN 2.0
                WHEN 'unknown' THEN 1.0
            END
        ) as avg_credibility,
        AVG(relevance_score) as avg_relevance,
        STDDEV(relevance_score) as relevance_diversity
    INTO query_stats
    FROM public.research_query_results
    WHERE research_query_id = NEW.research_query_id;
    
    -- Update the research query with calculated stats
    UPDATE public.research_queries
    SET 
        total_results_found = query_stats.total_results,
        relevant_results_count = query_stats.relevant_results,
        results_processed = query_stats.total_results,
        unique_sources_count = query_stats.unique_sources,
        avg_source_credibility = query_stats.avg_credibility,
        results_quality_score = query_stats.avg_relevance,
        source_diversity_score = LEAST(query_stats.relevance_diversity * 2, 1.0), -- Normalize to 0-1
        updated_at = NOW()
    WHERE id = NEW.research_query_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update stats when results are added
CREATE TRIGGER calculate_query_stats_on_result_change
    AFTER INSERT OR UPDATE ON public.research_query_results
    FOR EACH ROW
    EXECUTE FUNCTION calculate_query_result_stats();

-- Create function to get research query insights
CREATE OR REPLACE FUNCTION get_research_insights(
    user_uuid UUID DEFAULT NULL,
    academic_domain_filter VARCHAR DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    insights_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_queries', COUNT(*),
        'successful_queries', COUNT(*) FILTER (WHERE status = 'completed'),
        'total_results_found', SUM(total_results_found),
        'avg_results_per_query', AVG(total_results_found),
        'avg_query_quality', AVG(results_quality_score),
        'top_academic_domains', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'domain', academic_domain,
                    'query_count', domain_count,
                    'avg_quality', avg_quality
                ) ORDER BY domain_count DESC
            )
            FROM (
                SELECT 
                    academic_domain,
                    COUNT(*) as domain_count,
                    AVG(results_quality_score) as avg_quality
                FROM public.research_queries rq_inner
                WHERE rq_inner.user_id = COALESCE(user_uuid, rq_inner.user_id)
                AND rq_inner.created_at >= NOW() - (days_back || ' days')::INTERVAL
                AND rq_inner.academic_domain IS NOT NULL
                GROUP BY academic_domain
                LIMIT 10
            ) domain_stats
        ),
        'query_type_distribution', jsonb_object_agg(
            query_type,
            jsonb_build_object(
                'count', query_count,
                'success_rate', success_rate,
                'avg_results', avg_results
            )
        ),
        'source_credibility_breakdown', jsonb_object_agg(
            source_credibility,
            source_count
        ),
        'generated_at', NOW()
    ) INTO insights_result
    FROM (
        SELECT 
            rq.query_type,
            COUNT(*) as query_count,
            COUNT(*) FILTER (WHERE rq.status = 'completed')::DECIMAL / COUNT(*) as success_rate,
            AVG(rq.total_results_found) as avg_results
        FROM public.research_queries rq
        LEFT JOIN public.research_query_results rqr ON rq.id = rqr.research_query_id
        WHERE (user_uuid IS NULL OR rq.user_id = user_uuid)
        AND (academic_domain_filter IS NULL OR rq.academic_domain = academic_domain_filter)
        AND rq.created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY rq.query_type
    ) query_stats
    FULL OUTER JOIN (
        SELECT 
            rqr.source_credibility,
            COUNT(*) as source_count
        FROM public.research_query_results rqr
        JOIN public.research_queries rq ON rqr.research_query_id = rq.id
        WHERE (user_uuid IS NULL OR rq.user_id = user_uuid)
        AND rq.created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY rqr.source_credibility
    ) credibility_stats ON true;
    
    RETURN insights_result;
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.research_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_query_results ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.research_queries IS 'Research queries with tracking and quality assessment';
COMMENT ON COLUMN public.research_queries.query_refinements IS 'Array tracking how query was refined over time';
COMMENT ON COLUMN public.research_queries.related_queries IS 'Array of UUIDs for related research queries';
COMMENT ON COLUMN public.research_queries.bias_detection_score IS 'AI-assessed bias level in results (0.0-1.0)';
COMMENT ON COLUMN public.research_queries.temporal_scope IS 'JSON defining time periods of research interest';

COMMENT ON TABLE public.research_query_results IS 'Individual results from research queries with credibility assessment';
COMMENT ON COLUMN public.research_query_results.source_credibility IS 'Assessed credibility of information source';
COMMENT ON COLUMN public.research_query_results.content_hash IS 'SHA-256 hash for deduplication across queries';
COMMENT ON COLUMN public.research_query_results.quality_indicators IS 'JSON metrics like citation count, impact factor';
COMMENT ON COLUMN public.research_query_results.objectivity_score IS 'Assessment of content objectivity vs opinion (0.0-1.0)';