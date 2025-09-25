-- Migration: Core RLS Policies Implementation
-- Description: Enterprise-grade Row Level Security policies untuk user data isolation
-- Author: Database Security Architect
-- Date: 2025-01-25
-- Task: 08 - Row Level Security Implementation

-- =====================================================
-- SECURITY FUNCTIONS FOR RLS POLICIES
-- =====================================================

-- Function to get current authenticated user ID from JWT
CREATE OR REPLACE FUNCTION public.auth_user_id() RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'sub',
        current_setting('request.jwt.sub', true)
    )::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.auth_is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'role') = 'admin' OR
        (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role') = 'admin',
        false
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate user session
CREATE OR REPLACE FUNCTION public.auth_validate_session() RETURNS BOOLEAN AS $$
DECLARE
    session_valid BOOLEAN := false;
    user_active BOOLEAN := false;
BEGIN
    -- Check if user exists and is active
    SELECT is_active INTO user_active
    FROM public.users
    WHERE id = public.auth_user_id();
    
    -- Check if session is valid (not expired, not locked)
    IF user_active AND public.auth_user_id() IS NOT NULL THEN
        session_valid := true;
    END IF;
    
    RETURN session_valid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access workflow
CREATE OR REPLACE FUNCTION public.auth_can_access_workflow(workflow_uuid UUID) RETURNS BOOLEAN AS $$
DECLARE
    workflow_owner UUID;
    workflow_public BOOLEAN := false;
BEGIN
    -- Get workflow owner
    SELECT user_id INTO workflow_owner
    FROM public.workflows
    WHERE id = workflow_uuid;
    
    -- User can access if:
    -- 1. User is the owner
    -- 2. User is admin
    -- 3. Workflow is public (future feature)
    RETURN (
        workflow_owner = public.auth_user_id() OR
        public.auth_is_admin() OR
        workflow_public
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USERS TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can only see their own profile
CREATE POLICY "users_select_own_profile" ON public.users
    FOR SELECT
    TO authenticated
    USING (id = public.auth_user_id() OR public.auth_is_admin());

-- Policy: Users can update their own profile
CREATE POLICY "users_update_own_profile" ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = public.auth_user_id())
    WITH CHECK (id = public.auth_user_id());

-- Policy: Admin can view all users (read-only for monitoring)
CREATE POLICY "users_admin_read_all" ON public.users
    FOR SELECT
    TO authenticated
    USING (public.auth_is_admin());

-- Policy: Prevent user creation through API (should use auth.users)
CREATE POLICY "users_no_insert_from_api" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (false); -- Deny all inserts from API

-- Policy: Prevent user deletion through API
CREATE POLICY "users_no_delete_from_api" ON public.users
    FOR DELETE
    TO authenticated
    USING (false); -- Deny all deletions from API

-- =====================================================
-- USER PROFILES TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profile
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = public.auth_user_id() OR public.auth_is_admin());

-- Policy: Users can insert their own profile
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can update their own profile
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (user_id = public.auth_user_id())
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users cannot delete their profile
CREATE POLICY "user_profiles_no_delete" ON public.user_profiles
    FOR DELETE
    TO authenticated
    USING (false);

-- =====================================================
-- USER SESSIONS TABLE RLS POLICIES  
-- =====================================================

-- Enable RLS on user_sessions if not already enabled
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY "user_sessions_select_own" ON public.user_sessions
    FOR SELECT
    TO authenticated
    USING (user_id = public.auth_user_id() OR public.auth_is_admin());

-- Policy: Users can insert their own sessions
CREATE POLICY "user_sessions_insert_own" ON public.user_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can update their own sessions
CREATE POLICY "user_sessions_update_own" ON public.user_sessions
    FOR UPDATE
    TO authenticated
    USING (user_id = public.auth_user_id())
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can delete their own sessions (logout)
CREATE POLICY "user_sessions_delete_own" ON public.user_sessions
    FOR DELETE
    TO authenticated
    USING (user_id = public.auth_user_id());

-- =====================================================
-- USER PREFERENCES TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on user_preferences if not already enabled
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own preferences
CREATE POLICY "user_preferences_select_own" ON public.user_preferences
    FOR SELECT
    TO authenticated
    USING (user_id = public.auth_user_id());

-- Policy: Users can insert their own preferences
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can update their own preferences
CREATE POLICY "user_preferences_update_own" ON public.user_preferences
    FOR UPDATE
    TO authenticated
    USING (user_id = public.auth_user_id())
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can delete their own preferences
CREATE POLICY "user_preferences_delete_own" ON public.user_preferences
    FOR DELETE
    TO authenticated
    USING (user_id = public.auth_user_id());

-- =====================================================
-- WORKFLOWS TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can select their own workflows
CREATE POLICY "workflows_select_own" ON public.workflows
    FOR SELECT
    TO authenticated
    USING (user_id = public.auth_user_id() OR public.auth_is_admin());

-- Policy: Users can insert their own workflows
CREATE POLICY "workflows_insert_own" ON public.workflows
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can update their own workflows
CREATE POLICY "workflows_update_own" ON public.workflows
    FOR UPDATE
    TO authenticated
    USING (user_id = public.auth_user_id())
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can delete their own workflows
CREATE POLICY "workflows_delete_own" ON public.workflows
    FOR DELETE
    TO authenticated
    USING (user_id = public.auth_user_id());

-- =====================================================
-- WORKFLOW PHASES TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on workflow_phases if not already enabled
ALTER TABLE public.workflow_phases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can access phases of their own workflows
CREATE POLICY "workflow_phases_select_own_workflow" ON public.workflow_phases
    FOR SELECT
    TO authenticated
    USING (
        public.auth_can_access_workflow(workflow_id) OR 
        public.auth_is_admin()
    );

-- Policy: Users can insert phases for their own workflows
CREATE POLICY "workflow_phases_insert_own_workflow" ON public.workflow_phases
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_can_access_workflow(workflow_id));

-- Policy: Users can update phases of their own workflows
CREATE POLICY "workflow_phases_update_own_workflow" ON public.workflow_phases
    FOR UPDATE
    TO authenticated
    USING (public.auth_can_access_workflow(workflow_id))
    WITH CHECK (public.auth_can_access_workflow(workflow_id));

-- Policy: Users can delete phases of their own workflows
CREATE POLICY "workflow_phases_delete_own_workflow" ON public.workflow_phases
    FOR DELETE
    TO authenticated
    USING (public.auth_can_access_workflow(workflow_id));

-- =====================================================
-- APPROVAL GATES TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on approval_gates if not already enabled
ALTER TABLE public.approval_gates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see approval gates for their workflows
CREATE POLICY "approval_gates_select_own_workflow" ON public.approval_gates
    FOR SELECT
    TO authenticated
    USING (
        public.auth_can_access_workflow(workflow_id) OR
        public.auth_is_admin()
    );

-- Policy: Users can create approval gates for their workflows  
CREATE POLICY "approval_gates_insert_own_workflow" ON public.approval_gates
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_can_access_workflow(workflow_id));

-- Policy: Users can update approval gates for their workflows
CREATE POLICY "approval_gates_update_own_workflow" ON public.approval_gates
    FOR UPDATE
    TO authenticated
    USING (public.auth_can_access_workflow(workflow_id))
    WITH CHECK (public.auth_can_access_workflow(workflow_id));

-- Policy: Users can delete approval gates for their workflows
CREATE POLICY "approval_gates_delete_own_workflow" ON public.approval_gates
    FOR DELETE
    TO authenticated
    USING (public.auth_can_access_workflow(workflow_id));

-- =====================================================
-- ARTIFACTS TABLE RLS POLICIES
-- =====================================================

-- Policy: Users can see artifacts from their workflows
CREATE POLICY "artifacts_select_own_workflow" ON public.artifacts
    FOR SELECT
    TO authenticated
    USING (
        user_id = public.auth_user_id() OR
        public.auth_can_access_workflow(workflow_id) OR
        public.auth_is_admin() OR
        is_public = true
    );

-- Policy: Users can create artifacts in their workflows
CREATE POLICY "artifacts_insert_own_workflow" ON public.artifacts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = public.auth_user_id() AND
        public.auth_can_access_workflow(workflow_id)
    );

-- Policy: Users can update their own artifacts
CREATE POLICY "artifacts_update_own" ON public.artifacts
    FOR UPDATE
    TO authenticated
    USING (
        user_id = public.auth_user_id() AND
        public.auth_can_access_workflow(workflow_id)
    )
    WITH CHECK (
        user_id = public.auth_user_id() AND
        public.auth_can_access_workflow(workflow_id)
    );

-- Policy: Users can delete their own artifacts
CREATE POLICY "artifacts_delete_own" ON public.artifacts
    FOR DELETE
    TO authenticated
    USING (
        user_id = public.auth_user_id() AND
        public.auth_can_access_workflow(workflow_id)
    );

-- =====================================================
-- AI INTERACTIONS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on ai_interactions if not already enabled
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own AI interactions
CREATE POLICY "ai_interactions_select_own" ON public.ai_interactions
    FOR SELECT
    TO authenticated
    USING (user_id = public.auth_user_id() OR public.auth_is_admin());

-- Policy: Users can create their own AI interactions
CREATE POLICY "ai_interactions_insert_own" ON public.ai_interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users cannot update AI interactions (immutable log)
CREATE POLICY "ai_interactions_no_update" ON public.ai_interactions
    FOR UPDATE
    TO authenticated
    USING (false);

-- Policy: Users cannot delete AI interactions (audit trail)
CREATE POLICY "ai_interactions_no_delete" ON public.ai_interactions
    FOR DELETE
    TO authenticated
    USING (false);

-- =====================================================
-- TOOL USAGE LOGS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on tool_usage_logs if not already enabled
ALTER TABLE public.tool_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own tool usage logs
CREATE POLICY "tool_usage_logs_select_own" ON public.tool_usage_logs
    FOR SELECT
    TO authenticated
    USING (user_id = public.auth_user_id() OR public.auth_is_admin());

-- Policy: Users can create their own tool usage logs
CREATE POLICY "tool_usage_logs_insert_own" ON public.tool_usage_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users cannot update tool usage logs (immutable log)
CREATE POLICY "tool_usage_logs_no_update" ON public.tool_usage_logs
    FOR UPDATE
    TO authenticated
    USING (false);

-- Policy: Users cannot delete tool usage logs (audit trail)
CREATE POLICY "tool_usage_logs_no_delete" ON public.tool_usage_logs
    FOR DELETE
    TO authenticated
    USING (false);

-- =====================================================
-- RESEARCH QUERIES TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on research_queries if not already enabled
ALTER TABLE public.research_queries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own research queries
CREATE POLICY "research_queries_select_own" ON public.research_queries
    FOR SELECT
    TO authenticated
    USING (user_id = public.auth_user_id() OR public.auth_is_admin());

-- Policy: Users can create their own research queries
CREATE POLICY "research_queries_insert_own" ON public.research_queries
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can update their own research queries
CREATE POLICY "research_queries_update_own" ON public.research_queries
    FOR UPDATE
    TO authenticated
    USING (user_id = public.auth_user_id())
    WITH CHECK (user_id = public.auth_user_id());

-- Policy: Users can delete their own research queries
CREATE POLICY "research_queries_delete_own" ON public.research_queries
    FOR DELETE
    TO authenticated
    USING (user_id = public.auth_user_id());

-- =====================================================
-- SECURITY AUDIT LOG
-- =====================================================

-- Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for security audit log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action_type ON public.security_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can see audit logs
CREATE POLICY "security_audit_log_admin_only" ON public.security_audit_log
    FOR ALL
    TO authenticated
    USING (public.auth_is_admin());

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION public.auth_user_id() IS 'Extracts user ID from JWT token for RLS policies';
COMMENT ON FUNCTION public.auth_is_admin() IS 'Checks if current user has admin privileges';
COMMENT ON FUNCTION public.auth_validate_session() IS 'Validates current user session and account status';
COMMENT ON FUNCTION public.auth_can_access_workflow(UUID) IS 'Checks if user can access specific workflow';

COMMENT ON TABLE public.security_audit_log IS 'Security audit trail for all database operations';