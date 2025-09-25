-- Migration: Hybrid Provider Architecture Implementation
-- Description: Implements database schema modifications for hybrid provider architecture
--              where text generation providers are dynamic (user choice) but tool execution 
--              providers are fixed (OpenAI for web search)
-- Author: Database Architect  
-- Date: 2025-09-10
-- Task: Task 1 - Database Schema Migration for Hybrid Architecture

-- ====================================================================
-- 1. ENHANCE MODEL_CONFIGS TABLE - Add hybrid architecture support columns
-- ====================================================================

-- Add new columns to support hybrid provider architecture
ALTER TABLE public.model_configs 
ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) DEFAULT 'text_generation' 
    CHECK (purpose IN ('text_generation', 'tool_execution', 'hybrid'));

ALTER TABLE public.model_configs 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'primary' 
    CHECK (role IN ('primary', 'fallback', 'tool_provider'));

-- Add encrypted API key storage for provider-specific configurations
ALTER TABLE public.model_configs 
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;

-- Add API key hint for identification (first 4 + last 4 characters)
ALTER TABLE public.model_configs 
ADD COLUMN IF NOT EXISTS api_key_hint VARCHAR(20);

-- Add tool capabilities array for tool-specific providers
ALTER TABLE public.model_configs 
ADD COLUMN IF NOT EXISTS tool_capabilities TEXT[] DEFAULT '{}';

-- ====================================================================
-- 2. CREATE PROVIDER_TOOLS TABLE - Tool-specific provider mappings
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.provider_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_name VARCHAR(100) NOT NULL,
    provider ai_provider NOT NULL,
    required_model VARCHAR(255),
    api_key_encrypted TEXT,
    is_native BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT provider_tools_tool_name_length CHECK (char_length(tool_name) >= 3),
    CONSTRAINT provider_tools_model_name_length CHECK (
        required_model IS NULL OR char_length(required_model) >= 3
    ),
    CONSTRAINT provider_tools_unique_tool UNIQUE (tool_name, provider)
);

-- ====================================================================
-- 3. CREATE PERFORMANCE INDEXES - Query optimization for hybrid architecture
-- ====================================================================

-- Enhanced model_configs indexes for hybrid architecture queries
CREATE INDEX IF NOT EXISTS idx_model_configs_purpose 
ON public.model_configs(purpose);

CREATE INDEX IF NOT EXISTS idx_model_configs_role_purpose 
ON public.model_configs(role, purpose);

CREATE INDEX IF NOT EXISTS idx_model_configs_tool_capabilities 
ON public.model_configs USING GIN(tool_capabilities);

-- Provider tools indexes for efficient tool lookup
CREATE INDEX IF NOT EXISTS idx_provider_tools_tool_name 
ON public.provider_tools(tool_name);

CREATE INDEX IF NOT EXISTS idx_provider_tools_provider 
ON public.provider_tools(provider);

CREATE INDEX IF NOT EXISTS idx_provider_tools_native 
ON public.provider_tools(is_native);

CREATE INDEX IF NOT EXISTS idx_provider_tools_config 
ON public.provider_tools USING GIN(configuration);

-- ====================================================================
-- 4. INSERT INITIAL TOOL MAPPINGS - Core tool configurations
-- ====================================================================

-- Insert core tool mappings for hybrid architecture
INSERT INTO public.provider_tools (tool_name, provider, required_model, is_native, configuration) 
VALUES 
    ('web_search', 'openai', 'gpt-4o', true, '{
        "search_type": "web",
        "max_results": 10,
        "include_metadata": true,
        "citation_format": "academic"
    }'::jsonb),
    
    ('image_generation', 'openai', 'dall-e-3', true, '{
        "size": "1024x1024",
        "quality": "standard",
        "style": "natural"
    }'::jsonb),
    
    ('code_execution', 'openai', 'gpt-4o', false, '{
        "language_support": ["python", "javascript", "bash"],
        "timeout": 30,
        "memory_limit": "1GB"
    }'::jsonb)
ON CONFLICT (tool_name, provider) DO UPDATE SET
    required_model = EXCLUDED.required_model,
    is_native = EXCLUDED.is_native,
    configuration = EXCLUDED.configuration,
    updated_at = NOW();

-- ====================================================================
-- 5. ENABLE ROW LEVEL SECURITY - Security for new table
-- ====================================================================

ALTER TABLE public.provider_tools ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 6. ADD TRIGGERS - Audit trail for provider_tools
-- ====================================================================

-- Provider tools updated_at trigger
CREATE TRIGGER update_provider_tools_updated_at
    BEFORE UPDATE ON public.provider_tools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 7. ADD COMMENTS - Documentation for new schema elements
-- ====================================================================

-- Model configs new columns comments
COMMENT ON COLUMN public.model_configs.purpose IS 'Model usage purpose: text_generation, tool_execution, or hybrid';
COMMENT ON COLUMN public.model_configs.role IS 'Provider role: primary, fallback, or tool_provider';
COMMENT ON COLUMN public.model_configs.api_key_encrypted IS 'Encrypted API key for provider-specific access';
COMMENT ON COLUMN public.model_configs.api_key_hint IS 'Masked API key hint for identification (first4+last4)';
COMMENT ON COLUMN public.model_configs.tool_capabilities IS 'Array of tools this model/provider supports';

-- Provider tools table comments
COMMENT ON TABLE public.provider_tools IS 'Tool-specific provider mappings for hybrid architecture';
COMMENT ON COLUMN public.provider_tools.tool_name IS 'Name of the tool (web_search, image_generation, etc)';
COMMENT ON COLUMN public.provider_tools.provider IS 'AI provider responsible for this tool';
COMMENT ON COLUMN public.provider_tools.required_model IS 'Specific model required for tool execution';
COMMENT ON COLUMN public.provider_tools.api_key_encrypted IS 'Tool-specific encrypted API key if needed';
COMMENT ON COLUMN public.provider_tools.is_native IS 'Whether tool is natively supported by provider';
COMMENT ON COLUMN public.provider_tools.configuration IS 'Tool-specific configuration parameters';

-- ====================================================================
-- 8. VALIDATION QUERIES - Verify migration success
-- ====================================================================

-- Verify new columns were added successfully
DO $$
BEGIN
    -- Check if all new columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'model_configs' 
        AND column_name IN ('purpose', 'role', 'api_key_encrypted', 'api_key_hint', 'tool_capabilities')
        GROUP BY table_name
        HAVING COUNT(*) = 5
    ) THEN
        RAISE EXCEPTION 'Migration failed: Not all columns added to model_configs table';
    END IF;
    
    -- Check if provider_tools table was created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'provider_tools'
    ) THEN
        RAISE EXCEPTION 'Migration failed: provider_tools table not created';
    END IF;
    
    -- Check if initial tool mappings were inserted
    IF (SELECT COUNT(*) FROM public.provider_tools) < 3 THEN
        RAISE EXCEPTION 'Migration failed: Initial tool mappings not inserted';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully: Hybrid architecture schema implemented';
END
$$;