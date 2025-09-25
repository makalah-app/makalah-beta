-- Migration: Session Security Implementation  
-- Description: Advanced session management dengan JWT integration dan security controls
-- Author: Database Security Architect
-- Date: 2025-01-25
-- Task: 08 - Row Level Security Implementation

-- =====================================================
-- ENHANCED JWT AND SESSION SECURITY FUNCTIONS
-- =====================================================

-- Function to extract JWT claims securely
CREATE OR REPLACE FUNCTION public.auth_get_jwt_claim(claim_name TEXT) RETURNS TEXT AS $$
DECLARE
    jwt_claims JSON;
    claim_value TEXT;
BEGIN
    -- Extract JWT claims with error handling
    BEGIN
        jwt_claims := current_setting('request.jwt.claims', true)::JSON;
        claim_value := jwt_claims ->> claim_name;
    EXCEPTION 
        WHEN OTHERS THEN
            -- Fallback to direct setting access
            BEGIN
                claim_value := current_setting('request.jwt.' || claim_name, true);
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN NULL;
            END;
    END;
    
    RETURN claim_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check JWT token expiration
CREATE OR REPLACE FUNCTION public.auth_is_jwt_expired() RETURNS BOOLEAN AS $$
DECLARE
    exp_timestamp INTEGER;
    current_time_epoch INTEGER;
BEGIN
    -- Get expiration timestamp from JWT
    exp_timestamp := COALESCE(public.auth_get_jwt_claim('exp')::INTEGER, 0);
    current_time_epoch := EXTRACT(EPOCH FROM NOW())::INTEGER;
    
    RETURN exp_timestamp > 0 AND current_time_epoch > exp_timestamp;
EXCEPTION
    WHEN OTHERS THEN
        RETURN true; -- Default to expired on error
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session integrity
CREATE OR REPLACE FUNCTION public.auth_validate_session_integrity(session_uuid UUID DEFAULT NULL) RETURNS BOOLEAN AS $$
DECLARE
    user_uuid UUID;
    session_data RECORD;
    jwt_user_id UUID;
    jwt_session_id UUID;
BEGIN
    -- Get user ID from JWT
    jwt_user_id := public.auth_user_id();
    jwt_session_id := COALESCE(session_uuid, public.auth_get_jwt_claim('session_id')::UUID);
    
    -- Return false if no user or expired token
    IF jwt_user_id IS NULL OR public.auth_is_jwt_expired() THEN
        RETURN false;
    END IF;
    
    -- Validate against user_sessions table if session_id provided
    IF jwt_session_id IS NOT NULL THEN
        SELECT user_id, expires_at, is_active, ip_address 
        INTO session_data
        FROM public.user_sessions 
        WHERE id = jwt_session_id;
        
        -- Check session validity
        IF NOT FOUND OR 
           session_data.user_id != jwt_user_id OR
           session_data.expires_at < NOW() OR
           NOT session_data.is_active THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Validate user account status
    SELECT is_active INTO user_uuid FROM public.users WHERE id = jwt_user_id;
    IF NOT FOUND OR NOT user_uuid THEN
        RETURN false;
    END IF;
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check concurrent session limits
CREATE OR REPLACE FUNCTION public.auth_check_concurrent_session_limit(user_uuid UUID) RETURNS BOOLEAN AS $$
DECLARE
    active_sessions INTEGER;
    max_sessions INTEGER := 5; -- Default limit
    user_role TEXT;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM public.users WHERE id = user_uuid;
    
    -- Set different limits based on role
    CASE user_role
        WHEN 'admin' THEN max_sessions := 10;
        WHEN 'researcher' THEN max_sessions := 7;
        WHEN 'reviewer' THEN max_sessions := 7;
        ELSE max_sessions := 5;
    END CASE;
    
    -- Count active sessions
    SELECT COUNT(*) INTO active_sessions
    FROM public.user_sessions
    WHERE user_id = user_uuid 
    AND is_active = true 
    AND expires_at > NOW();
    
    RETURN active_sessions < max_sessions;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION public.auth_log_security_event(
    event_type TEXT,
    user_uuid UUID DEFAULT NULL,
    session_uuid UUID DEFAULT NULL,
    ip_addr INET DEFAULT NULL,
    user_agent_str TEXT DEFAULT NULL,
    success_status BOOLEAN DEFAULT true,
    error_msg TEXT DEFAULT NULL,
    event_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.security_audit_log (
        user_id,
        action_type,
        table_name,
        record_id,
        ip_address,
        user_agent,
        success,
        error_message,
        metadata
    ) VALUES (
        COALESCE(user_uuid, public.auth_user_id()),
        event_type,
        'session_security',
        session_uuid,
        ip_addr,
        user_agent_str,
        success_status,
        error_msg,
        event_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SESSION LIFECYCLE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create secure session
CREATE OR REPLACE FUNCTION public.auth_create_secure_session(
    user_uuid UUID,
    session_duration INTERVAL DEFAULT '24 hours',
    ip_addr INET DEFAULT NULL,
    user_agent_str TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    session_id UUID;
    current_sessions INTEGER;
BEGIN
    -- Check concurrent session limits
    IF NOT public.auth_check_concurrent_session_limit(user_uuid) THEN
        -- Clean up oldest inactive sessions
        DELETE FROM public.user_sessions 
        WHERE user_id = user_uuid 
        AND (is_active = false OR expires_at < NOW())
        AND id NOT IN (
            SELECT id FROM public.user_sessions 
            WHERE user_id = user_uuid 
            ORDER BY last_accessed_at DESC 
            LIMIT 3
        );
        
        -- If still over limit, fail
        IF NOT public.auth_check_concurrent_session_limit(user_uuid) THEN
            PERFORM public.auth_log_security_event(
                'session_limit_exceeded',
                user_uuid,
                NULL,
                ip_addr,
                user_agent_str,
                false,
                'Maximum concurrent sessions exceeded'
            );
            RAISE EXCEPTION 'Maximum concurrent sessions exceeded';
        END IF;
    END IF;
    
    -- Create new session
    INSERT INTO public.user_sessions (
        user_id,
        session_token,
        ip_address,
        user_agent,
        expires_at,
        is_active
    ) VALUES (
        user_uuid,
        encode(gen_random_bytes(32), 'base64'),
        ip_addr,
        user_agent_str,
        NOW() + session_duration,
        true
    ) RETURNING id INTO session_id;
    
    -- Log session creation
    PERFORM public.auth_log_security_event(
        'session_created',
        user_uuid,
        session_id,
        ip_addr,
        user_agent_str,
        true,
        NULL,
        jsonb_build_object('session_duration', session_duration::TEXT)
    );
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh session
CREATE OR REPLACE FUNCTION public.auth_refresh_session(
    session_uuid UUID,
    extend_duration INTERVAL DEFAULT '24 hours'
) RETURNS BOOLEAN AS $$
DECLARE
    session_data RECORD;
    user_uuid UUID;
BEGIN
    -- Get current session data
    SELECT user_id, expires_at, is_active, ip_address, user_agent
    INTO session_data
    FROM public.user_sessions
    WHERE id = session_uuid;
    
    -- Validate session exists and is active
    IF NOT FOUND OR NOT session_data.is_active THEN
        RETURN false;
    END IF;
    
    -- Update session expiration and activity
    UPDATE public.user_sessions
    SET expires_at = NOW() + extend_duration,
        last_accessed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_uuid;
    
    -- Log session refresh
    PERFORM public.auth_log_security_event(
        'session_refreshed',
        session_data.user_id,
        session_uuid,
        session_data.ip_address,
        session_data.user_agent,
        true,
        NULL,
        jsonb_build_object('extended_by', extend_duration::TEXT)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate session
CREATE OR REPLACE FUNCTION public.auth_invalidate_session(
    session_uuid UUID,
    reason TEXT DEFAULT 'manual_logout'
) RETURNS BOOLEAN AS $$
DECLARE
    session_data RECORD;
BEGIN
    -- Get session data before invalidation
    SELECT user_id, ip_address, user_agent
    INTO session_data
    FROM public.user_sessions
    WHERE id = session_uuid;
    
    -- Update session to inactive
    UPDATE public.user_sessions
    SET is_active = false,
        expires_at = NOW(),
        updated_at = NOW()
    WHERE id = session_uuid;
    
    -- Log session invalidation
    IF FOUND THEN
        PERFORM public.auth_log_security_event(
            'session_invalidated',
            session_data.user_id,
            session_uuid,
            session_data.ip_address,
            session_data.user_agent,
            true,
            NULL,
            jsonb_build_object('reason', reason)
        );
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.auth_cleanup_expired_sessions() RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Count sessions to be cleaned
    SELECT COUNT(*) INTO cleanup_count
    FROM public.user_sessions
    WHERE expires_at < NOW() OR is_active = false;
    
    -- Delete expired sessions
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW() - INTERVAL '7 days' -- Keep for 7 days for audit
    OR (is_active = false AND updated_at < NOW() - INTERVAL '1 day');
    
    -- Log cleanup operation
    PERFORM public.auth_log_security_event(
        'session_cleanup',
        NULL,
        NULL,
        NULL,
        NULL,
        true,
        NULL,
        jsonb_build_object('cleaned_sessions', cleanup_count)
    );
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENHANCED RLS POLICIES WITH SESSION VALIDATION
-- =====================================================

-- Drop existing basic policies and create enhanced ones
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_own" ON public.user_sessions;

-- Enhanced session policies with integrity validation
CREATE POLICY "user_sessions_select_validated" ON public.user_sessions
    FOR SELECT
    TO authenticated
    USING (
        (user_id = public.auth_user_id() AND public.auth_validate_session_integrity()) OR
        public.auth_is_admin()
    );

-- Policy: Only system can insert sessions (through functions)
CREATE POLICY "user_sessions_system_insert_only" ON public.user_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (false); -- All inserts must go through auth functions

-- Policy: Users can update their own sessions (for activity tracking)
CREATE POLICY "user_sessions_update_validated" ON public.user_sessions
    FOR UPDATE
    TO authenticated
    USING (
        user_id = public.auth_user_id() AND 
        public.auth_validate_session_integrity(id)
    )
    WITH CHECK (
        user_id = public.auth_user_id() AND
        public.auth_validate_session_integrity(id)
    );

-- Policy: Users can invalidate their own sessions
CREATE POLICY "user_sessions_invalidate_own" ON public.user_sessions
    FOR UPDATE
    TO authenticated
    USING (user_id = public.auth_user_id())
    WITH CHECK (user_id = public.auth_user_id() AND is_active = false);

-- Policy: System-level session deletion for cleanup
CREATE POLICY "user_sessions_system_delete_only" ON public.user_sessions
    FOR DELETE
    TO authenticated
    USING (false); -- All deletions must go through auth functions

-- =====================================================
-- SESSION SECURITY TRIGGERS
-- =====================================================

-- Trigger to log session access attempts
CREATE OR REPLACE FUNCTION log_session_access_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Log all session table access attempts
    IF TG_OP = 'SELECT' THEN
        PERFORM public.auth_log_security_event(
            'session_access_attempt',
            public.auth_user_id(),
            NEW.id,
            NULL,
            NULL,
            true,
            NULL,
            jsonb_build_object(
                'operation', TG_OP,
                'table', TG_TABLE_NAME
            )
        );
        RETURN NEW;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER for session access logging (DISABLED: PostgreSQL doesn't support SELECT triggers)
-- CREATE TRIGGER log_user_sessions_access
--     AFTER SELECT ON public.user_sessions
--     FOR EACH ROW
--     EXECUTE FUNCTION log_session_access_attempt();

-- Trigger to validate session updates
CREATE OR REPLACE FUNCTION validate_session_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent updating critical session fields
    IF OLD.id != NEW.id OR OLD.user_id != NEW.user_id THEN
        RAISE EXCEPTION 'Cannot modify session ID or user ID';
    END IF;
    
    -- Validate session state transitions
    IF OLD.is_active = true AND NEW.is_active = false THEN
        -- Session being deactivated
        NEW.expires_at := NOW();
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
        -- Prevent reactivating expired sessions
        RAISE EXCEPTION 'Cannot reactivate expired session';
    END IF;
    
    -- Update activity timestamp
    NEW.last_accessed_at := NOW();
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_user_sessions_updates
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION validate_session_updates();

-- =====================================================
-- SECURITY MONITORING VIEWS
-- =====================================================

-- View for active sessions monitoring
CREATE OR REPLACE VIEW public.auth_active_sessions_monitor AS
SELECT 
    us.id,
    us.user_id,
    u.email,
    u.role,
    us.ip_address,
    us.created_at,
    us.last_accessed_at,
    us.expires_at,
    EXTRACT(EPOCH FROM (us.expires_at - NOW())) / 60 AS minutes_until_expiry,
    CASE 
        WHEN us.last_accessed_at > NOW() - INTERVAL '5 minutes' THEN 'active'
        WHEN us.last_accessed_at > NOW() - INTERVAL '30 minutes' THEN 'idle'
        ELSE 'inactive'
    END AS session_status
FROM public.user_sessions us
JOIN public.users u ON us.user_id = u.id
WHERE us.is_active = true 
AND us.expires_at > NOW()
ORDER BY us.last_accessed_at DESC;

-- View for security alerts
CREATE OR REPLACE VIEW public.auth_security_alerts AS
SELECT 
    sal.id,
    sal.user_id,
    u.email,
    sal.action_type,
    sal.success,
    sal.error_message,
    sal.ip_address,
    sal.created_at,
    CASE
        WHEN sal.action_type = 'session_limit_exceeded' THEN 'HIGH'
        WHEN sal.action_type LIKE '%_failed' THEN 'MEDIUM'
        WHEN sal.success = false THEN 'MEDIUM'
        ELSE 'LOW'
    END AS severity
FROM public.security_audit_log sal
LEFT JOIN public.users u ON sal.user_id = u.id
WHERE sal.created_at > NOW() - INTERVAL '24 hours'
AND (
    sal.success = false OR
    sal.action_type IN ('session_limit_exceeded', 'unauthorized_access', 'suspicious_activity')
)
ORDER BY sal.created_at DESC;

-- =====================================================
-- SCHEDULED CLEANUP FUNCTION
-- =====================================================

-- Function to be called by pg_cron for regular cleanup
CREATE OR REPLACE FUNCTION public.auth_scheduled_security_maintenance() RETURNS void AS $$
DECLARE
    cleanup_result INTEGER;
BEGIN
    -- Cleanup expired sessions
    cleanup_result := public.auth_cleanup_expired_sessions();
    
    -- Log maintenance completion
    PERFORM public.auth_log_security_event(
        'security_maintenance',
        NULL,
        NULL,
        NULL,
        NULL,
        true,
        NULL,
        jsonb_build_object(
            'cleaned_sessions', cleanup_result,
            'maintenance_type', 'scheduled'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

-- COMMENT ON FUNCTION public.auth_get_jwt_claim(TEXT) IS 'Safely extracts claims from JWT token';
-- COMMENT ON FUNCTION public.auth_is_jwt_expired() IS 'Checks if current JWT token has expired';
-- COMMENT ON FUNCTION public.auth_validate_session_integrity(UUID) IS 'Validates complete session integrity including JWT and database state';
-- COMMENT ON FUNCTION public.auth_check_concurrent_session_limit(UUID) IS 'Enforces concurrent session limits per user role';
-- COMMENT ON FUNCTION public.auth_log_security_event(TEXT, UUID, UUID, INET, TEXT, BOOLEAN, TEXT, JSONB) IS 'Logs security events to audit trail';
-- COMMENT ON FUNCTION public.auth_create_secure_session() IS 'Creates new session with security validations';
-- COMMENT ON FUNCTION public.auth_refresh_session(UUID, INTERVAL) IS 'Refreshes session expiration with logging';
-- COMMENT ON FUNCTION public.auth_invalidate_session(UUID, TEXT) IS 'Securely invalidates session with reason logging';
-- COMMENT ON FUNCTION public.auth_cleanup_expired_sessions() IS 'Cleans up expired and inactive sessions';
-- COMMENT ON FUNCTION public.auth_scheduled_security_maintenance() IS 'Scheduled maintenance function for security cleanup';

COMMENT ON VIEW public.auth_active_sessions_monitor IS 'Real-time monitoring view for active user sessions';
COMMENT ON VIEW public.auth_security_alerts IS 'Security alerts and failed authentication attempts';