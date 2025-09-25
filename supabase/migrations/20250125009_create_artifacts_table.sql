-- Migration: Create Artifacts Table
-- Description: Artifact storage and versioning system with Supabase Storage integration
-- Author: Database Architect
-- Date: 2025-01-25

-- Create artifact type enum
CREATE TYPE artifact_type AS ENUM (
    'research_document',
    'outline',
    'draft_section',
    'final_document',
    'citation_list',
    'reference_material',
    'user_upload',
    'ai_generated',
    'template',
    'backup'
);

-- Create artifact status enum
CREATE TYPE artifact_status AS ENUM (
    'draft',
    'active',
    'archived',
    'deleted',
    'corrupted'
);

-- Create artifacts table
CREATE TABLE IF NOT EXISTS public.artifacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    phase_id UUID NULL REFERENCES public.workflow_phases(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT NULL,
    artifact_type artifact_type NOT NULL,
    status artifact_status DEFAULT 'active' NOT NULL,
    current_version INTEGER DEFAULT 1 NOT NULL,
    total_versions INTEGER DEFAULT 1 NOT NULL,
    file_path TEXT NULL, -- Path in Supabase Storage
    file_size BIGINT NULL, -- Size in bytes
    mime_type VARCHAR(100) NULL,
    content_hash VARCHAR(64) NULL, -- SHA-256 hash for integrity
    content_preview TEXT NULL, -- First 1000 chars for search
    structured_content JSONB NULL, -- Parsed structured data
    tags TEXT[] NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    is_template BOOLEAN DEFAULT false NOT NULL,
    template_category VARCHAR(100) NULL,
    download_count INTEGER DEFAULT 0 NOT NULL,
    last_accessed_at TIMESTAMPTZ NULL,
    parent_artifact_id UUID NULL REFERENCES public.artifacts(id),
    derived_from TEXT[] NULL, -- Array of source artifact IDs
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    processing_status VARCHAR(50) DEFAULT 'completed' CHECK (processing_status IN ('processing', 'completed', 'failed', 'pending')),
    processing_error TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_artifacts_workflow_id ON public.artifacts(workflow_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_phase_id ON public.artifacts(phase_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_user_id ON public.artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON public.artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON public.artifacts(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_current_version ON public.artifacts(current_version);
CREATE INDEX IF NOT EXISTS idx_artifacts_is_public ON public.artifacts(is_public);
CREATE INDEX IF NOT EXISTS idx_artifacts_is_template ON public.artifacts(is_template);
CREATE INDEX IF NOT EXISTS idx_artifacts_template_category ON public.artifacts(template_category);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON public.artifacts(created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_processing_status ON public.artifacts(processing_status);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_artifacts_workflow_type ON public.artifacts(workflow_id, artifact_type, status);
CREATE INDEX IF NOT EXISTS idx_artifacts_user_type ON public.artifacts(user_id, artifact_type, is_public);
CREATE INDEX IF NOT EXISTS idx_artifacts_public_templates ON public.artifacts(is_template, is_public, template_category) WHERE is_template = true AND is_public = true;

-- Create GIN indexes for arrays and JSONB
CREATE INDEX IF NOT EXISTS idx_artifacts_tags ON public.artifacts USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_artifacts_derived_from ON public.artifacts USING gin(derived_from);
CREATE INDEX IF NOT EXISTS idx_artifacts_structured_content ON public.artifacts USING gin(structured_content);
CREATE INDEX IF NOT EXISTS idx_artifacts_metadata ON public.artifacts USING gin(metadata);

-- Create immutable function for artifact text search
CREATE OR REPLACE FUNCTION public.artifact_search_text(name text, description text, content_preview text, tags text[])
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT to_tsvector('simple', 
        coalesce(name, '') || ' ' || 
        coalesce(description, '') || ' ' || 
        coalesce(content_preview, '') || ' ' || 
        coalesce(array_to_string(tags, ' '), '')
    )
$$;

-- Create full text search index using immutable function
CREATE INDEX IF NOT EXISTS idx_artifacts_search ON public.artifacts USING gin(
    public.artifact_search_text(name, description, content_preview, tags)
);

-- Create unique constraint for workflow artifact names
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_unique_name_per_workflow 
ON public.artifacts(workflow_id, name) 
WHERE status != 'deleted';

-- Create updated_at trigger
CREATE TRIGGER update_artifacts_updated_at
    BEFORE UPDATE ON public.artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to manage artifact versioning
CREATE OR REPLACE FUNCTION manage_artifact_versioning()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-increment version number when content changes
    IF TG_OP = 'UPDATE' AND (
        OLD.file_path != NEW.file_path OR 
        OLD.content_hash != NEW.content_hash OR
        OLD.structured_content != NEW.structured_content
    ) THEN
        NEW.current_version = OLD.current_version + 1;
        NEW.total_versions = NEW.current_version;
    END IF;
    
    -- Validate file size limits (100MB default)
    IF NEW.file_size IS NOT NULL AND NEW.file_size > 104857600 THEN
        RAISE EXCEPTION 'File size exceeds 100MB limit: % bytes', NEW.file_size;
    END IF;
    
    -- Auto-generate content preview for text files
    IF NEW.structured_content IS NOT NULL AND NEW.content_preview IS NULL THEN
        NEW.content_preview = LEFT(NEW.structured_content->>'content', 1000);
    END IF;
    
    -- Update processing status based on content
    IF NEW.file_path IS NOT NULL AND OLD.file_path IS NULL THEN
        NEW.processing_status = 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create versioning trigger
CREATE TRIGGER manage_artifacts_versioning
    BEFORE INSERT OR UPDATE ON public.artifacts
    FOR EACH ROW
    EXECUTE FUNCTION manage_artifact_versioning();

-- Create function to update access statistics
CREATE OR REPLACE FUNCTION update_artifact_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.download_count = NEW.download_count + 1;
    NEW.last_accessed_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to get artifact by workflow and type
CREATE OR REPLACE FUNCTION get_workflow_artifacts(
    workflow_uuid UUID,
    artifact_type_filter artifact_type DEFAULT NULL,
    status_filter artifact_status DEFAULT 'active',
    include_versions BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    artifact_type artifact_type,
    current_version INTEGER,
    file_path TEXT,
    file_size BIGINT,
    structured_content JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.artifact_type,
        a.current_version,
        a.file_path,
        a.file_size,
        a.structured_content,
        a.created_at
    FROM public.artifacts a
    WHERE a.workflow_id = workflow_uuid
    AND (artifact_type_filter IS NULL OR a.artifact_type = artifact_type_filter)
    AND (status_filter IS NULL OR a.status = status_filter)
    ORDER BY a.artifact_type, a.name, a.current_version DESC;
END;
$$ language 'plpgsql';

-- Create function to clean up deleted artifacts
CREATE OR REPLACE FUNCTION cleanup_deleted_artifacts()
RETURNS void AS $$
BEGIN
    -- Permanently delete artifacts marked as deleted for more than 30 days
    DELETE FROM public.artifacts
    WHERE status = 'deleted'
    AND updated_at < NOW() - INTERVAL '30 days';
    
    -- Clean up orphaned artifacts (workflow deleted)
    UPDATE public.artifacts
    SET status = 'archived', updated_at = NOW()
    WHERE workflow_id NOT IN (SELECT id FROM public.workflows)
    AND status != 'deleted';
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.artifacts IS 'Artifact storage with versioning and Supabase Storage integration';
COMMENT ON COLUMN public.artifacts.file_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN public.artifacts.content_hash IS 'SHA-256 hash for file integrity verification';
COMMENT ON COLUMN public.artifacts.content_preview IS 'First 1000 characters for search indexing';
COMMENT ON COLUMN public.artifacts.structured_content IS 'JSON parsed content for structured access';
COMMENT ON COLUMN public.artifacts.derived_from IS 'Array of source artifact IDs this was created from';
COMMENT ON COLUMN public.artifacts.quality_score IS 'AI-assessed quality score (0.0-1.0)';
COMMENT ON COLUMN public.artifacts.processing_status IS 'Current processing state of the artifact';