-- Migration: Create Artifact Metadata Table
-- Description: Extended metadata and search indexing for artifacts
-- Author: Database Architect
-- Date: 2025-01-25

-- Create metadata category enum
CREATE TYPE metadata_category AS ENUM (
    'content_analysis',
    'quality_metrics',
    'citation_data',
    'processing_info',
    'user_annotations',
    'ai_analysis',
    'workflow_context',
    'collaboration_data'
);

-- Create artifact_metadata table
CREATE TABLE IF NOT EXISTS public.artifact_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
    artifact_version_id UUID NULL REFERENCES public.artifact_versions(id) ON DELETE CASCADE,
    category metadata_category NOT NULL,
    metadata_key VARCHAR(200) NOT NULL,
    metadata_value JSONB NOT NULL,
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'object', 'array')),
    is_searchable BOOLEAN DEFAULT true NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    computed_by VARCHAR(100) NULL, -- 'ai', 'user', 'system', 'external_api'
    computation_confidence DECIMAL(3,2) CHECK (computation_confidence >= 0.0 AND computation_confidence <= 1.0),
    source_reference TEXT NULL,
    expires_at TIMESTAMPTZ NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_artifact_id ON public.artifact_metadata(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_version_id ON public.artifact_metadata(artifact_version_id);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_category ON public.artifact_metadata(category);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_key ON public.artifact_metadata(metadata_key);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_data_type ON public.artifact_metadata(data_type);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_is_searchable ON public.artifact_metadata(is_searchable);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_is_public ON public.artifact_metadata(is_public);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_computed_by ON public.artifact_metadata(computed_by);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_created_at ON public.artifact_metadata(created_at);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_lookup ON public.artifact_metadata(artifact_id, category, metadata_key);
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_searchable ON public.artifact_metadata(is_searchable, category, data_type) WHERE is_searchable = true;
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_public ON public.artifact_metadata(is_public, category) WHERE is_public = true;

-- Create GIN index for JSONB metadata values
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_value ON public.artifact_metadata USING gin(metadata_value);

-- Create full text search index for searchable metadata
CREATE INDEX IF NOT EXISTS idx_artifact_metadata_search ON public.artifact_metadata USING gin(
    to_tsvector('simple', 
        coalesce(metadata_key, '') || ' ' || 
        coalesce(metadata_value::text, '')
    )
) WHERE is_searchable = true;

-- Create unique constraint for metadata keys per artifact
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifact_metadata_unique_key 
ON public.artifact_metadata(artifact_id, category, metadata_key);

-- Create updated_at trigger
CREATE TRIGGER update_artifact_metadata_updated_at
    BEFORE UPDATE ON public.artifact_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-extract content metadata
CREATE OR REPLACE FUNCTION extract_content_metadata()
RETURNS TRIGGER AS $$
DECLARE
    content_stats JSONB;
    word_count INTEGER;
    char_count INTEGER;
    paragraph_count INTEGER;
BEGIN
    -- Auto-extract content statistics for text content
    IF NEW.structured_content IS NOT NULL AND NEW.structured_content ? 'content' THEN
        -- Calculate basic statistics
        word_count := array_length(string_to_array(NEW.structured_content->>'content', ' '), 1);
        char_count := length(NEW.structured_content->>'content');
        paragraph_count := array_length(string_to_array(NEW.structured_content->>'content', E'\n\n'), 1);
        
        content_stats := jsonb_build_object(
            'word_count', word_count,
            'character_count', char_count,
            'paragraph_count', paragraph_count,
            'estimated_reading_time_minutes', CEIL(word_count / 200.0),
            'extracted_at', NOW()
        );
        
        -- Insert or update content analysis metadata
        INSERT INTO public.artifact_metadata (
            artifact_id,
            category,
            metadata_key,
            metadata_value,
            data_type,
            computed_by,
            computation_confidence
        ) VALUES (
            NEW.id,
            'content_analysis',
            'statistics',
            content_stats,
            'object',
            'system',
            1.0
        ) ON CONFLICT (artifact_id, category, metadata_key) 
        DO UPDATE SET
            metadata_value = content_stats,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-extracting metadata
CREATE TRIGGER extract_artifact_metadata
    AFTER INSERT OR UPDATE ON public.artifacts
    FOR EACH ROW
    WHEN (NEW.structured_content IS NOT NULL)
    EXECUTE FUNCTION extract_content_metadata();

-- Create function to get metadata by category
CREATE OR REPLACE FUNCTION get_artifact_metadata(
    artifact_uuid UUID,
    category_filter metadata_category DEFAULT NULL,
    include_private BOOLEAN DEFAULT false
)
RETURNS TABLE(
    category metadata_category,
    metadata_key VARCHAR,
    metadata_value JSONB,
    data_type VARCHAR,
    computed_by VARCHAR,
    computation_confidence DECIMAL,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.category,
        am.metadata_key,
        am.metadata_value,
        am.data_type,
        am.computed_by,
        am.computation_confidence,
        am.created_at
    FROM public.artifact_metadata am
    WHERE am.artifact_id = artifact_uuid
    AND (category_filter IS NULL OR am.category = category_filter)
    AND (include_private = true OR am.is_public = true)
    AND (am.expires_at IS NULL OR am.expires_at > NOW())
    ORDER BY am.category, am.metadata_key;
END;
$$ language 'plpgsql';

-- Create function to search artifacts by metadata
CREATE OR REPLACE FUNCTION search_artifacts_by_metadata(
    search_term TEXT,
    category_filter metadata_category DEFAULT NULL,
    user_id_filter UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
    artifact_id UUID,
    artifact_name VARCHAR,
    artifact_type artifact_type,
    matched_metadata JSONB,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.artifact_type,
        jsonb_agg(
            jsonb_build_object(
                'key', am.metadata_key,
                'value', am.metadata_value,
                'category', am.category
            )
        ) as matched_metadata,
        ts_rank(
            to_tsvector('simple', am.metadata_key || ' ' || am.metadata_value::text),
            plainto_tsquery('simple', search_term)
        ) as relevance_score
    FROM public.artifacts a
    JOIN public.artifact_metadata am ON a.id = am.artifact_id
    WHERE am.is_searchable = true
    AND (category_filter IS NULL OR am.category = category_filter)
    AND (user_id_filter IS NULL OR a.user_id = user_id_filter)
    AND (am.expires_at IS NULL OR am.expires_at > NOW())
    AND to_tsvector('simple', am.metadata_key || ' ' || am.metadata_value::text) @@ plainto_tsquery('simple', search_term)
    GROUP BY a.id, a.name, a.artifact_type
    ORDER BY relevance_score DESC
    LIMIT limit_count;
END;
$$ language 'plpgsql';

-- Create function to aggregate quality metrics
CREATE OR REPLACE FUNCTION get_artifact_quality_summary(artifact_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    quality_summary JSONB;
BEGIN
    SELECT jsonb_object_agg(
        metadata_key,
        metadata_value
    ) INTO quality_summary
    FROM public.artifact_metadata
    WHERE artifact_id = artifact_uuid
    AND category = 'quality_metrics'
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN COALESCE(quality_summary, '{}'::jsonb);
END;
$$ language 'plpgsql';

-- Create function to clean up expired metadata
CREATE OR REPLACE FUNCTION cleanup_expired_metadata()
RETURNS void AS $$
BEGIN
    -- Delete expired metadata
    DELETE FROM public.artifact_metadata
    WHERE expires_at IS NOT NULL 
    AND expires_at <= NOW();
    
    -- Clean up metadata for deleted artifacts (should be handled by cascade, but safety check)
    DELETE FROM public.artifact_metadata
    WHERE artifact_id NOT IN (SELECT id FROM public.artifacts);
END;
$$ language 'plpgsql';

-- Create function to update metadata value with validation
CREATE OR REPLACE FUNCTION update_artifact_metadata(
    artifact_uuid UUID,
    metadata_category metadata_category,
    metadata_key_param VARCHAR,
    metadata_value_param JSONB,
    created_by_param UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    success BOOLEAN := false;
BEGIN
    INSERT INTO public.artifact_metadata (
        artifact_id,
        category,
        metadata_key,
        metadata_value,
        data_type,
        created_by
    ) VALUES (
        artifact_uuid,
        metadata_category,
        metadata_key_param,
        metadata_value_param,
        jsonb_typeof(metadata_value_param),
        created_by_param
    ) ON CONFLICT (artifact_id, category, metadata_key)
    DO UPDATE SET
        metadata_value = metadata_value_param,
        data_type = jsonb_typeof(metadata_value_param),
        updated_at = NOW();
    
    success := FOUND;
    RETURN success;
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.artifact_metadata ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.artifact_metadata IS 'Extended searchable metadata for artifacts';
COMMENT ON COLUMN public.artifact_metadata.metadata_key IS 'Unique key for metadata within category and artifact';
COMMENT ON COLUMN public.artifact_metadata.metadata_value IS 'JSON metadata value (flexible schema)';
COMMENT ON COLUMN public.artifact_metadata.is_searchable IS 'Whether to include in full-text search index';
COMMENT ON COLUMN public.artifact_metadata.computed_by IS 'Source of metadata (ai, user, system, external_api)';
COMMENT ON COLUMN public.artifact_metadata.computation_confidence IS 'Confidence level in computed metadata (0.0-1.0)';
COMMENT ON COLUMN public.artifact_metadata.expires_at IS 'When this metadata expires and should be cleaned up';