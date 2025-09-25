-- Migration: Create User Preferences Table
-- Description: User preference storage for AI workflow and application settings
-- Author: Database Architect
-- Date: 2025-01-25

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ai_provider VARCHAR(50) DEFAULT 'openai' CHECK (ai_provider IN ('openai', 'openrouter', 'anthropic')),
    ai_model VARCHAR(100) DEFAULT 'gpt-4o-mini' NOT NULL,
    ai_temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (ai_temperature >= 0.0 AND ai_temperature <= 2.0),
    ai_max_tokens INTEGER DEFAULT 4000 CHECK (ai_max_tokens > 0 AND ai_max_tokens <= 128000),
    preferred_workflow_persona VARCHAR(50) DEFAULT 'academic_researcher' NOT NULL,
    auto_approve_phases TEXT[] DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{"email": true, "browser": true, "workflow": true, "approval": true}'::jsonb,
    ui_theme VARCHAR(20) DEFAULT 'light' CHECK (ui_theme IN ('light', 'dark', 'auto')),
    ui_language VARCHAR(10) DEFAULT 'id' CHECK (ui_language IN ('id', 'en')),
    ui_density VARCHAR(20) DEFAULT 'comfortable' CHECK (ui_density IN ('compact', 'comfortable', 'spacious')),
    editor_preferences JSONB DEFAULT '{"font_size": 14, "line_height": 1.5, "word_wrap": true, "syntax_highlight": true}'::jsonb,
    workflow_preferences JSONB DEFAULT '{"auto_save": true, "save_interval": 30, "show_progress": true, "detailed_logging": false}'::jsonb,
    privacy_preferences JSONB DEFAULT '{"analytics": true, "usage_data": true, "ai_training": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_ai_provider ON public.user_preferences(ai_provider);
CREATE INDEX IF NOT EXISTS idx_user_preferences_workflow_persona ON public.user_preferences(preferred_workflow_persona);
CREATE INDEX IF NOT EXISTS idx_user_preferences_created_at ON public.user_preferences(created_at);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_user_preferences_notification ON public.user_preferences USING gin(notification_preferences);
CREATE INDEX IF NOT EXISTS idx_user_preferences_editor ON public.user_preferences USING gin(editor_preferences);
CREATE INDEX IF NOT EXISTS idx_user_preferences_workflow ON public.user_preferences USING gin(workflow_preferences);
CREATE INDEX IF NOT EXISTS idx_user_preferences_privacy ON public.user_preferences USING gin(privacy_preferences);

-- Create updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate AI preferences
CREATE OR REPLACE FUNCTION validate_ai_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate AI model based on provider
    IF NEW.ai_provider = 'openai' AND NEW.ai_model NOT LIKE 'gpt-%' THEN
        RAISE EXCEPTION 'Invalid AI model for OpenAI provider: %', NEW.ai_model;
    END IF;
    
    IF NEW.ai_provider = 'openrouter' AND NEW.ai_model NOT LIKE '%/%' THEN
        RAISE EXCEPTION 'Invalid AI model format for OpenRouter provider: %', NEW.ai_model;
    END IF;
    
    -- Validate workflow persona exists
    IF NEW.preferred_workflow_persona NOT IN ('academic_researcher', 'literature_reviewer', 'thesis_writer', 'paper_analyst') THEN
        RAISE EXCEPTION 'Invalid workflow persona: %', NEW.preferred_workflow_persona;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create validation trigger
CREATE TRIGGER validate_user_preferences
    BEFORE INSERT OR UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION validate_ai_preferences();

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE public.user_preferences IS 'User preferences for AI workflow and application settings';
COMMENT ON COLUMN public.user_preferences.ai_provider IS 'Preferred AI provider (openai, openrouter, anthropic)';
COMMENT ON COLUMN public.user_preferences.ai_model IS 'Specific AI model to use';
COMMENT ON COLUMN public.user_preferences.ai_temperature IS 'AI response creativity level (0.0-2.0)';
COMMENT ON COLUMN public.user_preferences.ai_max_tokens IS 'Maximum tokens per AI response';
COMMENT ON COLUMN public.user_preferences.preferred_workflow_persona IS 'Default AI persona for workflow';
COMMENT ON COLUMN public.user_preferences.auto_approve_phases IS 'Array of workflow phases to auto-approve';
COMMENT ON COLUMN public.user_preferences.notification_preferences IS 'JSON notification settings';
COMMENT ON COLUMN public.user_preferences.ui_theme IS 'User interface theme preference';
COMMENT ON COLUMN public.user_preferences.editor_preferences IS 'JSON editor configuration';
COMMENT ON COLUMN public.user_preferences.workflow_preferences IS 'JSON workflow behavior settings';
COMMENT ON COLUMN public.user_preferences.privacy_preferences IS 'JSON privacy and data usage settings';