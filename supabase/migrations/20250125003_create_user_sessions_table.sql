-- Migration: Create User Sessions Table
-- Description: User session management for JWT token tracking and security
-- Author: Database Architect
-- Date: 2025-01-25

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE NULL,
    device_info JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON public.user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON public.user_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_accessed ON public.user_sessions(last_accessed_at);

-- Create composite index for active session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_lookup ON public.user_sessions(user_id, is_active, expires_at);

-- Create updated_at trigger
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically deactivate expired sessions
CREATE OR REPLACE FUNCTION deactivate_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    -- Deactivate expired sessions for this user
    UPDATE public.user_sessions 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = NEW.user_id 
    AND expires_at < NOW() 
    AND is_active = true;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to deactivate expired sessions on new session creation
CREATE TRIGGER cleanup_expired_sessions
    AFTER INSERT ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_expired_sessions();

-- Create function to clean up old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    -- Delete inactive sessions older than 30 days
    DELETE FROM public.user_sessions
    WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '30 days';
    
    -- Deactivate expired active sessions
    UPDATE public.user_sessions
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true 
    AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.user_sessions IS 'User session management for JWT tokens and security tracking';
COMMENT ON COLUMN public.user_sessions.session_token IS 'JWT access token hash for session validation';
COMMENT ON COLUMN public.user_sessions.refresh_token IS 'Refresh token for extending session';
COMMENT ON COLUMN public.user_sessions.device_info IS 'JSON object containing device information';
COMMENT ON COLUMN public.user_sessions.ip_address IS 'IP address of the session';
COMMENT ON COLUMN public.user_sessions.user_agent IS 'Browser/client user agent string';
COMMENT ON COLUMN public.user_sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN public.user_sessions.last_accessed_at IS 'Last time session was used';