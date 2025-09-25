-- Migration: Task 7.7 - Admin Configuration RLS Policies
-- Description: Row Level Security policies untuk admin configuration tables
-- Author: Database Architect  
-- Date: 2025-01-26
-- Task: 7.7 - Admin Configuration and System Prompt Management RLS

-- ====================================================================
-- SYSTEM_PROMPTS RLS POLICIES
-- ====================================================================

-- Admin full access policy
CREATE POLICY "system_prompts_admin_full_access" ON public.system_prompts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    );

-- Read-only access untuk researchers/reviewers untuk active prompts
CREATE POLICY "system_prompts_read_access" ON public.system_prompts
    FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('researcher', 'reviewer') 
            AND users.is_active = true
        )
    );

-- ====================================================================
-- PROMPT_TEMPLATES RLS POLICIES
-- ====================================================================

-- Admin full access policy
CREATE POLICY "prompt_templates_admin_full_access" ON public.prompt_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    );

-- Users can read public templates
CREATE POLICY "prompt_templates_public_read" ON public.prompt_templates
    FOR SELECT
    TO authenticated
    USING (
        is_public = true
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.is_active = true
        )
    );

-- Users can read their own templates
CREATE POLICY "prompt_templates_owner_access" ON public.prompt_templates
    FOR ALL
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Researchers/reviewers can read verified templates
CREATE POLICY "prompt_templates_verified_read" ON public.prompt_templates
    FOR SELECT
    TO authenticated
    USING (
        is_verified = true
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('researcher', 'reviewer') 
            AND users.is_active = true
        )
    );

-- ====================================================================
-- PROMPT_VERSIONS RLS POLICIES
-- ====================================================================

-- Admin full access policy
CREATE POLICY "prompt_versions_admin_full_access" ON public.prompt_versions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    );

-- Read-only access untuk version history
CREATE POLICY "prompt_versions_read_access" ON public.prompt_versions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('researcher', 'reviewer') 
            AND users.is_active = true
        )
        AND EXISTS (
            SELECT 1 FROM public.system_prompts sp
            WHERE sp.id = prompt_versions.prompt_id
            AND sp.is_active = true
        )
    );

-- ====================================================================
-- MODEL_CONFIGS RLS POLICIES
-- ====================================================================

-- Admin full access policy
CREATE POLICY "model_configs_admin_full_access" ON public.model_configs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    );

-- Read-only access untuk active configs
CREATE POLICY "model_configs_read_access" ON public.model_configs
    FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('researcher', 'reviewer') 
            AND users.is_active = true
        )
    );

-- ====================================================================
-- ADMIN_SETTINGS RLS POLICIES
-- ====================================================================

-- Admin full access for non-sensitive settings
CREATE POLICY "admin_settings_admin_access" ON public.admin_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_active = true
        )
    );

-- Read-only access untuk non-sensitive, non-system settings
CREATE POLICY "admin_settings_read_access" ON public.admin_settings
    FOR SELECT
    TO authenticated
    USING (
        is_sensitive = false
        AND is_system = false
        AND EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('researcher', 'reviewer') 
            AND users.is_active = true
        )
    );

-- ====================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- ====================================================================

-- Function to check admin role with proper error handling
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = COALESCE(user_id, auth.uid()) 
        AND users.role = 'admin' 
        AND users.is_active = true
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Function to check if user can access sensitive settings
CREATE OR REPLACE FUNCTION can_access_sensitive_settings(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = COALESCE(user_id, auth.uid()) 
        AND users.role = 'admin' 
        AND users.is_active = true
        AND users.email_verified_at IS NOT NULL
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Function to get user accessible prompts
CREATE OR REPLACE FUNCTION get_accessible_prompts(user_id UUID DEFAULT auth.uid())
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    phase academic_phase,
    content TEXT,
    version INTEGER,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is admin
    IF is_admin_user(user_id) THEN
        RETURN QUERY 
        SELECT sp.id, sp.name, sp.phase, sp.content, sp.version, sp.is_active
        FROM public.system_prompts sp
        ORDER BY sp.phase, sp.priority_order, sp.name;
    ELSE
        -- Return only active prompts for non-admin users
        RETURN QUERY 
        SELECT sp.id, sp.name, sp.phase, sp.content, sp.version, sp.is_active
        FROM public.system_prompts sp
        WHERE sp.is_active = true
        ORDER BY sp.phase, sp.priority_order, sp.name;
    END IF;
END;
$$;

-- Function to safely update prompt version with validation
CREATE OR REPLACE FUNCTION create_prompt_version(
    p_prompt_id UUID,
    p_content TEXT,
    p_change_reason TEXT DEFAULT NULL,
    p_change_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_version INTEGER;
    v_version_id UUID;
BEGIN
    -- Verify admin access
    IF NOT is_admin_user(p_user_id) THEN
        RAISE EXCEPTION 'Access denied: Admin role required untuk create prompt versions';
    END IF;
    
    -- Verify prompt exists
    IF NOT EXISTS (SELECT 1 FROM public.system_prompts WHERE id = p_prompt_id) THEN
        RAISE EXCEPTION 'Prompt not found dengan ID: %', p_prompt_id;
    END IF;
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO v_new_version
    FROM public.prompt_versions
    WHERE prompt_id = p_prompt_id;
    
    -- Create version record
    INSERT INTO public.prompt_versions (
        prompt_id,
        version_number,
        content,
        changed_by,
        change_reason,
        change_description
    ) VALUES (
        p_prompt_id,
        v_new_version,
        p_content,
        p_user_id,
        p_change_reason,
        p_change_description
    ) RETURNING id INTO v_version_id;
    
    -- Update system prompt version
    UPDATE public.system_prompts 
    SET 
        content = p_content,
        version = v_new_version,
        updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_prompt_id;
    
    RETURN v_version_id;
END;
$$;

-- ====================================================================
-- COMMENTS untuk RLS policies
-- ====================================================================

COMMENT ON POLICY "system_prompts_admin_full_access" ON public.system_prompts IS 'Admin users dapat full CRUD access pada system prompts';
COMMENT ON POLICY "system_prompts_read_access" ON public.system_prompts IS 'Researchers dan reviewers dapat read active prompts';

COMMENT ON POLICY "prompt_templates_admin_full_access" ON public.prompt_templates IS 'Admin users dapat full CRUD access pada templates';
COMMENT ON POLICY "prompt_templates_public_read" ON public.prompt_templates IS 'All authenticated users dapat read public templates';
COMMENT ON POLICY "prompt_templates_owner_access" ON public.prompt_templates IS 'Users dapat manage templates mereka sendiri';

COMMENT ON FUNCTION is_admin_user(UUID) IS 'Security function untuk verify admin role dengan proper error handling';
COMMENT ON FUNCTION can_access_sensitive_settings(UUID) IS 'Security function untuk access sensitive admin settings';
COMMENT ON FUNCTION get_accessible_prompts(UUID) IS 'Get prompts yang accessible untuk user berdasarkan role';
COMMENT ON FUNCTION create_prompt_version(UUID, TEXT, TEXT, TEXT, UUID) IS 'Safely create new prompt version dengan admin validation';