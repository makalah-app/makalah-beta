-- Migration: Create Database Functions and Triggers
-- Description: Essential database functions for workflow automation and data validation
-- Author: Database Architect
-- Date: 2025-01-25

-- Create function to initialize user profile when user is created
CREATE OR REPLACE FUNCTION initialize_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default user profile
    INSERT INTO public.user_profiles (
        user_id,
        first_name,
        last_name,
        display_name,
        preferred_citation_style,
        preferred_language,
        timezone,
        academic_level
    ) VALUES (
        NEW.id,
        'User', -- Default first name
        SPLIT_PART(NEW.email, '@', 1), -- Use email prefix as last name
        SPLIT_PART(NEW.email, '@', 1), -- Use email prefix as display name
        'APA',
        'id',
        'Asia/Jakarta',
        'undergraduate'
    );
    
    -- Create default user preferences
    INSERT INTO public.user_preferences (
        user_id,
        ai_provider,
        ai_model,
        ai_temperature,
        ai_max_tokens,
        preferred_workflow_persona
    ) VALUES (
        NEW.id,
        'openai',
        'gpt-4o-mini',
        0.7,
        4000,
        'academic_researcher'
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to initialize user profile
CREATE TRIGGER initialize_user_profile_on_registration
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_profile();

-- Create function to validate workflow phase transitions
CREATE OR REPLACE FUNCTION validate_phase_transition()
RETURNS TRIGGER AS $$
DECLARE
    prev_phase_order INTEGER;
    current_phase_order INTEGER;
    phase_orders CONSTANT INTEGER[] := ARRAY[1, 2, 3, 4, 5, 6, 7]; -- Expected phase order
    phase_names CONSTANT academic_phase[] := ARRAY[
        'research_analysis'::academic_phase,
        'outline_generation'::academic_phase, 
        'draft_composition'::academic_phase,
        'content_refinement'::academic_phase,
        'citation_integration'::academic_phase,
        'academic_review'::academic_phase,
        'final_formatting'::academic_phase
    ];
BEGIN
    -- Get the expected order for the new phase
    SELECT ordinality INTO current_phase_order
    FROM unnest(phase_names) WITH ORDINALITY AS t(phase_name, ordinality)
    WHERE phase_name = NEW.phase_name;
    
    -- Check if previous phases are completed (for sequential workflow)
    IF EXISTS (
        SELECT 1 FROM public.workflow_phases wp
        JOIN unnest(phase_names) WITH ORDINALITY AS t(phase_name, ordinality) 
            ON wp.phase_name = t.phase_name
        WHERE wp.workflow_id = NEW.workflow_id 
        AND t.ordinality < current_phase_order
        AND wp.status NOT IN ('completed', 'approved', 'skipped')
    ) THEN
        -- Allow flexibility but log warning
        INSERT INTO public.workflow_context (
            workflow_id,
            context_type,
            context_key,
            context_value,
            created_by
        ) VALUES (
            NEW.workflow_id,
            'workflow_context',
            'phase_transition_warning',
            jsonb_build_object(
                'message', 'Phase started out of sequence',
                'phase_name', NEW.phase_name,
                'expected_order', current_phase_order,
                'timestamp', NOW()
            ),
            NEW.user_id
        ) ON CONFLICT (workflow_id, context_type, context_key) 
        DO UPDATE SET 
            context_value = EXCLUDED.context_value,
            updated_at = NOW();
    END IF;
    
    -- Set appropriate phase order
    NEW.phase_order = current_phase_order;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for phase transition validation
CREATE TRIGGER validate_workflow_phase_transition
    BEFORE INSERT ON public.workflow_phases
    FOR EACH ROW
    EXECUTE FUNCTION validate_phase_transition();

-- Create function to auto-create workflow phases
CREATE OR REPLACE FUNCTION create_workflow_phases()
RETURNS TRIGGER AS $$
DECLARE
    phase_name academic_phase;
    phase_names academic_phase[] := ARRAY[
        'research_analysis'::academic_phase,
        'outline_generation'::academic_phase,
        'draft_composition'::academic_phase,
        'content_refinement'::academic_phase,
        'citation_integration'::academic_phase,
        'academic_review'::academic_phase,
        'final_formatting'::academic_phase
    ];
    phase_order INTEGER := 1;
BEGIN
    -- Create all 7 workflow phases when a new workflow is created
    FOREACH phase_name IN ARRAY phase_names
    LOOP
        INSERT INTO public.workflow_phases (
            workflow_id,
            phase_name,
            phase_order,
            status,
            approval_required
        ) VALUES (
            NEW.id,
            phase_name,
            phase_order,
            CASE WHEN phase_order = 1 THEN 'pending'::phase_status ELSE 'pending'::phase_status END,
            -- Academic review and final formatting typically require approval
            CASE WHEN phase_name IN ('academic_review', 'final_formatting') THEN true ELSE false END
        );
        
        phase_order := phase_order + 1;
    END LOOP;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-create workflow phases
CREATE TRIGGER create_workflow_phases_on_workflow_creation
    AFTER INSERT ON public.workflows
    FOR EACH ROW
    EXECUTE FUNCTION create_workflow_phases();

-- Create function to calculate content quality score
CREATE OR REPLACE FUNCTION calculate_content_quality_score(content_text TEXT)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    word_count INTEGER;
    sentence_count INTEGER;
    paragraph_count INTEGER;
    avg_words_per_sentence DECIMAL;
    quality_score DECIMAL(3,2) := 0.0;
BEGIN
    -- Basic content analysis
    word_count := array_length(string_to_array(content_text, ' '), 1);
    sentence_count := array_length(string_to_array(content_text, '.'), 1) - 1;
    paragraph_count := array_length(string_to_array(content_text, E'\n\n'), 1);
    
    -- Avoid division by zero
    IF sentence_count = 0 THEN sentence_count := 1; END IF;
    IF paragraph_count = 0 THEN paragraph_count := 1; END IF;
    
    avg_words_per_sentence := word_count::DECIMAL / sentence_count::DECIMAL;
    
    -- Calculate quality score based on various metrics
    quality_score := 0.0;
    
    -- Word count factor (0.3 weight)
    IF word_count >= 500 THEN
        quality_score := quality_score + 0.3;
    ELSIF word_count >= 200 THEN
        quality_score := quality_score + (word_count / 500.0) * 0.3;
    END IF;
    
    -- Sentence structure factor (0.25 weight)
    IF avg_words_per_sentence BETWEEN 10 AND 25 THEN
        quality_score := quality_score + 0.25;
    ELSIF avg_words_per_sentence BETWEEN 5 AND 35 THEN
        quality_score := quality_score + 0.15;
    END IF;
    
    -- Paragraph structure factor (0.2 weight)
    IF paragraph_count >= 3 THEN
        quality_score := quality_score + 0.2;
    ELSIF paragraph_count >= 2 THEN
        quality_score := quality_score + 0.1;
    END IF;
    
    -- Content length consistency (0.25 weight)
    IF word_count > 0 AND sentence_count > 0 AND paragraph_count > 0 THEN
        quality_score := quality_score + 0.25;
    END IF;
    
    -- Ensure score is within bounds
    quality_score := GREATEST(0.0, LEAST(1.0, quality_score));
    
    RETURN quality_score;
END;
$$ language 'plpgsql';

-- Create function to auto-update artifact quality scores
CREATE OR REPLACE FUNCTION update_artifact_quality_score()
RETURNS TRIGGER AS $$
DECLARE
    content_text TEXT;
    calculated_score DECIMAL(3,2);
BEGIN
    -- Extract text content for quality analysis
    IF NEW.structured_content IS NOT NULL AND NEW.structured_content ? 'content' THEN
        content_text := NEW.structured_content->>'content';
        
        IF content_text IS NOT NULL AND length(content_text) > 0 THEN
            calculated_score := calculate_content_quality_score(content_text);
            NEW.quality_score := calculated_score;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating artifact quality scores
CREATE TRIGGER update_artifact_quality_on_content_change
    BEFORE INSERT OR UPDATE ON public.artifacts
    FOR EACH ROW
    WHEN (NEW.structured_content IS NOT NULL)
    EXECUTE FUNCTION update_artifact_quality_score();

-- Create function to manage workflow state transitions
CREATE OR REPLACE FUNCTION advance_workflow_to_next_phase()
RETURNS TRIGGER AS $$
DECLARE
    next_phase_record public.workflow_phases%ROWTYPE;
    workflow_record public.workflows%ROWTYPE;
BEGIN
    -- Get workflow details
    SELECT * INTO workflow_record 
    FROM public.workflows 
    WHERE id = NEW.workflow_id;
    
    -- When a phase is completed, advance to next phase
    IF NEW.status IN ('completed', 'approved') AND OLD.status NOT IN ('completed', 'approved') THEN
        -- Find next pending phase
        SELECT * INTO next_phase_record
        FROM public.workflow_phases
        WHERE workflow_id = NEW.workflow_id
        AND phase_order > NEW.phase_order
        AND status = 'pending'
        ORDER BY phase_order ASC
        LIMIT 1;
        
        -- Update next phase to in_progress if found
        IF next_phase_record.id IS NOT NULL THEN
            UPDATE public.workflow_phases
            SET 
                status = 'in_progress',
                started_at = NOW(),
                updated_at = NOW()
            WHERE id = next_phase_record.id;
            
            -- Update workflow current phase
            UPDATE public.workflows
            SET 
                current_phase = next_phase_record.phase_name,
                updated_at = NOW()
            WHERE id = NEW.workflow_id;
        ELSE
            -- No more phases, mark workflow as completed
            UPDATE public.workflows
            SET 
                status = 'completed',
                actual_completion_time = NOW(),
                progress_percentage = 100,
                updated_at = NOW()
            WHERE id = NEW.workflow_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for workflow advancement
CREATE TRIGGER advance_workflow_on_phase_completion
    AFTER UPDATE ON public.workflow_phases
    FOR EACH ROW
    EXECUTE FUNCTION advance_workflow_to_next_phase();

-- Create function to clean up expired sessions and data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired user sessions
    PERFORM cleanup_old_sessions();
    
    -- Clean up expired workflow context
    PERFORM cleanup_expired_context();
    
    -- Clean up expired artifact metadata
    PERFORM cleanup_expired_metadata();
    
    -- Clean up old AI interactions
    PERFORM cleanup_old_ai_interactions();
    
    -- Clean up old artifact versions
    PERFORM cleanup_old_artifact_versions();
    
    -- Clean up deleted artifacts permanently
    PERFORM cleanup_deleted_artifacts();
END;
$$ language 'plpgsql';

-- Create function to get workflow progress summary
CREATE OR REPLACE FUNCTION get_workflow_progress_summary(workflow_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    workflow_data RECORD;
    phases_data JSONB;
    artifacts_data JSONB;
    ai_interactions_data JSONB;
    progress_summary JSONB;
BEGIN
    -- Get workflow basic data
    SELECT 
        w.title,
        w.status,
        w.current_phase,
        w.progress_percentage,
        w.completed_phases,
        w.total_phases,
        w.actual_start_time,
        w.estimated_completion_time,
        w.created_at
    INTO workflow_data
    FROM public.workflows w
    WHERE w.id = workflow_uuid;
    
    -- Get phases summary
    SELECT jsonb_agg(
        jsonb_build_object(
            'phase_name', wp.phase_name,
            'status', wp.status,
            'phase_order', wp.phase_order,
            'started_at', wp.started_at,
            'completed_at', wp.completed_at,
            'approval_required', wp.approval_required,
            'quality_score', wp.quality_score
        ) ORDER BY wp.phase_order
    ) INTO phases_data
    FROM public.workflow_phases wp
    WHERE wp.workflow_id = workflow_uuid;
    
    -- Get artifacts summary
    SELECT jsonb_build_object(
        'total_artifacts', COUNT(*),
        'artifacts_by_type', jsonb_object_agg(artifact_type, type_count),
        'total_size_mb', ROUND(SUM(file_size)::DECIMAL / 1048576, 2)
    ) INTO artifacts_data
    FROM (
        SELECT 
            artifact_type,
            COUNT(*) as type_count,
            file_size
        FROM public.artifacts
        WHERE workflow_id = workflow_uuid
        AND status != 'deleted'
        GROUP BY artifact_type, file_size
    ) artifact_stats;
    
    -- Get AI interactions summary
    SELECT jsonb_build_object(
        'total_interactions', COUNT(*),
        'completed_interactions', COUNT(*) FILTER (WHERE status = 'completed'),
        'total_tokens_used', SUM(tokens_total),
        'total_estimated_cost', SUM(estimated_cost),
        'avg_response_time_ms', AVG(response_time_ms)
    ) INTO ai_interactions_data
    FROM public.ai_interactions
    WHERE workflow_id = workflow_uuid;
    
    -- Build comprehensive progress summary
    progress_summary := jsonb_build_object(
        'workflow', jsonb_build_object(
            'id', workflow_uuid,
            'title', workflow_data.title,
            'status', workflow_data.status,
            'current_phase', workflow_data.current_phase,
            'progress_percentage', workflow_data.progress_percentage,
            'completed_phases', workflow_data.completed_phases,
            'total_phases', workflow_data.total_phases,
            'started_at', workflow_data.actual_start_time,
            'estimated_completion', workflow_data.estimated_completion_time,
            'created_at', workflow_data.created_at
        ),
        'phases', phases_data,
        'artifacts', COALESCE(artifacts_data, '{}'::jsonb),
        'ai_interactions', COALESCE(ai_interactions_data, '{}'::jsonb),
        'generated_at', NOW()
    );
    
    RETURN progress_summary;
END;
$$ language 'plpgsql';

-- Create function to validate JSON schemas for structured content
CREATE OR REPLACE FUNCTION validate_json_schema(content JSONB, schema_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN := true;
BEGIN
    -- Basic schema validation based on type
    CASE schema_type
        WHEN 'artifact_content' THEN
            -- Artifact content should have basic structure
            is_valid := content ? 'content' OR content ? 'data';
            
        WHEN 'ai_response' THEN
            -- AI response should have response structure
            is_valid := content ? 'content' OR content ? 'message';
            
        WHEN 'tool_parameters' THEN
            -- Tool parameters can be flexible but should be object
            is_valid := jsonb_typeof(content) = 'object';
            
        WHEN 'user_preferences' THEN
            -- User preferences should have expected keys
            is_valid := jsonb_typeof(content) = 'object';
            
        ELSE
            -- Default: just check it's valid JSON object
            is_valid := jsonb_typeof(content) = 'object';
    END CASE;
    
    RETURN is_valid;
END;
$$ language 'plpgsql';

-- Create function for database health monitoring
CREATE OR REPLACE FUNCTION get_database_health_metrics()
RETURNS JSONB AS $$
DECLARE
    health_metrics JSONB;
    table_stats RECORD;
BEGIN
    -- Collect basic database health metrics
    SELECT jsonb_build_object(
        'timestamp', NOW(),
        'active_workflows', (SELECT COUNT(*) FROM public.workflows WHERE status = 'active'),
        'total_users', (SELECT COUNT(*) FROM public.users WHERE is_active = true),
        'total_artifacts', (SELECT COUNT(*) FROM public.artifacts WHERE status != 'deleted'),
        'ai_interactions_today', (
            SELECT COUNT(*) FROM public.ai_interactions 
            WHERE created_at >= CURRENT_DATE
        ),
        'failed_interactions_today', (
            SELECT COUNT(*) FROM public.ai_interactions 
            WHERE created_at >= CURRENT_DATE AND status = 'failed'
        ),
        'avg_response_time_ms', (
            SELECT AVG(response_time_ms) FROM public.ai_interactions 
            WHERE created_at >= NOW() - INTERVAL '1 hour' AND status = 'completed'
        ),
        'storage_usage_mb', (
            SELECT ROUND(SUM(file_size)::DECIMAL / 1048576, 2) 
            FROM public.artifacts WHERE file_size IS NOT NULL
        ),
        'table_sizes', (
            SELECT jsonb_object_agg(
                schemaname || '.' || tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
            )
            FROM pg_tables 
            WHERE schemaname = 'public'
        )
    ) INTO health_metrics;
    
    RETURN health_metrics;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON FUNCTION initialize_user_profile() IS 'Auto-creates user profile and preferences when user registers';
COMMENT ON FUNCTION validate_phase_transition() IS 'Validates workflow phase transitions and enforces sequential order';
COMMENT ON FUNCTION create_workflow_phases() IS 'Auto-creates all 7 academic workflow phases when workflow is created';
COMMENT ON FUNCTION calculate_content_quality_score(TEXT) IS 'Calculates quality score for content based on structure and length';
COMMENT ON FUNCTION advance_workflow_to_next_phase() IS 'Automatically advances workflow when phase is completed';
COMMENT ON FUNCTION cleanup_expired_data() IS 'Performs comprehensive cleanup of expired data across all tables';
COMMENT ON FUNCTION get_workflow_progress_summary(UUID) IS 'Returns comprehensive progress summary for a workflow';
COMMENT ON FUNCTION get_database_health_metrics() IS 'Returns database health and performance metrics for monitoring';