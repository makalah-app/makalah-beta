-- Migration: Add Perplexity as Web Search Provider
-- Description: Adds Perplexity as an alternative web search provider option
-- Author: System Implementation
-- Date: 2025-09-16
-- Purpose: Enable web search provider switching between OpenAI and Perplexity

-- ====================================================================
-- 1. ADD PERPLEXITY TO PROVIDER_TOOLS TABLE
-- ====================================================================

-- Insert Perplexity web search configuration
INSERT INTO public.provider_tools (tool_name, provider, required_model, is_native, configuration)
VALUES
    ('web_search', 'perplexity', 'sonar-pro', true, '{
        "search_type": "web",
        "max_results": 10,
        "include_metadata": true,
        "citation_format": "academic",
        "provider_features": {
            "real_time_search": true,
            "academic_sources": true,
            "citation_quality": "high",
            "source_verification": true
        }
    }'::jsonb)
ON CONFLICT (tool_name, provider) DO UPDATE SET
    required_model = EXCLUDED.required_model,
    is_native = EXCLUDED.is_native,
    configuration = EXCLUDED.configuration,
    updated_at = NOW();

-- ====================================================================
-- 2. CREATE WEB SEARCH PROVIDER PREFERENCES TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.web_search_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_provider ai_provider NOT NULL DEFAULT 'openai',
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT web_search_preferences_provider_check
        CHECK (preferred_provider IN ('openai', 'perplexity')),
    CONSTRAINT web_search_preferences_unique_user
        UNIQUE (user_id)
);

-- ====================================================================
-- 3. ADD GLOBAL WEB SEARCH CONFIGURATION
-- ====================================================================

-- Add web search provider configuration to admin_configs
INSERT INTO public.admin_configs (key, value, data_type, category, description, metadata, validation_rules, is_sensitive, is_readonly, created_by)
VALUES
    ('web_search_provider', 'openai', 'string', 'features', 'Active web search provider (openai or perplexity)',
     '{"display_order": 65, "options": ["openai", "perplexity"]}',
     '{"enum": ["openai", "perplexity"]}',
     false, false, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    metadata = EXCLUDED.metadata,
    validation_rules = EXCLUDED.validation_rules,
    updated_at = NOW();

-- ====================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ====================================================================

-- Index for web search preferences lookup
CREATE INDEX IF NOT EXISTS idx_web_search_preferences_user_id
ON public.web_search_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_web_search_preferences_provider
ON public.web_search_preferences(preferred_provider);

-- ====================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE public.web_search_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "web_search_preferences_user_manage" ON public.web_search_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin users can view all preferences
CREATE POLICY "web_search_preferences_admin_view" ON public.web_search_preferences
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'admin'
        )
    );

-- ====================================================================
-- 6. ADD TRIGGER FOR UPDATED_AT
-- ====================================================================

CREATE TRIGGER update_web_search_preferences_updated_at
    BEFORE UPDATE ON public.web_search_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE public.web_search_preferences IS 'User preferences for web search provider selection';
COMMENT ON COLUMN public.web_search_preferences.user_id IS 'Reference to user who owns these preferences';
COMMENT ON COLUMN public.web_search_preferences.preferred_provider IS 'Selected web search provider (openai or perplexity)';
COMMENT ON COLUMN public.web_search_preferences.configuration IS 'Additional provider-specific configuration';

-- ====================================================================
-- 8. VALIDATION QUERIES
-- ====================================================================

DO $$
BEGIN
    -- Check if Perplexity was added to provider_tools
    IF NOT EXISTS (
        SELECT 1 FROM public.provider_tools
        WHERE tool_name = 'web_search'
        AND provider = 'perplexity'
    ) THEN
        RAISE EXCEPTION 'Migration failed: Perplexity not added to provider_tools';
    END IF;

    -- Check if web_search_preferences table was created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'web_search_preferences'
    ) THEN
        RAISE EXCEPTION 'Migration failed: web_search_preferences table not created';
    END IF;

    -- Check if web_search_provider config was added
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_configs
        WHERE key = 'web_search_provider'
    ) THEN
        RAISE EXCEPTION 'Migration failed: web_search_provider config not added';
    END IF;

    RAISE NOTICE 'Migration completed successfully: Perplexity web search provider added';
END
$$;