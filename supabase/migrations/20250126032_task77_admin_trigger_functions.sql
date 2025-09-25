-- Migration: Task 7.7 - Admin Configuration Trigger Functions
-- Description: Advanced trigger functions untuk audit trail, versioning, dan validation
-- Author: Database Architect
-- Date: 2025-01-26
-- Task: 7.7 - Admin Configuration and System Prompt Management Triggers

-- ====================================================================
-- AUDIT TRAIL FUNCTIONS
-- ====================================================================

-- Function untuk create audit log entry
CREATE OR REPLACE FUNCTION create_admin_audit_log(
    table_name TEXT,
    record_id UUID,
    action_type TEXT,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    audit_id UUID;
BEGIN
    -- Create audit log entry (akan implement table ini nanti jika diperlukan)
    -- Untuk sekarang, kita log ke system logs
    RAISE LOG 'ADMIN_AUDIT: table=%, id=%, action=%, user=%', 
        table_name, record_id, action_type, COALESCE(user_id, 'system');
        
    RETURN gen_random_uuid();
EXCEPTION
    WHEN OTHERS THEN
        -- Log error tapi tidak fail transaction
        RAISE LOG 'AUDIT_ERROR: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- ====================================================================
-- SYSTEM PROMPTS TRIGGER FUNCTIONS
-- ====================================================================

-- Auto-versioning trigger untuk system prompts
CREATE OR REPLACE FUNCTION system_prompts_auto_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    version_id UUID;
BEGIN
    -- Only trigger on content changes
    IF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
        -- Create version record automatically
        INSERT INTO public.prompt_versions (
            prompt_id,
            version_number,
            content,
            metadata,
            parameters,
            changed_by,
            change_reason,
            change_description
        ) VALUES (
            OLD.id,
            OLD.version,
            OLD.content,
            OLD.metadata,
            OLD.parameters,
            COALESCE(NEW.updated_by, auth.uid()),
            'Auto-versioned on update',
            format('Content updated from version %s to %s', OLD.version, NEW.version)
        ) RETURNING id INTO version_id;
        
        -- Log audit trail
        PERFORM create_admin_audit_log(
            'system_prompts',
            OLD.id,
            'version_created',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        
        RAISE LOG 'PROMPT_VERSION_CREATED: prompt_id=%, version_id=%, old_version=%, new_version=%', 
            OLD.id, version_id, OLD.version, NEW.version;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Validation trigger untuk system prompts
CREATE OR REPLACE FUNCTION validate_system_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Validate phase exists in enum
    IF NEW.phase IS NOT NULL THEN
        PERFORM 1 WHERE NEW.phase::text = ANY(
            SELECT unnest(enum_range(NULL::academic_phase))::text
        );
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid academic phase: %', NEW.phase;
        END IF;
    END IF;
    
    -- Validate content not empty after trim
    IF NEW.content IS NOT NULL AND trim(NEW.content) = '' THEN
        RAISE EXCEPTION 'Prompt content cannot be empty or whitespace only';
    END IF;
    
    -- Check for duplicate active prompts dengan same name and phase
    IF NEW.is_active = true THEN
        SELECT COUNT(*) INTO active_count
        FROM public.system_prompts
        WHERE phase = NEW.phase 
        AND name = NEW.name 
        AND is_active = true 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
        
        IF active_count > 0 THEN
            RAISE EXCEPTION 'Active prompt already exists untuk phase % dengan name %', NEW.phase, NEW.name;
        END IF;
    END IF;
    
    -- Auto-set updated_by if not provided
    IF TG_OP = 'UPDATE' AND NEW.updated_by IS NULL THEN
        NEW.updated_by = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;

-- ====================================================================
-- PROMPT TEMPLATES TRIGGER FUNCTIONS  
-- ====================================================================

-- Auto-increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This would be called by application when template is used
    -- Increment usage count
    UPDATE public.prompt_templates 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Validation trigger untuk prompt templates
CREATE OR REPLACE FUNCTION validate_prompt_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate category exists in enum
    IF NEW.category IS NOT NULL THEN
        PERFORM 1 WHERE NEW.category::text = ANY(
            SELECT unnest(enum_range(NULL::prompt_category))::text
        );
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid prompt category: %', NEW.category;
        END IF;
    END IF;
    
    -- Validate template content not empty
    IF NEW.template_content IS NOT NULL AND trim(NEW.template_content) = '' THEN
        RAISE EXCEPTION 'Template content cannot be empty or whitespace only';
    END IF;
    
    -- Validate parameters JSON if provided
    IF NEW.parameters IS NOT NULL THEN
        BEGIN
            -- Try to validate JSON structure
            PERFORM NEW.parameters::jsonb;
        EXCEPTION
            WHEN invalid_text_representation THEN
                RAISE EXCEPTION 'Invalid JSON format dalam parameters field';
        END;
    END IF;
    
    -- Auto-set updated_by if not provided
    IF TG_OP = 'UPDATE' AND NEW.updated_by IS NULL THEN
        NEW.updated_by = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;

-- ====================================================================
-- MODEL CONFIGS TRIGGER FUNCTIONS
-- ====================================================================

-- Ensure only one default per provider
CREATE OR REPLACE FUNCTION validate_model_config_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If setting as default, unset other defaults untuk same provider
    IF NEW.is_default = true AND NEW.is_active = true THEN
        UPDATE public.model_configs 
        SET is_default = false,
            updated_at = NOW()
        WHERE provider = NEW.provider 
        AND is_default = true 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
        
        RAISE LOG 'MODEL_CONFIG_DEFAULT_UPDATED: provider=%, new_default=%', NEW.provider, NEW.id;
    END IF;
    
    -- Validate provider exists in enum
    IF NEW.provider IS NOT NULL THEN
        PERFORM 1 WHERE NEW.provider::text = ANY(
            SELECT unnest(enum_range(NULL::ai_provider))::text
        );
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid AI provider: %', NEW.provider;
        END IF;
    END IF;
    
    -- Validate phase compatibility array
    IF NEW.phase_compatibility IS NOT NULL AND array_length(NEW.phase_compatibility, 1) > 0 THEN
        DECLARE
            phase_val academic_phase;
        BEGIN
            FOREACH phase_val IN ARRAY NEW.phase_compatibility
            LOOP
                PERFORM 1 WHERE phase_val::text = ANY(
                    SELECT unnest(enum_range(NULL::academic_phase))::text
                );
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Invalid academic phase dalam compatibility array: %', phase_val;
                END IF;
            END LOOP;
        END;
    END IF;
    
    -- Auto-set updated_by if not provided
    IF TG_OP = 'UPDATE' AND NEW.updated_by IS NULL THEN
        NEW.updated_by = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;

-- ====================================================================
-- ADMIN SETTINGS TRIGGER FUNCTIONS
-- ====================================================================

-- Validation dan type conversion untuk admin settings
CREATE OR REPLACE FUNCTION validate_admin_setting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate setting_type exists in enum
    IF NEW.setting_type IS NOT NULL THEN
        PERFORM 1 WHERE NEW.setting_type::text = ANY(
            SELECT unnest(enum_range(NULL::setting_type))::text
        );
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid setting type: %', NEW.setting_type;
        END IF;
    END IF;
    
    -- Type-specific validation
    CASE NEW.setting_type
        WHEN 'integer' THEN
            BEGIN
                PERFORM NEW.setting_value::integer;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    RAISE EXCEPTION 'Setting value must be valid integer untuk type integer';
            END;
            
        WHEN 'decimal' THEN
            BEGIN
                PERFORM NEW.setting_value::decimal;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    RAISE EXCEPTION 'Setting value must be valid decimal untuk type decimal';
            END;
            
        WHEN 'boolean' THEN
            IF NEW.setting_value NOT IN ('true', 'false', '1', '0', 'yes', 'no', 'on', 'off') THEN
                RAISE EXCEPTION 'Setting value must be valid boolean (true/false, 1/0, yes/no, on/off)';
            END IF;
            
        WHEN 'json' THEN
            BEGIN
                PERFORM NEW.setting_value::jsonb;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    RAISE EXCEPTION 'Setting value must be valid JSON untuk type json';
            END;
            
        WHEN 'url' THEN
            IF NEW.setting_value !~ '^https?://.*' THEN
                RAISE EXCEPTION 'Setting value must be valid URL starting dengan http:// or https://';
            END IF;
            
        WHEN 'email' THEN
            IF NEW.setting_value !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
                RAISE EXCEPTION 'Setting value must be valid email address';
            END IF;
    END CASE;
    
    -- Validate setting_key format (snake_case)
    IF NEW.setting_key IS NOT NULL AND NEW.setting_key !~ '^[a-z][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'Setting key must be dalam snake_case format (lowercase letters, numbers, underscores)';
    END IF;
    
    -- Log sensitive setting changes
    IF NEW.is_sensitive = true THEN
        PERFORM create_admin_audit_log(
            'admin_settings',
            NEW.id,
            TG_OP::text,
            CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
            to_jsonb(NEW)
        );
        
        RAISE LOG 'SENSITIVE_SETTING_MODIFIED: key=%, user=%', NEW.setting_key, NEW.updated_by;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ====================================================================
-- CREATE TRIGGERS
-- ====================================================================

-- System Prompts triggers
CREATE TRIGGER system_prompts_auto_version_trigger
    AFTER UPDATE ON public.system_prompts
    FOR EACH ROW
    EXECUTE FUNCTION system_prompts_auto_version();

CREATE TRIGGER validate_system_prompt_trigger
    BEFORE INSERT OR UPDATE ON public.system_prompts
    FOR EACH ROW
    EXECUTE FUNCTION validate_system_prompt();

-- Prompt Templates triggers
CREATE TRIGGER validate_prompt_template_trigger
    BEFORE INSERT OR UPDATE ON public.prompt_templates
    FOR EACH ROW
    EXECUTE FUNCTION validate_prompt_template();

-- Model Configs triggers
CREATE TRIGGER validate_model_config_default_trigger
    BEFORE INSERT OR UPDATE ON public.model_configs
    FOR EACH ROW
    EXECUTE FUNCTION validate_model_config_default();

-- Admin Settings triggers
CREATE TRIGGER validate_admin_setting_trigger
    BEFORE INSERT OR UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION validate_admin_setting();

-- ====================================================================
-- UTILITY FUNCTIONS untuk admin operations
-- ====================================================================

-- Function untuk rollback prompt ke specific version
CREATE OR REPLACE FUNCTION rollback_prompt_version(
    p_prompt_id UUID,
    p_target_version INTEGER,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_version_content TEXT;
    v_version_metadata JSONB;
    v_version_parameters JSONB;
    v_new_version INTEGER;
BEGIN
    -- Verify admin access
    IF NOT is_admin_user(p_user_id) THEN
        RAISE EXCEPTION 'Access denied: Admin role required untuk rollback prompts';
    END IF;
    
    -- Get target version content
    SELECT content, metadata, parameters
    INTO v_version_content, v_version_metadata, v_version_parameters
    FROM public.prompt_versions
    WHERE prompt_id = p_prompt_id AND version_number = p_target_version;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Version % not found untuk prompt %', p_target_version, p_prompt_id;
    END IF;
    
    -- Get next version number
    SELECT COALESCE(MAX(version), 0) + 1 
    INTO v_new_version
    FROM public.system_prompts
    WHERE id = p_prompt_id;
    
    -- Update prompt dengan rollback content
    UPDATE public.system_prompts
    SET 
        content = v_version_content,
        metadata = v_version_metadata,
        parameters = v_version_parameters,
        version = v_new_version,
        updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_prompt_id;
    
    -- Create rollback version entry
    INSERT INTO public.prompt_versions (
        prompt_id,
        version_number,
        content,
        metadata,
        parameters,
        changed_by,
        change_reason,
        change_description
    ) VALUES (
        p_prompt_id,
        v_new_version,
        v_version_content,
        v_version_metadata,
        v_version_parameters,
        p_user_id,
        format('Rollback to version %s', p_target_version),
        format('Rolled back dari current version ke version %s', p_target_version)
    );
    
    RAISE LOG 'PROMPT_ROLLBACK: prompt_id=%, target_version=%, new_version=%, user=%', 
        p_prompt_id, p_target_version, v_new_version, p_user_id;
    
    RETURN TRUE;
END;
$$;

-- ====================================================================
-- COMMENTS untuk trigger functions
-- ====================================================================

COMMENT ON FUNCTION create_admin_audit_log(TEXT, UUID, TEXT, JSONB, JSONB, UUID) IS 'Create audit log entry untuk admin actions';
COMMENT ON FUNCTION system_prompts_auto_version() IS 'Auto-create version record when prompt content changes';
COMMENT ON FUNCTION validate_system_prompt() IS 'Validate system prompt data before insert/update';
COMMENT ON FUNCTION validate_prompt_template() IS 'Validate prompt template data dan JSON parameters';
COMMENT ON FUNCTION validate_model_config_default() IS 'Ensure only one default model per provider';
COMMENT ON FUNCTION validate_admin_setting() IS 'Type validation dan format checking untuk admin settings';
COMMENT ON FUNCTION rollback_prompt_version(UUID, INTEGER, UUID) IS 'Rollback system prompt ke specific version dengan admin validation';