-- Migration: Create Users Table
-- Description: Core users table with UUID primary keys and JWT integration support
-- Author: Database Architect
-- Date: 2025-01-25

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMPTZ NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'user', 'researcher', 'reviewer')),
    last_login_at TIMESTAMPTZ NULL,
    login_count INTEGER DEFAULT 0 NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON public.users(last_login_at);

-- Create updated_at trigger
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.users IS 'Core users table with authentication and authorization data';
COMMENT ON COLUMN public.users.id IS 'Primary key using UUID for security';
COMMENT ON COLUMN public.users.email IS 'Unique user email address';
COMMENT ON COLUMN public.users.password_hash IS 'Hashed password using bcrypt';
COMMENT ON COLUMN public.users.email_verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN public.users.is_active IS 'User account status';
COMMENT ON COLUMN public.users.role IS 'User role for authorization (admin, user, researcher, reviewer)';
COMMENT ON COLUMN public.users.last_login_at IS 'Last successful login timestamp';
COMMENT ON COLUMN public.users.login_count IS 'Total number of successful logins';
COMMENT ON COLUMN public.users.failed_login_attempts IS 'Counter for failed login attempts';
COMMENT ON COLUMN public.users.locked_until IS 'Account lock expiration timestamp';