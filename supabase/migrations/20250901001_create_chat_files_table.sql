-- =====================================================================================
-- Chat Files Table Migration - Task 04 File Upload System
-- =====================================================================================
--
-- PURPOSE:
-- Extends existing chat persistence tables with file attachment support
-- Implements AI SDK v5 compliant file storage for academic document uploads
-- Integrates with existing message.parts structure for UI compatibility
--
-- COMPLIANCE:
-- - AI SDK v5 message.parts patterns for file attachments
-- - UIMessage format compatibility with file data
-- - Academic workflow integration with document processing
--
-- INTEGRATION POINTS:
-- - Links to existing chat_messages table through parts JSONB column
-- - Connects with conversations table for file context
-- - Utilizes existing RLS policy patterns for security
-- - Integrates with Supabase Storage for actual file data
--
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- CHAT_FILES TABLE
-- Stores metadata for files attached to chat messages
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.chat_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    storage_path TEXT NOT NULL,
    upload_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Academic document metadata
    academic_content JSONB DEFAULT '{}'::jsonb,
    
    -- Processing status and results
    processing_status TEXT DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
    processing_results JSONB DEFAULT '{}'::jsonb,
    
    -- Standard audit fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_files_conversation_id ON public.chat_files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_message_id ON public.chat_files(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_filename ON public.chat_files(filename);
CREATE INDEX IF NOT EXISTS idx_chat_files_file_type ON public.chat_files(file_type);
CREATE INDEX IF NOT EXISTS idx_chat_files_processing_status ON public.chat_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_chat_files_upload_date ON public.chat_files(upload_date DESC);

-- Add JSONB GIN indexes for efficient metadata queries
CREATE INDEX IF NOT EXISTS idx_chat_files_academic_content ON public.chat_files USING GIN(academic_content);
CREATE INDEX IF NOT EXISTS idx_chat_files_processing_results ON public.chat_files USING GIN(processing_results);

-- =====================================================================================
-- SUPABASE STORAGE BUCKET
-- Create storage bucket for academic files
-- =====================================================================================

-- Insert storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'academic-files',
    'academic-files', 
    false, 
    52428800, -- 50MB limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'application/rtf'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================================
-- DATABASE FUNCTIONS FOR FILE OPERATIONS
-- =====================================================================================

-- Function to get files for a conversation
CREATE OR REPLACE FUNCTION get_conversation_files(
    conversation_id_param UUID
)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT,
    upload_date TIMESTAMPTZ,
    academic_content JSONB,
    processing_status TEXT,
    processing_results JSONB,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.filename,
        f.file_type,
        f.file_size,
        f.storage_path,
        f.upload_date,
        f.academic_content,
        f.processing_status,
        f.processing_results,
        f.created_at
    FROM public.chat_files f
    WHERE f.conversation_id = conversation_id_param
    ORDER BY f.upload_date DESC;
END;
$$;

-- Function to get files for a specific message
CREATE OR REPLACE FUNCTION get_message_files(
    message_id_param UUID
)
RETURNS TABLE (
    id UUID,
    filename TEXT,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT,
    academic_content JSONB,
    processing_status TEXT,
    processing_results JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.filename,
        f.file_type,
        f.file_size,
        f.storage_path,
        f.academic_content,
        f.processing_status,
        f.processing_results
    FROM public.chat_files f
    WHERE f.message_id = message_id_param
    ORDER BY f.upload_date ASC;
END;
$$;

-- Function to update file processing status
CREATE OR REPLACE FUNCTION update_file_processing_status(
    file_id_param UUID,
    status_param TEXT,
    results_param JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.chat_files
    SET 
        processing_status = status_param,
        processing_results = results_param,
        updated_at = NOW()
    WHERE id = file_id_param;
    
    RETURN FOUND;
END;
$$;

-- Function to clean up orphaned files (files without corresponding messages)
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Delete files that reference non-existent messages
    DELETE FROM public.chat_files f
    WHERE f.message_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM public.chat_messages m 
        WHERE m.id = f.message_id
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Delete files that reference non-existent conversations
    DELETE FROM public.chat_files f
    WHERE f.conversation_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = f.conversation_id
    );
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$;

-- =====================================================================================
-- UPDATE TRIGGERS
-- =====================================================================================

-- Add updated_at trigger for chat_files
CREATE TRIGGER update_chat_files_updated_at
    BEFORE UPDATE ON public.chat_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- EXTEND EXISTING CHAT_MESSAGES TABLE
-- Add file_count column for quick file attachment tracking
-- =====================================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='chat_messages' AND column_name='file_count') THEN
        ALTER TABLE public.chat_messages 
        ADD COLUMN file_count INTEGER DEFAULT 0 CHECK (file_count >= 0);
        
        CREATE INDEX IF NOT EXISTS idx_chat_messages_file_count 
        ON public.chat_messages(file_count) WHERE file_count > 0;
    END IF;
END $$;

-- Function to update message file count
CREATE OR REPLACE FUNCTION update_message_file_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.chat_messages 
        SET file_count = file_count + 1
        WHERE id = NEW.message_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.chat_messages 
        SET file_count = GREATEST(file_count - 1, 0)
        WHERE id = OLD.message_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Create triggers for automatic file count updates
DROP TRIGGER IF EXISTS trigger_update_file_count_insert ON public.chat_files;
CREATE TRIGGER trigger_update_file_count_insert
    AFTER INSERT ON public.chat_files
    FOR EACH ROW
    EXECUTE FUNCTION update_message_file_count();

DROP TRIGGER IF EXISTS trigger_update_file_count_delete ON public.chat_files;
CREATE TRIGGER trigger_update_file_count_delete
    AFTER DELETE ON public.chat_files
    FOR EACH ROW
    EXECUTE FUNCTION update_message_file_count();

-- =====================================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON TABLE public.chat_files IS 'File attachments for chat messages - AI SDK v5 compliant';
COMMENT ON COLUMN public.chat_files.id IS 'File ID - used in AI SDK file tools';
COMMENT ON COLUMN public.chat_files.storage_path IS 'Path in Supabase Storage academic-files bucket';
COMMENT ON COLUMN public.chat_files.academic_content IS 'Academic metadata: document_type, subject_area, author, etc.';
COMMENT ON COLUMN public.chat_files.processing_status IS 'File processing status for AI analysis';
COMMENT ON COLUMN public.chat_files.processing_results IS 'Results from AI document processing';

COMMENT ON FUNCTION get_conversation_files IS 'Get all files for a conversation';
COMMENT ON FUNCTION get_message_files IS 'Get all files attached to a specific message';
COMMENT ON FUNCTION update_file_processing_status IS 'Update file processing status and results';
COMMENT ON FUNCTION cleanup_orphaned_files IS 'Clean up files with broken references';

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify table and storage bucket creation
DO $$
DECLARE
    table_exists BOOLEAN;
    bucket_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'chat_files'
    ) INTO table_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'academic-files'
    ) INTO bucket_exists;
    
    IF table_exists AND bucket_exists THEN
        RAISE NOTICE '✅ Chat files table and storage bucket created successfully';
    ELSE
        RAISE WARNING '⚠️ Table exists: %, Bucket exists: %', table_exists, bucket_exists;
    END IF;
END $$;