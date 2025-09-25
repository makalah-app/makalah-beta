-- Migration: Create Artifact Versions Table
-- Description: Detailed version history for artifacts with change tracking
-- Author: Database Architect
-- Date: 2025-01-25

-- Create version action enum
CREATE TYPE version_action AS ENUM (
    'created',
    'updated',
    'renamed',
    'moved',
    'restored',
    'merged',
    'branched'
);

-- Create artifact_versions table
CREATE TABLE IF NOT EXISTS public.artifact_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_name VARCHAR(200) NULL,
    action version_action NOT NULL,
    file_path TEXT NULL, -- Path in Supabase Storage for this version
    file_size BIGINT NULL,
    content_hash VARCHAR(64) NULL,
    structured_content JSONB NULL,
    diff_from_previous JSONB NULL, -- JSON diff from previous version
    change_summary TEXT NULL,
    is_major_version BOOLEAN DEFAULT false NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_via VARCHAR(100) NULL, -- 'ui', 'api', 'ai_generation', 'import'
    parent_version_id UUID NULL REFERENCES public.artifact_versions(id),
    merged_from_versions UUID[] NULL, -- Array of version IDs merged into this version
    rollback_point BOOLEAN DEFAULT false NOT NULL, -- Can rollback to this version
    quality_metrics JSONB DEFAULT '{}'::jsonb,
    performance_data JSONB DEFAULT '{}'::jsonb, -- Processing time, tokens used, etc.
    validation_status VARCHAR(50) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
    validation_errors TEXT[] NULL,
    backup_location TEXT NULL, -- Additional backup path if needed
    retention_period INTERVAL NULL, -- How long to keep this version
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_artifact_versions_artifact_id ON public.artifact_versions(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_version_number ON public.artifact_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_action ON public.artifact_versions(action);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_created_by ON public.artifact_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_created_via ON public.artifact_versions(created_via);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_is_major ON public.artifact_versions(is_major_version);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_rollback_point ON public.artifact_versions(rollback_point);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_validation_status ON public.artifact_versions(validation_status);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_created_at ON public.artifact_versions(created_at);

-- Create composite indexes for version queries
CREATE INDEX IF NOT EXISTS idx_artifact_versions_lookup ON public.artifact_versions(artifact_id, version_number);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_recent ON public.artifact_versions(artifact_id, created_at DESC);

-- Create GIN indexes for JSONB and array columns
CREATE INDEX IF NOT EXISTS idx_artifact_versions_structured_content ON public.artifact_versions USING gin(structured_content);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_diff ON public.artifact_versions USING gin(diff_from_previous);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_quality ON public.artifact_versions USING gin(quality_metrics);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_performance ON public.artifact_versions USING gin(performance_data);
CREATE INDEX IF NOT EXISTS idx_artifact_versions_merged_from ON public.artifact_versions USING gin(merged_from_versions);

-- Create unique constraint for artifact version numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifact_versions_unique_number 
ON public.artifact_versions(artifact_id, version_number);

-- Create function to manage version creation
CREATE OR REPLACE FUNCTION create_artifact_version()
RETURNS TRIGGER AS $$
DECLARE
    prev_version_record public.artifact_versions%ROWTYPE;
    new_version_num INTEGER;
BEGIN
    -- Get the latest version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO new_version_num
    FROM public.artifact_versions 
    WHERE artifact_id = NEW.id;
    
    -- Get previous version for diff calculation
    SELECT * INTO prev_version_record
    FROM public.artifact_versions 
    WHERE artifact_id = NEW.id 
    ORDER BY version_number DESC 
    LIMIT 1;
    
    -- Create new version record
    INSERT INTO public.artifact_versions (
        artifact_id,
        version_number,
        action,
        file_path,
        file_size,
        content_hash,
        structured_content,
        created_by,
        created_via,
        parent_version_id,
        is_major_version,
        rollback_point
    ) VALUES (
        NEW.id,
        new_version_num,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'created'::version_action
            WHEN OLD.name != NEW.name THEN 'renamed'::version_action
            ELSE 'updated'::version_action
        END,
        NEW.file_path,
        NEW.file_size,
        NEW.content_hash,
        NEW.structured_content,
        NEW.user_id,
        'ui', -- Default via UI, can be updated by application
        CASE 
            WHEN prev_version_record.id IS NOT NULL THEN prev_version_record.id
            ELSE NULL
        END,
        -- Major version if version jumps by 1.0 or more
        (new_version_num % 10 = 1),
        true -- Allow rollback to any version by default
    );
    
    -- Update total versions count
    NEW.total_versions = new_version_num;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create version tracking trigger
CREATE TRIGGER create_artifact_version_on_change
    AFTER INSERT OR UPDATE ON public.artifacts
    FOR EACH ROW
    WHEN (NEW.file_path IS NOT NULL OR NEW.structured_content IS NOT NULL)
    EXECUTE FUNCTION create_artifact_version();

-- Create function to calculate content diff
CREATE OR REPLACE FUNCTION calculate_version_diff(
    artifact_uuid UUID,
    from_version INTEGER,
    to_version INTEGER
)
RETURNS JSONB AS $$
DECLARE
    from_content JSONB;
    to_content JSONB;
    diff_result JSONB;
BEGIN
    -- Get content from both versions
    SELECT structured_content INTO from_content
    FROM public.artifact_versions
    WHERE artifact_id = artifact_uuid AND version_number = from_version;
    
    SELECT structured_content INTO to_content
    FROM public.artifact_versions
    WHERE artifact_id = artifact_uuid AND version_number = to_version;
    
    -- Simple diff structure (can be enhanced with actual diff algorithm)
    diff_result = jsonb_build_object(
        'from_version', from_version,
        'to_version', to_version,
        'changes_detected', (from_content != to_content),
        'content_size_change', 
            CASE 
                WHEN from_content IS NULL THEN jsonb_typeof(to_content)
                WHEN to_content IS NULL THEN 'deleted'
                ELSE (length(to_content::text) - length(from_content::text))::text
            END,
        'generated_at', NOW()
    );
    
    RETURN diff_result;
END;
$$ language 'plpgsql';

-- Create function to get version history
CREATE OR REPLACE FUNCTION get_artifact_version_history(
    artifact_uuid UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    version_number INTEGER,
    version_name VARCHAR,
    action version_action,
    file_size BIGINT,
    change_summary TEXT,
    is_major_version BOOLEAN,
    created_by UUID,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        av.version_number,
        av.version_name,
        av.action,
        av.file_size,
        av.change_summary,
        av.is_major_version,
        av.created_by,
        av.created_at
    FROM public.artifact_versions av
    WHERE av.artifact_id = artifact_uuid
    ORDER BY av.version_number DESC
    LIMIT limit_count;
END;
$$ language 'plpgsql';

-- Create function to rollback artifact to version
CREATE OR REPLACE FUNCTION rollback_artifact_to_version(
    artifact_uuid UUID,
    target_version INTEGER,
    rollback_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    version_record public.artifact_versions%ROWTYPE;
    success BOOLEAN := false;
BEGIN
    -- Get target version data
    SELECT * INTO version_record
    FROM public.artifact_versions
    WHERE artifact_id = artifact_uuid 
    AND version_number = target_version
    AND rollback_point = true;
    
    IF version_record.id IS NOT NULL THEN
        -- Update artifact with version data
        UPDATE public.artifacts
        SET 
            file_path = version_record.file_path,
            file_size = version_record.file_size,
            content_hash = version_record.content_hash,
            structured_content = version_record.structured_content,
            user_id = rollback_user_id,
            updated_at = NOW()
        WHERE id = artifact_uuid;
        
        -- Create rollback version entry
        INSERT INTO public.artifact_versions (
            artifact_id,
            version_number,
            version_name,
            action,
            file_path,
            file_size,
            content_hash,
            structured_content,
            change_summary,
            created_by,
            created_via,
            parent_version_id
        ) SELECT
            artifact_uuid,
            COALESCE(MAX(version_number), 0) + 1,
            'Rollback to v' || target_version,
            'restored'::version_action,
            version_record.file_path,
            version_record.file_size,
            version_record.content_hash,
            version_record.structured_content,
            'Rolled back to version ' || target_version,
            rollback_user_id,
            'rollback',
            version_record.id
        FROM public.artifact_versions
        WHERE artifact_id = artifact_uuid;
        
        success := true;
    END IF;
    
    RETURN success;
END;
$$ language 'plpgsql';

-- Create function to clean up old versions
CREATE OR REPLACE FUNCTION cleanup_old_artifact_versions()
RETURNS void AS $$
BEGIN
    -- Delete expired versions
    DELETE FROM public.artifact_versions
    WHERE expires_at IS NOT NULL 
    AND expires_at <= NOW();
    
    -- Keep only last 50 versions per artifact (except major versions and rollback points)
    WITH ranked_versions AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY artifact_id ORDER BY version_number DESC) as rn
        FROM public.artifact_versions
        WHERE is_major_version = false 
        AND rollback_point = false
    )
    DELETE FROM public.artifact_versions
    WHERE id IN (
        SELECT id FROM ranked_versions WHERE rn > 50
    );
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.artifact_versions ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.artifact_versions IS 'Complete version history for artifacts with diff tracking';
COMMENT ON COLUMN public.artifact_versions.version_number IS 'Sequential version number starting from 1';
COMMENT ON COLUMN public.artifact_versions.diff_from_previous IS 'JSON diff showing changes from previous version';
COMMENT ON COLUMN public.artifact_versions.is_major_version IS 'Major version milestone (preserves longer)';
COMMENT ON COLUMN public.artifact_versions.rollback_point IS 'Whether this version can be rolled back to';
COMMENT ON COLUMN public.artifact_versions.merged_from_versions IS 'Array of version IDs merged to create this version';
COMMENT ON COLUMN public.artifact_versions.validation_status IS 'Content validation status (valid, invalid, warning)';
COMMENT ON COLUMN public.artifact_versions.retention_period IS 'How long to preserve this version';