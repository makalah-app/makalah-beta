-- =====================================================================================
-- Chat Files RLS Policies Migration - Task 04 File Upload Security
-- =====================================================================================
--
-- PURPOSE:
-- Implements Row Level Security for file attachments following existing RLS patterns
-- Ensures secure file access control integrated with chat persistence security
-- Maintains compatibility with existing authentication and user management
--
-- COMPLIANCE:
-- - Follows existing RLS patterns from 20250827002_chat_persistence_rls_policies.sql
-- - Integrates with existing user authentication system
-- - Maintains consistency with conversation and message access controls
--
-- INTEGRATION:
-- - Links with existing user-based RLS on conversations and chat_messages
-- - Uses existing auth.uid() patterns for user identification
-- - Follows existing security function patterns
--
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- ENABLE RLS ON CHAT_FILES TABLE
-- =====================================================================================

ALTER TABLE public.chat_files ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- CHAT_FILES RLS POLICIES
-- User can only access files from their own conversations
-- =====================================================================================

-- Policy: Users can view files from their own conversations
CREATE POLICY "Users can view their conversation files"
ON public.chat_files
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = chat_files.conversation_id
        AND c.user_id = auth.uid()
    )
);

-- Policy: Users can insert files to their own conversations
CREATE POLICY "Users can upload files to their conversations"
ON public.chat_files
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = chat_files.conversation_id
        AND c.user_id = auth.uid()
    )
);

-- Policy: Users can update files in their own conversations
CREATE POLICY "Users can update their conversation files"
ON public.chat_files
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = chat_files.conversation_id
        AND c.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = chat_files.conversation_id
        AND c.user_id = auth.uid()
    )
);

-- Policy: Users can delete files from their own conversations
CREATE POLICY "Users can delete their conversation files"
ON public.chat_files
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = chat_files.conversation_id
        AND c.user_id = auth.uid()
    )
);

-- =====================================================================================
-- ADMIN POLICIES FOR CHAT_FILES
-- Admins have full access to all files for moderation and support
-- =====================================================================================

-- Policy: Admins can view all files
CREATE POLICY "Admins can view all files"
ON public.chat_files
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
);

-- Policy: Admins can update all files (for moderation)
CREATE POLICY "Admins can update all files"
ON public.chat_files
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
);

-- Policy: Admins can delete files (for moderation)
CREATE POLICY "Admins can delete files for moderation"
ON public.chat_files
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
);

-- =====================================================================================
-- STORAGE BUCKET RLS POLICIES
-- Secure access to academic-files storage bucket
-- =====================================================================================

-- Policy: Users can view files from their own conversations
CREATE POLICY "Users can view their academic files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'academic-files'
    AND EXISTS (
        SELECT 1 FROM public.chat_files cf
        JOIN public.conversations c ON c.id = cf.conversation_id
        WHERE cf.storage_path = name
        AND c.user_id = auth.uid()
    )
);

-- Policy: Users can upload files to academic-files bucket
CREATE POLICY "Users can upload academic files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'academic-files'
    AND (storage.foldername(name))[1] = 'academic-documents'
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their academic files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'academic-files'
    AND EXISTS (
        SELECT 1 FROM public.chat_files cf
        JOIN public.conversations c ON c.id = cf.conversation_id
        WHERE cf.storage_path = name
        AND c.user_id = auth.uid()
    )
)
WITH CHECK (
    bucket_id = 'academic-files'
    AND EXISTS (
        SELECT 1 FROM public.chat_files cf
        JOIN public.conversations c ON c.id = cf.conversation_id
        WHERE cf.storage_path = name
        AND c.user_id = auth.uid()
    )
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their academic files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'academic-files'
    AND EXISTS (
        SELECT 1 FROM public.chat_files cf
        JOIN public.conversations c ON c.id = cf.conversation_id
        WHERE cf.storage_path = name
        AND c.user_id = auth.uid()
    )
);

-- =====================================================================================
-- ADMIN STORAGE POLICIES
-- Admins have full access to academic files for moderation
-- =====================================================================================

-- Policy: Admins can view all academic files
CREATE POLICY "Admins can view all academic files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'academic-files'
    AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
);

-- Policy: Admins can delete files for moderation
CREATE POLICY "Admins can delete academic files for moderation"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'academic-files'
    AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
);

-- =====================================================================================
-- SECURITY FUNCTIONS FOR FILE VALIDATION
-- =====================================================================================

-- Function to validate file upload permissions
CREATE OR REPLACE FUNCTION validate_file_upload_permission(
    conversation_id_param UUID,
    user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user owns the conversation
    RETURN EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id_param
        AND c.user_id = user_id_param
    );
END;
$$;

-- Function to get user's file upload quota usage
CREATE OR REPLACE FUNCTION get_user_file_usage(
    user_id_param UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    total_files INTEGER,
    total_size_mb NUMERIC,
    files_this_month INTEGER,
    size_this_month_mb NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH user_files AS (
        SELECT cf.*
        FROM public.chat_files cf
        JOIN public.conversations c ON c.id = cf.conversation_id
        WHERE c.user_id = user_id_param
    )
    SELECT 
        COUNT(*)::INTEGER as total_files,
        ROUND(SUM(file_size) / 1048576.0, 2) as total_size_mb,
        COUNT(*) FILTER (WHERE upload_date >= date_trunc('month', CURRENT_DATE))::INTEGER as files_this_month,
        ROUND(
            SUM(file_size) FILTER (WHERE upload_date >= date_trunc('month', CURRENT_DATE)) / 1048576.0, 
            2
        ) as size_this_month_mb
    FROM user_files;
END;
$$;

-- Function to clean up files for deleted conversations (security cleanup)
CREATE OR REPLACE FUNCTION cleanup_conversation_files()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- When a conversation is deleted, mark its files for cleanup
    -- The actual storage cleanup should be handled by a background job
    UPDATE public.chat_files
    SET processing_status = 'error'
    WHERE conversation_id = OLD.id;
    
    RETURN OLD;
END;
$$;

-- Create trigger for conversation cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_conversation_files ON public.conversations;
CREATE TRIGGER trigger_cleanup_conversation_files
    AFTER DELETE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_conversation_files();

-- =====================================================================================
-- GRANT PERMISSIONS
-- =====================================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_file_upload_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_file_usage TO authenticated;

-- =====================================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================================

COMMENT ON POLICY "Users can view their conversation files" ON public.chat_files IS 'RLS: Users can only view files from conversations they own';
COMMENT ON POLICY "Users can upload files to their conversations" ON public.chat_files IS 'RLS: Users can only upload files to their own conversations';
COMMENT ON POLICY "Admins can view all files" ON public.chat_files IS 'RLS: Admins have full read access for moderation';

COMMENT ON FUNCTION validate_file_upload_permission IS 'Security function to validate file upload permissions';
COMMENT ON FUNCTION get_user_file_usage IS 'Function to get user file usage statistics for quota management';
COMMENT ON FUNCTION cleanup_conversation_files IS 'Trigger function to handle file cleanup when conversations are deleted';

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify RLS policies were created
DO $$
DECLARE
    policy_count INTEGER;
    storage_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'chat_files';
    
    SELECT COUNT(*) INTO storage_policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%academic%';
    
    IF policy_count >= 6 AND storage_policy_count >= 5 THEN
        RAISE NOTICE '✅ File RLS policies created successfully (Table: %, Storage: %)', policy_count, storage_policy_count;
    ELSE
        RAISE WARNING '⚠️ Expected 6+ table policies and 5+ storage policies, found: Table %, Storage %', policy_count, storage_policy_count;
    END IF;
END $$;