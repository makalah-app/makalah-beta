-- Migration: Schema Validation Tests
-- Description: Comprehensive tests to validate database schema functionality
-- Author: Database Architect
-- Date: 2025-01-25

-- Create test results table for validation
CREATE TABLE IF NOT EXISTS public.schema_validation_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name VARCHAR(200) NOT NULL,
    test_category VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PASS', 'FAIL', 'SKIP')),
    error_message TEXT NULL,
    execution_time INTERVAL NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create function to run validation tests
CREATE OR REPLACE FUNCTION run_schema_validation_tests()
RETURNS JSONB AS $$
DECLARE
    test_result RECORD;
    total_tests INTEGER := 0;
    passed_tests INTEGER := 0;
    failed_tests INTEGER := 0;
    test_results JSONB := '[]'::jsonb;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    test_status VARCHAR(20);
    error_msg TEXT;
BEGIN
    -- Clear previous test results
    DELETE FROM public.schema_validation_results WHERE created_at < NOW() - INTERVAL '1 hour';
    
    -- Test 1: User Registration and Profile Creation
    start_time := NOW();
    BEGIN
        -- Test user insertion triggers profile creation
        INSERT INTO public.users (id, email, password_hash, role)
        VALUES ('test-user-1', 'test1@example.com', 'hash123', 'user')
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
        
        -- Check if profile was created
        IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = 'test-user-1') THEN
            RAISE EXCEPTION 'User profile was not created automatically';
        END IF;
        
        -- Check if preferences were created
        IF NOT EXISTS (SELECT 1 FROM public.user_preferences WHERE user_id = 'test-user-1') THEN
            RAISE EXCEPTION 'User preferences were not created automatically';
        END IF;
        
        test_status := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('User Registration Triggers', 'User Management', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 2: Workflow Creation and Phase Generation
    start_time := NOW();
    BEGIN
        INSERT INTO public.workflows (id, user_id, title, workflow_type)
        VALUES ('test-workflow-1', 'test-user-1', 'Test Workflow', 'academic_paper')
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
        
        -- Check if all 7 phases were created
        IF (SELECT COUNT(*) FROM public.workflow_phases WHERE workflow_id = 'test-workflow-1') != 7 THEN
            RAISE EXCEPTION 'Not all 7 workflow phases were created automatically';
        END IF;
        
        test_status := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('Workflow Phase Creation', 'Workflow Management', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 3: Artifact Version Creation
    start_time := NOW();
    BEGIN
        INSERT INTO public.artifacts (id, workflow_id, user_id, name, artifact_type, structured_content)
        VALUES ('test-artifact-1', 'test-workflow-1', 'test-user-1', 'Test Document', 'draft_section', 
                '{"content": "This is test content for validation."}')
        ON CONFLICT (id) DO UPDATE SET structured_content = EXCLUDED.structured_content;
        
        -- Check if version was created
        IF NOT EXISTS (SELECT 1 FROM public.artifact_versions WHERE artifact_id = 'test-artifact-1') THEN
            RAISE EXCEPTION 'Artifact version was not created automatically';
        END IF;
        
        test_status := 'PASS';
        error_msg := NULL;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('Artifact Versioning', 'Artifact Management', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 4: Quality Score Calculation
    start_time := NOW();
    BEGIN
        -- Test quality score calculation function
        DECLARE
            score DECIMAL(3,2);
        BEGIN
            score := calculate_content_quality_score('This is a comprehensive test content with multiple sentences. It contains sufficient word count and proper structure. The content demonstrates academic writing style and complexity. This should result in a reasonable quality score for validation purposes.');
            
            IF score IS NULL OR score < 0 OR score > 1 THEN
                RAISE EXCEPTION 'Quality score calculation returned invalid value: %', score;
            END IF;
            
            test_status := 'PASS';
            error_msg := NULL;
        END;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('Quality Score Calculation', 'Content Analysis', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 5: Workflow Progress Tracking
    start_time := NOW();
    BEGIN
        -- Complete first phase
        UPDATE public.workflow_phases 
        SET status = 'completed', completed_at = NOW()
        WHERE workflow_id = 'test-workflow-1' AND phase_order = 1;
        
        -- Check if workflow progress was updated
        DECLARE
            workflow_progress INTEGER;
        BEGIN
            SELECT progress_percentage INTO workflow_progress
            FROM public.workflows WHERE id = 'test-workflow-1';
            
            IF workflow_progress IS NULL OR workflow_progress = 0 THEN
                RAISE EXCEPTION 'Workflow progress was not updated after phase completion';
            END IF;
            
            test_status := 'PASS';
            error_msg := NULL;
        END;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('Workflow Progress Tracking', 'Workflow Management', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 6: AI Interaction Logging
    start_time := NOW();
    BEGIN
        INSERT INTO public.ai_interactions (
            id, workflow_id, user_id, interaction_type, provider, model, status, user_prompt, response_content,
            tokens_prompt, tokens_completion, tokens_total, response_time_ms
        ) VALUES (
            'test-interaction-1', 'test-workflow-1', 'test-user-1', 'content_generation', 'openai', 'gpt-4o-mini',
            'completed', 'Generate test content', 'This is test response content',
            10, 20, 30, 1500
        ) ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
        
        -- Check if completion trigger worked
        DECLARE
            completed_at_value TIMESTAMPTZ;
        BEGIN
            SELECT completed_at INTO completed_at_value
            FROM public.ai_interactions WHERE id = 'test-interaction-1';
            
            IF completed_at_value IS NULL THEN
                RAISE EXCEPTION 'AI interaction completion timestamp was not set';
            END IF;
            
            test_status := 'PASS';
            error_msg := NULL;
        END;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('AI Interaction Logging', 'AI Integration', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 7: Index Performance Check
    start_time := NOW();
    BEGIN
        -- Test major indexes exist
        DECLARE
            index_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO index_count
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE 'idx_%';
            
            IF index_count < 50 THEN
                RAISE EXCEPTION 'Insufficient indexes created. Expected at least 50, found %', index_count;
            END IF;
            
            test_status := 'PASS';
            error_msg := NULL;
        END;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('Index Creation Validation', 'Performance', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 8: Data Integrity Constraints
    start_time := NOW();
    BEGIN
        -- Test foreign key constraints
        BEGIN
            INSERT INTO public.workflow_phases (workflow_id, phase_name, phase_order)
            VALUES ('non-existent-workflow', 'research_analysis', 1);
            
            RAISE EXCEPTION 'Foreign key constraint was not enforced';
        EXCEPTION 
            WHEN foreign_key_violation THEN
                -- Expected behavior
                test_status := 'PASS';
                error_msg := NULL;
            WHEN OTHERS THEN
                test_status := 'FAIL';
                error_msg := 'Unexpected error: ' || SQLERRM;
        END;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('Foreign Key Constraints', 'Data Integrity', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 9: JSONB Operations
    start_time := NOW();
    BEGIN
        -- Test JSONB functionality
        INSERT INTO public.workflow_context (workflow_id, context_type, context_key, context_value, created_by)
        VALUES ('test-workflow-1', 'research_data', 'test_json', 
                '{"test": true, "values": [1,2,3], "nested": {"key": "value"}}', 'test-user-1')
        ON CONFLICT (workflow_id, context_type, context_key) DO UPDATE SET context_value = EXCLUDED.context_value;
        
        -- Test JSONB query
        DECLARE
            json_result JSONB;
        BEGIN
            SELECT context_value->'nested'->'key' INTO json_result
            FROM public.workflow_context 
            WHERE workflow_id = 'test-workflow-1' AND context_key = 'test_json';
            
            IF json_result IS NULL OR json_result::text != '"value"' THEN
                RAISE EXCEPTION 'JSONB operations not working correctly';
            END IF;
            
            test_status := 'PASS';
            error_msg := NULL;
        END;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('JSONB Operations', 'Data Types', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Test 10: Function Performance
    start_time := NOW();
    BEGIN
        -- Test key functions exist and work
        DECLARE
            progress_summary JSONB;
        BEGIN
            progress_summary := get_workflow_progress_summary('test-workflow-1');
            
            IF progress_summary IS NULL OR NOT (progress_summary ? 'workflow') THEN
                RAISE EXCEPTION 'Workflow progress summary function not working correctly';
            END IF;
            
            test_status := 'PASS';
            error_msg := NULL;
        END;
    EXCEPTION WHEN OTHERS THEN
        test_status := 'FAIL';
        error_msg := SQLERRM;
    END;
    end_time := NOW();
    
    INSERT INTO public.schema_validation_results (test_name, test_category, status, error_message, execution_time)
    VALUES ('Function Performance', 'Database Functions', test_status, error_msg, end_time - start_time);
    
    total_tests := total_tests + 1;
    IF test_status = 'PASS' THEN passed_tests := passed_tests + 1; ELSE failed_tests := failed_tests + 1; END IF;
    
    -- Clean up test data
    DELETE FROM public.ai_interactions WHERE id = 'test-interaction-1';
    DELETE FROM public.workflow_context WHERE workflow_id = 'test-workflow-1';
    DELETE FROM public.artifact_versions WHERE artifact_id = 'test-artifact-1';
    DELETE FROM public.artifact_metadata WHERE artifact_id = 'test-artifact-1';
    DELETE FROM public.artifacts WHERE id = 'test-artifact-1';
    DELETE FROM public.workflow_phases WHERE workflow_id = 'test-workflow-1';
    DELETE FROM public.workflows WHERE id = 'test-workflow-1';
    DELETE FROM public.user_preferences WHERE user_id = 'test-user-1';
    DELETE FROM public.user_profiles WHERE user_id = 'test-user-1';
    DELETE FROM public.users WHERE id = 'test-user-1';
    
    -- Compile results
    test_results := jsonb_build_object(
        'total_tests', total_tests,
        'passed_tests', passed_tests,
        'failed_tests', failed_tests,
        'success_rate_percent', ROUND((passed_tests::DECIMAL / total_tests::DECIMAL) * 100, 2),
        'test_timestamp', NOW(),
        'overall_status', CASE 
            WHEN failed_tests = 0 THEN 'ALL_TESTS_PASSED'
            WHEN passed_tests > failed_tests THEN 'MOSTLY_PASSED'
            ELSE 'CRITICAL_FAILURES'
        END
    );
    
    RETURN test_results;
END;
$$ language 'plpgsql';

-- Create function to benchmark database performance
CREATE OR REPLACE FUNCTION benchmark_database_performance()
RETURNS JSONB AS $$
DECLARE
    benchmark_results JSONB := '{}'::jsonb;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    record_count BIGINT;
BEGIN
    -- Benchmark 1: User lookup performance
    start_time := NOW();
    SELECT COUNT(*) INTO record_count FROM public.users WHERE is_active = true;
    end_time := NOW();
    
    benchmark_results := benchmark_results || jsonb_build_object(
        'user_lookup_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        'active_users_count', record_count
    );
    
    -- Benchmark 2: Workflow query performance
    start_time := NOW();
    SELECT COUNT(*) INTO record_count 
    FROM public.workflows w 
    JOIN public.workflow_phases wp ON w.id = wp.workflow_id 
    WHERE w.status = 'active';
    end_time := NOW();
    
    benchmark_results := benchmark_results || jsonb_build_object(
        'workflow_join_query_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        'active_workflow_phases_count', record_count
    );
    
    -- Benchmark 3: AI interaction aggregation
    start_time := NOW();
    SELECT COUNT(*) INTO record_count 
    FROM public.ai_interactions 
    WHERE created_at >= NOW() - INTERVAL '7 days';
    end_time := NOW();
    
    benchmark_results := benchmark_results || jsonb_build_object(
        'ai_interactions_count_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        'recent_interactions_count', record_count
    );
    
    -- Benchmark 4: Full-text search performance
    start_time := NOW();
    SELECT COUNT(*) INTO record_count 
    FROM public.artifacts 
    WHERE to_tsvector('simple', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('simple', 'machine learning');
    end_time := NOW();
    
    benchmark_results := benchmark_results || jsonb_build_object(
        'fulltext_search_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        'search_results_count', record_count
    );
    
    -- Add overall assessment
    benchmark_results := benchmark_results || jsonb_build_object(
        'benchmark_timestamp', NOW(),
        'performance_status', 'BENCHMARKED',
        'recommendation', 'Monitor query performance regularly and optimize based on usage patterns'
    );
    
    RETURN benchmark_results;
END;
$$ language 'plpgsql';

-- Create comprehensive validation report function
CREATE OR REPLACE FUNCTION generate_schema_validation_report()
RETURNS JSONB AS $$
DECLARE
    validation_report JSONB;
    test_results JSONB;
    benchmark_results JSONB;
    health_metrics JSONB;
BEGIN
    -- Run validation tests
    test_results := run_schema_validation_tests();
    
    -- Run performance benchmarks
    benchmark_results := benchmark_database_performance();
    
    -- Get health metrics
    health_metrics := get_database_health_metrics();
    
    -- Compile comprehensive report
    validation_report := jsonb_build_object(
        'schema_validation', test_results,
        'performance_benchmarks', benchmark_results,
        'database_health', health_metrics,
        'report_generated_at', NOW(),
        'schema_version', '1.0.0',
        'validation_status', 
            CASE 
                WHEN (test_results->>'failed_tests')::INTEGER = 0 THEN 'SCHEMA_VALID'
                WHEN (test_results->>'passed_tests')::INTEGER > (test_results->>'failed_tests')::INTEGER THEN 'SCHEMA_MOSTLY_VALID'
                ELSE 'SCHEMA_INVALID'
            END
    );
    
    RETURN validation_report;
END;
$$ language 'plpgsql';

-- Add comments for documentation
COMMENT ON FUNCTION run_schema_validation_tests() IS 'Comprehensive schema validation testing suite';
COMMENT ON FUNCTION benchmark_database_performance() IS 'Database performance benchmarking for key operations';
COMMENT ON FUNCTION generate_schema_validation_report() IS 'Complete schema validation and health report';
COMMENT ON TABLE public.schema_validation_results IS 'Test results storage for schema validation';