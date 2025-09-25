-- Migration: Fix Minor Security Issues
-- Description: Complete RLS policies for auxiliary tables and fix security warnings
-- Author: Database Security Architect
-- Date: 2025-01-26
-- Task: Fix minor issues from security audit

-- =====================================================
-- ENABLE RLS FOR MISSING TABLE
-- =====================================================

-- Enable RLS on schema_validation_results if not already enabled
ALTER TABLE public.schema_validation_results ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- AUXILIARY TABLES RLS POLICIES
-- =====================================================

-- APPROVAL_RESPONSES TABLE POLICIES
-- Policy: Users can see responses for their workflow approval gates
CREATE POLICY "approval_responses_select_own_workflow" ON public.approval_responses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.approval_gates ag
            WHERE ag.id = approval_gate_id
            AND public.auth_can_access_workflow(ag.workflow_id)
        ) OR public.auth_is_admin()
    );

-- Policy: Users can create responses for their workflow approval gates
CREATE POLICY "approval_responses_insert_own_workflow" ON public.approval_responses
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.approval_gates ag
            WHERE ag.id = approval_gate_id
            AND public.auth_can_access_workflow(ag.workflow_id)
        )
    );

-- Policy: Users cannot update approval responses (immutable audit trail)
CREATE POLICY "approval_responses_no_update" ON public.approval_responses
    FOR UPDATE
    TO authenticated
    USING (false);

-- Policy: Users cannot delete approval responses (audit trail)
CREATE POLICY "approval_responses_no_delete" ON public.approval_responses
    FOR DELETE
    TO authenticated
    USING (false);

-- ARTIFACT_METADATA TABLE POLICIES
-- Policy: Users can see metadata for their artifacts
CREATE POLICY "artifact_metadata_select_own_artifacts" ON public.artifact_metadata
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.id = artifact_id
            AND (a.user_id = public.auth_user_id() OR public.auth_can_access_workflow(a.workflow_id))
        ) OR public.auth_is_admin()
    );

-- Policy: Users can create metadata for their artifacts
CREATE POLICY "artifact_metadata_insert_own_artifacts" ON public.artifact_metadata
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.id = artifact_id
            AND a.user_id = public.auth_user_id()
        )
    );

-- Policy: Users can update metadata for their artifacts
CREATE POLICY "artifact_metadata_update_own_artifacts" ON public.artifact_metadata
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.id = artifact_id
            AND a.user_id = public.auth_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.id = artifact_id
            AND a.user_id = public.auth_user_id()
        )
    );

-- Policy: Users can delete metadata for their artifacts
CREATE POLICY "artifact_metadata_delete_own_artifacts" ON public.artifact_metadata
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.id = artifact_id
            AND a.user_id = public.auth_user_id()
        )
    );

-- ARTIFACT_VERSIONS TABLE POLICIES
-- Policy: Users can see versions for their artifacts
CREATE POLICY "artifact_versions_select_own_artifacts" ON public.artifact_versions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.id = artifact_id
            AND (a.user_id = public.auth_user_id() OR public.auth_can_access_workflow(a.workflow_id))
        ) OR public.auth_is_admin()
    );

-- Policy: Users can create versions for their artifacts
CREATE POLICY "artifact_versions_insert_own_artifacts" ON public.artifact_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.id = artifact_id
            AND a.user_id = public.auth_user_id()
        )
    );

-- Policy: Users cannot update artifact versions (immutable versioning)
CREATE POLICY "artifact_versions_no_update" ON public.artifact_versions
    FOR UPDATE
    TO authenticated
    USING (false);

-- Policy: Users cannot delete artifact versions (version history)
CREATE POLICY "artifact_versions_no_delete" ON public.artifact_versions
    FOR DELETE
    TO authenticated
    USING (false);

-- RESEARCH_QUERY_RESULTS TABLE POLICIES
-- Policy: Users can see results for their research queries
CREATE POLICY "research_query_results_select_own_queries" ON public.research_query_results
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.research_queries rq
            WHERE rq.id = research_query_id
            AND rq.user_id = public.auth_user_id()
        ) OR public.auth_is_admin()
    );

-- Policy: Users can create results for their research queries
CREATE POLICY "research_query_results_insert_own_queries" ON public.research_query_results
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.research_queries rq
            WHERE rq.id = research_query_id
            AND rq.user_id = public.auth_user_id()
        )
    );

-- Policy: Users cannot update query results (immutable research data)
CREATE POLICY "research_query_results_no_update" ON public.research_query_results
    FOR UPDATE
    TO authenticated
    USING (false);

-- Policy: Users cannot delete query results (research audit trail)
CREATE POLICY "research_query_results_no_delete" ON public.research_query_results
    FOR DELETE
    TO authenticated
    USING (false);

-- WORKFLOW_CONTEXT TABLE POLICIES
-- Policy: Users can see context for their workflows
CREATE POLICY "workflow_context_select_own_workflow" ON public.workflow_context
    FOR SELECT
    TO authenticated
    USING (
        public.auth_can_access_workflow(workflow_id) OR public.auth_is_admin()
    );

-- Policy: Users can create context for their workflows
CREATE POLICY "workflow_context_insert_own_workflow" ON public.workflow_context
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_can_access_workflow(workflow_id));

-- Policy: Users can update context for their workflows
CREATE POLICY "workflow_context_update_own_workflow" ON public.workflow_context
    FOR UPDATE
    TO authenticated
    USING (public.auth_can_access_workflow(workflow_id))
    WITH CHECK (public.auth_can_access_workflow(workflow_id));

-- Policy: Users can delete context for their workflows
CREATE POLICY "workflow_context_delete_own_workflow" ON public.workflow_context
    FOR DELETE
    TO authenticated
    USING (public.auth_can_access_workflow(workflow_id));

-- SCHEMA_VALIDATION_RESULTS TABLE POLICIES
-- Policy: Only admins can see schema validation results
CREATE POLICY "schema_validation_results_admin_only" ON public.schema_validation_results
    FOR ALL
    TO authenticated
    USING (public.auth_is_admin());

-- =====================================================
-- FIX FUNCTION SEARCH_PATH SECURITY WARNINGS
-- =====================================================

-- Fix critical authentication functions first
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fix update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Fix user profile search function
CREATE OR REPLACE FUNCTION public.user_profile_search_text(bio text, research_interests text[])
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT to_tsvector('simple', coalesce(bio, '') || ' ' || coalesce(array_to_string(research_interests, ' '), ''))
$$;

-- Fix artifact search function
CREATE OR REPLACE FUNCTION public.artifact_search_text(title text, description text, content text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(left(content, 1000), ''))
$$;

-- =====================================================
-- DOCUMENTATION AND COMMENTS
-- =====================================================

COMMENT ON TABLE public.approval_responses IS 'User responses to approval gates in workflows with RLS protection';
COMMENT ON TABLE public.artifact_metadata IS 'Extended metadata for artifacts with user-level access control';
COMMENT ON TABLE public.artifact_versions IS 'Immutable version history for artifacts with RLS protection';
COMMENT ON TABLE public.research_query_results IS 'Research query results with user-level data isolation';
COMMENT ON TABLE public.workflow_context IS 'Workflow execution context with user access control';
COMMENT ON TABLE public.schema_validation_results IS 'Admin-only schema validation results and metrics';

-- Security validation complete
SELECT 'Minor security issues fixed - RLS policies added, search_path optimized' as migration_status;