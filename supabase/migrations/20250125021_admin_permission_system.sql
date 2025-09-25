-- Migration: Admin Permission System Implementation
-- Description: Advanced admin role management dengan secure privilege escalation dan audit logging
-- Author: Database Security Architect  
-- Date: 2025-01-25
-- Task: 08 - Row Level Security Implementation

-- =====================================================
-- ADMIN ROLE AND PERMISSION SYSTEM
-- =====================================================

-- Create admin permission levels enum
CREATE TYPE admin_permission_level AS ENUM (
    'read_only',      -- Can view all data but not modify
    'data_admin',     -- Can modify user data but not system settings
    'system_admin',   -- Can modify system settings but not user roles  
    'super_admin'     -- Full system access including role management
);

-- Create admin action categories enum  
CREATE TYPE admin_action_category AS ENUM (
    'user_management',
    'data_access',
    'system_configuration', 
    'security_audit',
    'workflow_oversight',
    'artifact_management',
    'session_management',
    'database_maintenance'
);

-- Create admin permissions table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission_level admin_permission_level NOT NULL DEFAULT 'read_only',
    granted_by UUID REFERENCES public.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    allowed_actions admin_action_category[] DEFAULT ARRAY[]::admin_action_category[],
    restrictions JSONB DEFAULT '{}'::jsonb,
    audit_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for admin permissions
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON public.admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_level ON public.admin_permissions(permission_level);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_active ON public.admin_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_expires ON public.admin_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_granted_by ON public.admin_permissions(granted_by);

-- Create GIN index for actions array
CREATE INDEX IF NOT EXISTS idx_admin_permissions_actions ON public.admin_permissions USING gin(allowed_actions);

-- Enable RLS on admin permissions
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_admin_permissions_updated_at
    BEFORE UPDATE ON public.admin_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENHANCED ADMIN VALIDATION FUNCTIONS
-- =====================================================

-- Function to check enhanced admin status
CREATE OR REPLACE FUNCTION public.auth_get_admin_permission_level() RETURNS admin_permission_level AS $$
DECLARE
    user_uuid UUID;
    permission_record RECORD;
    jwt_role TEXT;
BEGIN
    user_uuid := public.auth_user_id();
    
    -- Return NULL if no user
    IF user_uuid IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Check JWT for basic admin flag
    jwt_role := public.auth_get_jwt_claim('role');
    IF jwt_role != 'admin' THEN
        jwt_role := public.auth_get_jwt_claim('user_metadata')::json->>'role';
    END IF;
    
    -- If not admin in JWT, no permissions
    IF jwt_role != 'admin' THEN
        RETURN NULL;
    END IF;
    
    -- Get highest active permission level
    SELECT permission_level, is_active, expires_at
    INTO permission_record
    FROM public.admin_permissions
    WHERE user_id = user_uuid
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY 
        CASE permission_level
            WHEN 'super_admin' THEN 4
            WHEN 'system_admin' THEN 3  
            WHEN 'data_admin' THEN 2
            WHEN 'read_only' THEN 1
        END DESC
    LIMIT 1;
    
    -- Return permission level if found
    IF FOUND THEN
        RETURN permission_record.permission_level;
    END IF;
    
    -- Default to read_only for basic admins
    RETURN 'read_only';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check specific admin action permission
CREATE OR REPLACE FUNCTION public.auth_can_perform_admin_action(
    action_category admin_action_category,
    specific_action TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    user_uuid UUID;
    admin_level admin_permission_level;
    permission_record RECORD;
    has_permission BOOLEAN := false;
BEGIN
    user_uuid := public.auth_user_id();
    admin_level := public.auth_get_admin_permission_level();
    
    -- No permission if not admin
    IF admin_level IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get detailed permissions
    SELECT allowed_actions, restrictions
    INTO permission_record
    FROM public.admin_permissions
    WHERE user_id = user_uuid
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND permission_level = admin_level
    LIMIT 1;
    
    -- Check if action category is allowed
    IF FOUND AND action_category = ANY(permission_record.allowed_actions) THEN
        has_permission := true;
        
        -- Check specific action restrictions
        IF specific_action IS NOT NULL AND permission_record.restrictions ? 'blocked_actions' THEN
            IF specific_action = ANY(
                ARRAY(SELECT jsonb_array_elements_text(permission_record.restrictions->'blocked_actions'))
            ) THEN
                has_permission := false;
            END IF;
        END IF;
    END IF;
    
    -- Super admin bypass (with logging)
    IF admin_level = 'super_admin' AND NOT has_permission THEN
        has_permission := true;
        
        -- Log super admin privilege escalation
        PERFORM public.auth_log_security_event(
            'super_admin_privilege_escalation',
            user_uuid,
            NULL,
            NULL,
            NULL,
            true,
            NULL,
            jsonb_build_object(
                'action_category', action_category,
                'specific_action', specific_action
            )
        );
    END IF;
    
    RETURN has_permission;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant admin permissions (requires super_admin)
CREATE OR REPLACE FUNCTION public.auth_grant_admin_permission(
    target_user_id UUID,
    permission_level admin_permission_level,
    allowed_actions admin_action_category[],
    expires_duration INTERVAL DEFAULT NULL,
    restrictions JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    granting_user_id UUID;
    permission_id UUID;
    expires_timestamp TIMESTAMPTZ;
BEGIN
    granting_user_id := public.auth_user_id();
    
    -- Only super_admin can grant permissions
    IF public.auth_get_admin_permission_level() != 'super_admin' THEN
        RAISE EXCEPTION 'Only super administrators can grant admin permissions';
    END IF;
    
    -- Calculate expiration
    IF expires_duration IS NOT NULL THEN
        expires_timestamp := NOW() + expires_duration;
    END IF;
    
    -- Deactivate existing permissions for user
    UPDATE public.admin_permissions
    SET is_active = false,
        updated_at = NOW()
    WHERE user_id = target_user_id
    AND is_active = true;
    
    -- Insert new permission
    INSERT INTO public.admin_permissions (
        user_id,
        permission_level,
        granted_by,
        expires_at,
        allowed_actions,
        restrictions,
        audit_metadata
    ) VALUES (
        target_user_id,
        permission_level,
        granting_user_id,
        expires_timestamp,
        allowed_actions,
        restrictions,
        jsonb_build_object(
            'granted_by_user', granting_user_id,
            'granted_at', NOW(),
            'grant_reason', 'manual_assignment'
        )
    ) RETURNING id INTO permission_id;
    
    -- Log permission grant
    PERFORM public.auth_log_security_event(
        'admin_permission_granted',
        granting_user_id,
        NULL,
        NULL,
        NULL,
        true,
        NULL,
        jsonb_build_object(
            'target_user_id', target_user_id,
            'permission_level', permission_level,
            'expires_at', expires_timestamp,
            'permission_id', permission_id
        )
    );
    
    RETURN permission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke admin permissions
CREATE OR REPLACE FUNCTION public.auth_revoke_admin_permission(
    target_user_id UUID,
    reason TEXT DEFAULT 'manual_revocation'
) RETURNS BOOLEAN AS $$
DECLARE
    revoking_user_id UUID;
    revoked_count INTEGER;
BEGIN
    revoking_user_id := public.auth_user_id();
    
    -- Only super_admin can revoke permissions
    IF public.auth_get_admin_permission_level() != 'super_admin' THEN
        RAISE EXCEPTION 'Only super administrators can revoke admin permissions';
    END IF;
    
    -- Cannot revoke own permissions
    IF target_user_id = revoking_user_id THEN
        RAISE EXCEPTION 'Cannot revoke your own admin permissions';
    END IF;
    
    -- Deactivate all permissions for user
    UPDATE public.admin_permissions
    SET is_active = false,
        updated_at = NOW(),
        audit_metadata = audit_metadata || jsonb_build_object(
            'revoked_by', revoking_user_id,
            'revoked_at', NOW(),
            'revocation_reason', reason
        )
    WHERE user_id = target_user_id
    AND is_active = true;
    
    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    
    -- Log permission revocation
    PERFORM public.auth_log_security_event(
        'admin_permission_revoked',
        revoking_user_id,
        NULL,
        NULL,
        NULL,
        true,
        NULL,
        jsonb_build_object(
            'target_user_id', target_user_id,
            'revoked_permissions', revoked_count,
            'reason', reason
        )
    );
    
    RETURN revoked_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENHANCED ADMIN RLS POLICIES
-- =====================================================

-- Update existing admin policies to use new permission system
DROP POLICY IF EXISTS "users_admin_read_all" ON public.users;

-- Enhanced admin policies based on permission levels
CREATE POLICY "users_admin_read_by_permission" ON public.users
    FOR SELECT
    TO authenticated
    USING (
        id = public.auth_user_id() OR
        public.auth_can_perform_admin_action('user_management'::admin_action_category)
    );

-- Admin can update users based on permission level
CREATE POLICY "users_admin_update_by_permission" ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        id = public.auth_user_id() OR
        public.auth_can_perform_admin_action('user_management'::admin_action_category, 'update_user')
    )
    WITH CHECK (
        id = public.auth_user_id() OR
        public.auth_can_perform_admin_action('user_management'::admin_action_category, 'update_user')
    );

-- Admin permissions table policies
CREATE POLICY "admin_permissions_view_own_or_manage" ON public.admin_permissions
    FOR SELECT
    TO authenticated
    USING (
        user_id = public.auth_user_id() OR
        public.auth_can_perform_admin_action('user_management'::admin_action_category)
    );

CREATE POLICY "admin_permissions_super_admin_only" ON public.admin_permissions
    FOR ALL
    TO authenticated
    USING (public.auth_get_admin_permission_level() = 'super_admin');

-- Enhanced workflow admin access
DROP POLICY IF EXISTS "workflows_select_own" ON public.workflows;
CREATE POLICY "workflows_select_own_or_admin" ON public.workflows
    FOR SELECT
    TO authenticated
    USING (
        user_id = public.auth_user_id() OR
        public.auth_can_perform_admin_action('workflow_oversight'::admin_action_category)
    );

-- Enhanced artifacts admin access  
DROP POLICY IF EXISTS "artifacts_select_own_workflow" ON public.artifacts;
CREATE POLICY "artifacts_select_own_or_admin" ON public.artifacts
    FOR SELECT
    TO authenticated
    USING (
        user_id = public.auth_user_id() OR
        public.auth_can_access_workflow(workflow_id) OR
        public.auth_can_perform_admin_action('artifact_management'::admin_action_category) OR
        is_public = true
    );

-- =====================================================
-- ADMIN AUDIT FUNCTIONS
-- =====================================================

-- Function to log admin actions with enhanced metadata
CREATE OR REPLACE FUNCTION public.auth_log_admin_action(
    action_name TEXT,
    target_table TEXT DEFAULT NULL,
    target_record_id UUID DEFAULT NULL,
    action_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    admin_user_id UUID;
    admin_level admin_permission_level;
    log_id UUID;
BEGIN
    admin_user_id := public.auth_user_id();
    admin_level := public.auth_get_admin_permission_level();
    
    -- Only log if user has admin permissions
    IF admin_level IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Enhanced logging with admin context
    log_id := public.auth_log_security_event(
        'admin_action',
        admin_user_id,
        NULL,
        NULL,
        NULL,
        true,
        NULL,
        jsonb_build_object(
            'admin_action', action_name,
            'admin_permission_level', admin_level,
            'target_table', target_table,
            'target_record_id', target_record_id
        ) || action_metadata
    );
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate admin activity report
CREATE OR REPLACE FUNCTION public.auth_generate_admin_activity_report(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    user_email TEXT,
    admin_level TEXT,
    action_count BIGINT,
    last_action TIMESTAMPTZ,
    high_risk_actions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.email,
        (sal.metadata->>'admin_permission_level')::TEXT,
        COUNT(*) as action_count,
        MAX(sal.created_at) as last_action,
        COUNT(*) FILTER (
            WHERE sal.metadata->>'admin_action' IN (
                'super_admin_privilege_escalation',
                'admin_permission_granted',
                'admin_permission_revoked',
                'database_maintenance'
            )
        ) as high_risk_actions
    FROM public.security_audit_log sal
    JOIN public.users u ON sal.user_id = u.id
    WHERE sal.action_type = 'admin_action'
    AND sal.created_at BETWEEN start_date AND end_date
    GROUP BY u.email, sal.metadata->>'admin_permission_level'
    ORDER BY action_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ADMIN MONITORING VIEWS
-- =====================================================

-- View for current admin permissions
CREATE OR REPLACE VIEW public.auth_current_admin_permissions AS
SELECT 
    u.email,
    u.role as user_role,
    ap.permission_level,
    ap.allowed_actions,
    ap.expires_at,
    ap.granted_at,
    gb.email as granted_by_email,
    CASE 
        WHEN ap.expires_at IS NULL THEN 'permanent'
        WHEN ap.expires_at > NOW() THEN 'active'
        ELSE 'expired'
    END as permission_status,
    ap.restrictions
FROM public.admin_permissions ap
JOIN public.users u ON ap.user_id = u.id
LEFT JOIN public.users gb ON ap.granted_by = gb.id
WHERE ap.is_active = true
ORDER BY 
    CASE ap.permission_level
        WHEN 'super_admin' THEN 4
        WHEN 'system_admin' THEN 3
        WHEN 'data_admin' THEN 2  
        WHEN 'read_only' THEN 1
    END DESC,
    ap.granted_at DESC;

-- View for admin privilege escalations
CREATE OR REPLACE VIEW public.auth_admin_privilege_escalations AS
SELECT 
    u.email,
    sal.created_at,
    sal.metadata->>'action_category' as escalated_action,
    sal.metadata->>'specific_action' as specific_action,
    sal.ip_address,
    sal.metadata
FROM public.security_audit_log sal
JOIN public.users u ON sal.user_id = u.id
WHERE sal.action_type = 'super_admin_privilege_escalation'
AND sal.created_at > NOW() - INTERVAL '7 days'
ORDER BY sal.created_at DESC;

-- =====================================================
-- ADMIN MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to expire temporary admin permissions
CREATE OR REPLACE FUNCTION public.auth_expire_temporary_admin_permissions() RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.admin_permissions
    SET is_active = false,
        updated_at = NOW()
    WHERE expires_at < NOW()
    AND is_active = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log expiration
    PERFORM public.auth_log_security_event(
        'admin_permissions_expired',
        NULL,
        NULL,
        NULL,
        NULL,
        true,
        NULL,
        jsonb_build_object('expired_permissions', expired_count)
    );
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TYPE admin_permission_level IS 'Admin permission levels with escalating privileges';
COMMENT ON TYPE admin_action_category IS 'Categories of admin actions for granular permission control';
COMMENT ON TABLE public.admin_permissions IS 'Advanced admin permission system with granular controls';

-- COMMENT ON FUNCTION public.auth_get_admin_permission_level() IS 'Gets current user admin permission level';
-- COMMENT ON FUNCTION public.auth_can_perform_admin_action(admin_action_category, TEXT) IS 'Checks if user can perform specific admin action';
-- COMMENT ON FUNCTION public.auth_grant_admin_permission() IS 'Grants admin permissions (super_admin only)';
-- COMMENT ON FUNCTION public.auth_revoke_admin_permission(UUID, TEXT) IS 'Revokes admin permissions (super_admin only)';
-- COMMENT ON FUNCTION public.auth_log_admin_action() IS 'Logs admin actions with enhanced metadata';
-- COMMENT ON FUNCTION public.auth_generate_admin_activity_report() IS 'Generates comprehensive admin activity report';
-- COMMENT ON FUNCTION public.auth_expire_temporary_admin_permissions() IS 'Expires temporary admin permissions';

COMMENT ON VIEW public.auth_current_admin_permissions IS 'Current active admin permissions overview';
COMMENT ON VIEW public.auth_admin_privilege_escalations IS 'Recent admin privilege escalation events';