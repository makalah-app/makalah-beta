-- Migration: Create User Profiles Table
-- Description: Extended user profile information with academic preferences
-- Author: Database Architect
-- Date: 2025-01-25

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NULL,
    avatar_url TEXT NULL,
    bio TEXT NULL,
    academic_title VARCHAR(100) NULL,
    institution VARCHAR(200) NULL,
    department VARCHAR(200) NULL,
    research_interests TEXT[] NULL,
    expertise_domains TEXT[] NULL,
    preferred_citation_style VARCHAR(50) DEFAULT 'APA' CHECK (preferred_citation_style IN ('APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver')),
    preferred_language VARCHAR(10) DEFAULT 'id' CHECK (preferred_language IN ('id', 'en')),
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta' NOT NULL,
    academic_level VARCHAR(50) DEFAULT 'undergraduate' CHECK (academic_level IN ('undergraduate', 'graduate', 'doctoral', 'postdoc', 'faculty', 'researcher')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_institution ON public.user_profiles(institution);
CREATE INDEX IF NOT EXISTS idx_user_profiles_academic_level ON public.user_profiles(academic_level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_research_interests ON public.user_profiles USING gin(research_interests);
CREATE INDEX IF NOT EXISTS idx_user_profiles_expertise_domains ON public.user_profiles USING gin(expertise_domains);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);

-- Create immutable function for text search
CREATE OR REPLACE FUNCTION public.user_profile_search_text(bio text, research_interests text[])
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT to_tsvector('simple', coalesce(bio, '') || ' ' || coalesce(array_to_string(research_interests, ' '), ''))
$$;

-- Create full text search index using immutable function
CREATE INDEX IF NOT EXISTS idx_user_profiles_search ON public.user_profiles USING gin(
    public.user_profile_search_text(bio, research_interests)
);

-- Create updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profile information with academic data';
COMMENT ON COLUMN public.user_profiles.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN public.user_profiles.display_name IS 'Public display name, defaults to first_name + last_name';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'URL to user avatar image in Supabase Storage';
COMMENT ON COLUMN public.user_profiles.academic_title IS 'Academic title (Dr., Prof., etc.)';
COMMENT ON COLUMN public.user_profiles.research_interests IS 'Array of research interest keywords';
COMMENT ON COLUMN public.user_profiles.expertise_domains IS 'Array of expertise domain keywords';
COMMENT ON COLUMN public.user_profiles.preferred_citation_style IS 'Default citation style for academic work';
COMMENT ON COLUMN public.user_profiles.timezone IS 'User timezone for scheduling and timestamps';