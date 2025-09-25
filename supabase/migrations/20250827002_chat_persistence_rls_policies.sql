-- =====================================================================================
-- Chat Persistence RLS Security Policies - Task 03 Database Integration
-- =====================================================================================
--
-- PURPOSE:
-- Creates Row Level Security policies for chat persistence tables
-- Ensures users can only access their own conversations and messages
-- Maintains consistency with existing enterprise security patterns
--
-- SECURITY PRINCIPLES:
-- - Deny by default (RLS enabled)
-- - User isolation (users only see own data)
-- - Admin override capabilities
-- - Audit trail preservation
-- 
-- INTEGRATION:
-- - Follows existing RLS patterns from enterprise schema
-- - Maintains compatibility with academic workflow security
-- - Supports authenticated and admin access patterns
--
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================================================

-- Enable RLS on all chat persistence tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- CONVERSATIONS TABLE POLICIES
-- =====================================================================================

-- Policy: Users can view their own conversations
CREATE POLICY "conversations_select_own" ON public.conversations
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can insert their own conversations
CREATE POLICY "conversations_insert_own" ON public.conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

-- Policy: Users can update their own conversations
CREATE POLICY "conversations_update_own" ON public.conversations
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can delete their own conversations (soft delete via archive)
CREATE POLICY "conversations_delete_own" ON public.conversations
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        archived = true -- Only allow setting archived to true
    );

-- Policy: Service role can perform all operations (for API functions)
CREATE POLICY "conversations_service_role_all" ON public.conversations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================================================
-- CHAT_MESSAGES TABLE POLICIES
-- =====================================================================================

-- Policy: Users can view messages from their own conversations
CREATE POLICY "chat_messages_select_own" ON public.chat_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (
                c.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            )
        )
    );

-- Policy: Users can insert messages to their own conversations
CREATE POLICY "chat_messages_insert_own" ON public.chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- Policy: Users can update messages in their own conversations
CREATE POLICY "chat_messages_update_own" ON public.chat_messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (
                c.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (
                c.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            )
        )
    );

-- Policy: Users can delete messages from their own conversations
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND (
                c.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            )
        )
    );

-- Policy: Service role can perform all operations (for AI SDK saveChat/loadChat)
CREATE POLICY "chat_messages_service_role_all" ON public.chat_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================================================
-- CHAT_SESSIONS TABLE POLICIES  
-- =====================================================================================

-- Policy: Users can view their own chat sessions
CREATE POLICY "chat_sessions_select_own" ON public.chat_sessions
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can insert their own chat sessions
CREATE POLICY "chat_sessions_insert_own" ON public.chat_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- Policy: Users can update their own chat sessions
CREATE POLICY "chat_sessions_update_own" ON public.chat_sessions
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can delete their own chat sessions
CREATE POLICY "chat_sessions_delete_own" ON public.chat_sessions
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Service role can perform all operations (for session management)
CREATE POLICY "chat_sessions_service_role_all" ON public.chat_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================================================
-- FUNCTION SECURITY GRANTS
-- =====================================================================================

-- Grant execute permissions on chat functions to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations TO authenticated;

-- Grant execute permissions to service role for API operations
GRANT EXECUTE ON FUNCTION get_conversation_messages TO service_role;
GRANT EXECUTE ON FUNCTION get_user_conversations TO service_role;

-- =====================================================================================
-- TABLE ACCESS GRANTS
-- =====================================================================================

-- Grant table access to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;

-- Grant sequence usage for ID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant full access to service role (for API functions)
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
GRANT ALL ON public.chat_sessions TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================================================
-- AUDIT POLICIES (Optional - for enhanced security)
-- =====================================================================================

-- Create audit function for sensitive operations (optional)
CREATE OR REPLACE FUNCTION audit_chat_operation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log critical chat operations for security audit
    IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'conversations' THEN
        INSERT INTO public.audit_logs (
            table_name, 
            record_id, 
            operation, 
            user_id, 
            details, 
            timestamp
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id,
            'DELETE',
            auth.uid(),
            jsonb_build_object(
                'title', OLD.title,
                'message_count', OLD.message_count,
                'workflow_id', OLD.workflow_id
            ),
            NOW()
        );
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Don't fail the main operation if audit fails
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit trigger for conversation deletions (if audit_logs table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        CREATE TRIGGER audit_conversation_operations
            BEFORE DELETE ON public.conversations
            FOR EACH ROW
            EXECUTE FUNCTION audit_chat_operation();
    END IF;
END $$;

-- =====================================================================================
-- SECURITY VALIDATION
-- =====================================================================================

-- Test RLS policies are properly configured
DO $$
DECLARE
    policy_count INTEGER;
    table_rls_count INTEGER;
BEGIN
    -- Count RLS policies for chat tables
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename IN ('conversations', 'chat_messages', 'chat_sessions')
    AND schemaname = 'public';
    
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO table_rls_count
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    WHERE t.table_schema = 'public'
    AND t.table_name IN ('conversations', 'chat_messages', 'chat_sessions')
    AND c.relrowsecurity = true;
    
    IF policy_count >= 12 AND table_rls_count = 3 THEN
        RAISE NOTICE '✅ Chat persistence RLS policies configured successfully (% policies, % tables with RLS)', policy_count, table_rls_count;
    ELSE
        RAISE WARNING '⚠️ RLS configuration incomplete: % policies, % tables with RLS enabled', policy_count, table_rls_count;
    END IF;
END $$;

COMMIT;

-- =====================================================================================
-- POLICY VERIFICATION QUERIES
-- =====================================================================================

-- Query to verify all RLS policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL as has_using,
    with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename IN ('conversations', 'chat_messages', 'chat_sessions')
    AND schemaname = 'public'
ORDER BY tablename, policyname;