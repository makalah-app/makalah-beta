-- Migration: Task 7.7 - Admin Configuration and System Prompt Management Schema
-- Description: Implements database schema for editable system prompts, versioning, model configs, and admin settings
-- Author: Database Architect
-- Date: 2025-01-26
-- Task: 7.7 - Admin Configuration and System Prompt Management

-- Create prompt category enum for template organization
CREATE TYPE prompt_category AS ENUM (
    'academic_writing',
    'research_analysis', 
    'content_generation',
    'review_feedback',
    'system_instructions',
    'persona_definitions',
    'tool_instructions',
    'quality_assessment'
);

-- Create setting type enum for admin configurations
CREATE TYPE setting_type AS ENUM (
    'string',
    'integer',
    'decimal',
    'boolean',
    'json',
    'array',
    'url',
    'email'
);

-- Create AI provider enum for model configurations
CREATE TYPE ai_provider AS ENUM (
    'openai',
    'openrouter',
    'anthropic',
    'google',
    'cohere',
    'huggingface'
);

-- ====================================================================
-- 1. SYSTEM_PROMPTS TABLE - Active system prompts untuk setiap phase
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.system_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phase academic_phase NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    priority_order INTEGER DEFAULT 0 NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT system_prompts_name_length CHECK (char_length(name) >= 3),
    CONSTRAINT system_prompts_content_length CHECK (char_length(content) >= 10),
    CONSTRAINT system_prompts_version_positive CHECK (version > 0),
    CONSTRAINT system_prompts_priority_valid CHECK (priority_order >= 0)
);

-- Create unique constraint untuk active prompts per phase
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_prompts_active_phase 
ON public.system_prompts(phase, name) 
WHERE is_active = true;

-- ====================================================================
-- 2. PROMPT_TEMPLATES TABLE - Template library dengan categorization
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.prompt_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category prompt_category NOT NULL,
    description TEXT NULL,
    template_content TEXT NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    usage_count INTEGER DEFAULT 0 NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    tags TEXT[] DEFAULT '{}' NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT prompt_templates_name_length CHECK (char_length(name) >= 3),
    CONSTRAINT prompt_templates_content_length CHECK (char_length(template_content) >= 10),
    CONSTRAINT prompt_templates_usage_count_valid CHECK (usage_count >= 0)
);

-- ====================================================================
-- 3. PROMPT_VERSIONS TABLE - Version history untuk rollback
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.prompt_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_id UUID NOT NULL REFERENCES public.system_prompts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    change_reason TEXT NULL,
    change_description TEXT NULL,
    performance_metrics JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT prompt_versions_version_positive CHECK (version_number > 0),
    CONSTRAINT prompt_versions_content_length CHECK (char_length(content) >= 10),
    CONSTRAINT prompt_versions_unique_version UNIQUE (prompt_id, version_number)
);

-- ====================================================================
-- 4. MODEL_CONFIGS TABLE - Persistent model configuration
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.model_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider ai_provider NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    priority_order INTEGER DEFAULT 0 NOT NULL,
    phase_compatibility academic_phase[] NOT NULL DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}'::jsonb NOT NULL,
    cost_per_token DECIMAL(10,6) NULL,
    max_tokens INTEGER NULL,
    temperature DECIMAL(3,2) NULL CHECK (temperature >= 0.0 AND temperature <= 2.0),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT model_configs_name_length CHECK (char_length(name) >= 3),
    CONSTRAINT model_configs_model_name_length CHECK (char_length(model_name) >= 3),
    CONSTRAINT model_configs_priority_valid CHECK (priority_order >= 0),
    CONSTRAINT model_configs_max_tokens_positive CHECK (max_tokens > 0),
    CONSTRAINT model_configs_cost_positive CHECK (cost_per_token > 0)
);

-- Create unique constraint untuk default model per provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_configs_default_provider 
ON public.model_configs(provider) 
WHERE is_default = true AND is_active = true;

-- ====================================================================
-- 5. ADMIN_SETTINGS TABLE - General admin configuration
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type setting_type NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    description TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    validation_rules JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_sensitive BOOLEAN DEFAULT false NOT NULL,
    is_system BOOLEAN DEFAULT false NOT NULL,
    updated_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT admin_settings_key_format CHECK (setting_key ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT admin_settings_key_length CHECK (char_length(setting_key) >= 3),
    CONSTRAINT admin_settings_value_length CHECK (char_length(setting_value) >= 1),
    CONSTRAINT admin_settings_category_length CHECK (char_length(category) >= 3)
);

-- ====================================================================
-- INDEXES - Performance optimization untuk query patterns
-- ====================================================================

-- System Prompts indexes
CREATE INDEX IF NOT EXISTS idx_system_prompts_phase ON public.system_prompts(phase);
CREATE INDEX IF NOT EXISTS idx_system_prompts_active ON public.system_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_system_prompts_version ON public.system_prompts(version);
CREATE INDEX IF NOT EXISTS idx_system_prompts_created_by ON public.system_prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_system_prompts_created_at ON public.system_prompts(created_at);
CREATE INDEX IF NOT EXISTS idx_system_prompts_priority ON public.system_prompts(priority_order);

-- Prompt Templates indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON public.prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_public ON public.prompt_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_verified ON public.prompt_templates(is_verified);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_usage ON public.prompt_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_by ON public.prompt_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON public.prompt_templates USING GIN(tags);

-- Prompt Versions indexes
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON public.prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_version ON public.prompt_versions(version_number DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_changed_by ON public.prompt_versions(changed_by);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at ON public.prompt_versions(created_at DESC);

-- Model Configs indexes
CREATE INDEX IF NOT EXISTS idx_model_configs_provider ON public.model_configs(provider);
CREATE INDEX IF NOT EXISTS idx_model_configs_active ON public.model_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_model_configs_default ON public.model_configs(is_default);
CREATE INDEX IF NOT EXISTS idx_model_configs_priority ON public.model_configs(priority_order);
CREATE INDEX IF NOT EXISTS idx_model_configs_phase_compat ON public.model_configs USING GIN(phase_compatibility);

-- Admin Settings indexes
CREATE INDEX IF NOT EXISTS idx_admin_settings_category ON public.admin_settings(category);
CREATE INDEX IF NOT EXISTS idx_admin_settings_type ON public.admin_settings(setting_type);
CREATE INDEX IF NOT EXISTS idx_admin_settings_sensitive ON public.admin_settings(is_sensitive);
CREATE INDEX IF NOT EXISTS idx_admin_settings_system ON public.admin_settings(is_system);
CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_by ON public.admin_settings(updated_by);

-- ====================================================================
-- TRIGGERS - Audit trail dan automatic updates
-- ====================================================================

-- System Prompts updated_at trigger
CREATE TRIGGER update_system_prompts_updated_at
    BEFORE UPDATE ON public.system_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Prompt Templates updated_at trigger
CREATE TRIGGER update_prompt_templates_updated_at
    BEFORE UPDATE ON public.prompt_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Model Configs updated_at trigger
CREATE TRIGGER update_model_configs_updated_at
    BEFORE UPDATE ON public.model_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Admin Settings updated_at trigger
CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- ENABLE ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- COMMENTS - Documentation untuk schema
-- ====================================================================

COMMENT ON TABLE public.system_prompts IS 'Active system prompts untuk setiap academic phase dengan versioning support';
COMMENT ON COLUMN public.system_prompts.phase IS 'Academic phase yang menggunakan prompt ini';
COMMENT ON COLUMN public.system_prompts.content IS 'Full prompt content dengan placeholders';
COMMENT ON COLUMN public.system_prompts.is_active IS 'Status aktif prompt untuk production use';
COMMENT ON COLUMN public.system_prompts.version IS 'Current version number dari prompt';
COMMENT ON COLUMN public.system_prompts.priority_order IS 'Order untuk multiple prompts dalam same phase';

COMMENT ON TABLE public.prompt_templates IS 'Reusable prompt templates dengan categorization system';
COMMENT ON COLUMN public.prompt_templates.category IS 'Category untuk organization dan filtering';
COMMENT ON COLUMN public.prompt_templates.template_content IS 'Template dengan parameter placeholders';
COMMENT ON COLUMN public.prompt_templates.parameters IS 'JSON schema untuk required parameters';
COMMENT ON COLUMN public.prompt_templates.is_public IS 'Template visibility untuk users';
COMMENT ON COLUMN public.prompt_templates.is_verified IS 'Quality verification status';

COMMENT ON TABLE public.prompt_versions IS 'Version history untuk system prompts rollback support';
COMMENT ON COLUMN public.prompt_versions.version_number IS 'Incremental version number';
COMMENT ON COLUMN public.prompt_versions.change_reason IS 'Reason untuk version change';
COMMENT ON COLUMN public.prompt_versions.performance_metrics IS 'Performance data untuk version';

COMMENT ON TABLE public.model_configs IS 'AI model configurations dengan provider settings';
COMMENT ON COLUMN public.model_configs.provider IS 'AI service provider (openai, anthropic, etc)';
COMMENT ON COLUMN public.model_configs.parameters IS 'Model-specific parameters (temperature, top_p, etc)';
COMMENT ON COLUMN public.model_configs.phase_compatibility IS 'Academic phases compatible dengan model ini';
COMMENT ON COLUMN public.model_configs.is_default IS 'Default model untuk provider';

COMMENT ON TABLE public.admin_settings IS 'System-wide admin configuration settings';
COMMENT ON COLUMN public.admin_settings.setting_key IS 'Unique setting identifier dalam snake_case';
COMMENT ON COLUMN public.admin_settings.setting_type IS 'Data type untuk validation';
COMMENT ON COLUMN public.admin_settings.validation_rules IS 'JSON schema untuk value validation';
COMMENT ON COLUMN public.admin_settings.is_sensitive IS 'Contains sensitive data (API keys, passwords)';