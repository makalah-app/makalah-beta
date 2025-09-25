-- Migration: Increase System Prompt Character Limit from 12,000 to 12,500
-- Description: Updates database constraints and validation for system prompt content
-- Author: System Administrator
-- Date: 2025-09-15
-- Task: Increase system prompt character capacity to support optimized prompts

-- ====================================================================
-- HANDLE EXISTING DATA THAT EXCEEDS NEW LIMIT
-- ====================================================================

-- Update prompt_versions that exceed 12500 characters by truncating them
UPDATE public.prompt_versions
SET content = LEFT(content, 12500)
WHERE char_length(content) > 12500;

-- Log the number of records updated
DO $$
DECLARE
    update_count INTEGER;
BEGIN
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % prompt_versions records that exceeded 12,500 characters', update_count;
END $$;

-- ====================================================================
-- UPDATE SYSTEM_PROMPTS TABLE CONSTRAINTS
-- ====================================================================

-- Drop existing constraint if it exists (may not exist in current schema)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'system_prompts_content_max_length'
    ) THEN
        ALTER TABLE public.system_prompts DROP CONSTRAINT system_prompts_content_max_length;
        RAISE NOTICE 'Dropped existing constraint: system_prompts_content_max_length';
    END IF;
END $$;

-- Add new character limit constraint to system_prompts table
ALTER TABLE public.system_prompts
ADD CONSTRAINT system_prompts_content_max_length
CHECK (char_length(content) <= 12500);

-- ====================================================================
-- UPDATE PROMPT_VERSIONS TABLE CONSTRAINTS
-- ====================================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'prompt_versions_content_max_length'
    ) THEN
        ALTER TABLE public.prompt_versions DROP CONSTRAINT prompt_versions_content_max_length;
        RAISE NOTICE 'Dropped existing constraint: prompt_versions_content_max_length';
    END IF;
END $$;

-- Add new character limit constraint to prompt_versions table
ALTER TABLE public.prompt_versions
ADD CONSTRAINT prompt_versions_content_max_length
CHECK (char_length(content) <= 12500);

-- ====================================================================
-- UPDATE PROMPT_TEMPLATES TABLE CONSTRAINTS
-- ====================================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'prompt_templates_content_max_length'
    ) THEN
        ALTER TABLE public.prompt_templates DROP CONSTRAINT prompt_templates_content_max_length;
        RAISE NOTICE 'Dropped existing constraint: prompt_templates_content_max_length';
    END IF;
END $$;

-- Add new character limit constraint to prompt_templates table
ALTER TABLE public.prompt_templates
ADD CONSTRAINT prompt_templates_content_max_length
CHECK (char_length(template_content) <= 12500);

-- ====================================================================
-- VALIDATION AND VERIFICATION
-- ====================================================================

-- Test that constraints are properly applied
DO $$
BEGIN
    -- Test system_prompts constraint
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'system_prompts'
        AND c.conname = 'system_prompts_content_max_length'
    ) THEN
        RAISE EXCEPTION 'Failed to create system_prompts_content_max_length constraint';
    END IF;

    -- Test prompt_versions constraint
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'prompt_versions'
        AND c.conname = 'prompt_versions_content_max_length'
    ) THEN
        RAISE EXCEPTION 'Failed to create prompt_versions_content_max_length constraint';
    END IF;

    -- Test prompt_templates constraint
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'prompt_templates'
        AND c.conname = 'prompt_templates_content_max_length'
    ) THEN
        RAISE EXCEPTION 'Failed to create prompt_templates_content_max_length constraint';
    END IF;

    RAISE NOTICE 'All character limit constraints successfully created';
END $$;

-- ====================================================================
-- COMMENTS AND DOCUMENTATION
-- ====================================================================

COMMENT ON CONSTRAINT system_prompts_content_max_length ON public.system_prompts IS
'Maximum character limit for system prompt content: 12,500 characters (increased from 12,000)';

COMMENT ON CONSTRAINT prompt_versions_content_max_length ON public.prompt_versions IS
'Maximum character limit for prompt version content: 12,500 characters (increased from 12,000)';

COMMENT ON CONSTRAINT prompt_templates_content_max_length ON public.prompt_templates IS
'Maximum character limit for prompt template content: 12,500 characters (increased from 12,000)';

-- Migration completed successfully
SELECT 'Migration 20250915001_increase_system_prompt_character_limit completed successfully' as migration_status;