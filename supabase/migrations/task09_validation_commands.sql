-- Task 09 - Artifact Storage and Versioning System
-- Validation Commands untuk Testing Implementation
-- Run these commands to validate Task 09 implementation

-- =====================================================
-- BASIC INFRASTRUCTURE VALIDATION
-- =====================================================

-- Verify all Task 09 tables exist
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE '%artifact%' OR tablename LIKE '%storage%')
ORDER BY tablename;

-- Check all Task 09 functions are available
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%artifact%' OR routine_name LIKE '%storage%' OR routine_name LIKE '%version%')
ORDER BY routine_name;

-- Verify indexes are properly created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (tablename LIKE '%artifact%' OR tablename LIKE '%storage%')
ORDER BY tablename, indexname;

-- =====================================================
-- NAMING CONVENTION SYSTEM VALIDATION
-- =====================================================

-- Test path generation function
SELECT generate_artifact_file_path(
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID, -- test user id
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'::UUID, -- test workflow id
    'research',
    'My Research Document',
    'research_document',
    1,
    '.pdf'
) AS generated_path;

-- Test path validation
SELECT validate_naming_convention(
    'artifacts/user_test/workflow_test/research/research/my_research_document_v1.pdf',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'::UUID
) AS path_is_valid;

-- Test path parsing
SELECT (parse_artifact_file_path('artifacts/user_test/workflow_test/research/research/document_v1.pdf')).*;

-- =====================================================
-- VERSIONING SYSTEM VALIDATION  
-- =====================================================

-- Test semantic version parsing
SELECT (parse_semantic_version('1.2.3-alpha+build.1')).*;

-- Test semantic version comparison
SELECT compare_semantic_versions('1.2.3', '1.2.4') AS comparison_result;

-- Test next version generation
SELECT next_semantic_version('1.2.3', 'patch') AS next_patch;
SELECT next_semantic_version('1.2.3', 'minor') AS next_minor;
SELECT next_semantic_version('1.2.3', 'major') AS next_major;

-- =====================================================
-- STORAGE CONFIGURATION VALIDATION
-- =====================================================

-- Verify storage configuration is initialized
SELECT * FROM public.storage_configuration ORDER BY bucket_name;

-- Test file size categorization
SELECT categorize_file_size(500000) AS small_file;    -- 500KB
SELECT categorize_file_size(5000000) AS medium_file;  -- 5MB
SELECT categorize_file_size(50000000) AS large_file;  -- 50MB
SELECT categorize_file_size(200000000) AS xlarge_file; -- 200MB

-- =====================================================
-- API FUNCTIONS VALIDATION
-- =====================================================

-- Test storage config retrieval
SELECT get_storage_config('artifacts');

-- Test path statistics
SELECT * FROM get_path_statistics();

-- Test naming conflict detection
SELECT * FROM detect_naming_conflicts();

-- =====================================================
-- COMPREHENSIVE TEST SUITE EXECUTION
-- =====================================================

-- Initialize test cases (if not already done)
SELECT initialize_task09_test_cases();

-- View all available test cases
SELECT 
    test_category,
    test_name,
    test_description,
    priority,
    is_active
FROM public.task09_test_cases
ORDER BY test_category, priority DESC;

-- Run comprehensive test suite
SELECT run_task09_comprehensive_tests();

-- View test results summary
SELECT 
    test_run_id,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE status = 'pass') as passed,
    COUNT(*) FILTER (WHERE status = 'fail') as failed,
    COUNT(*) FILTER (WHERE status = 'error') as errors,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'pass')::DECIMAL / COUNT(*) * 100, 
        2
    ) as pass_percentage
FROM public.task09_test_results
GROUP BY test_run_id
ORDER BY MAX(executed_at) DESC;

-- View detailed test results for latest run
WITH latest_run AS (
    SELECT test_run_id 
    FROM public.task09_test_results 
    ORDER BY executed_at DESC 
    LIMIT 1
)
SELECT 
    tc.test_category,
    tc.test_name,
    tr.status,
    tr.execution_time_ms,
    tr.error_message,
    tr.executed_at
FROM public.task09_test_results tr
JOIN public.task09_test_cases tc ON tc.id = tr.test_case_id
WHERE tr.test_run_id = (SELECT test_run_id FROM latest_run)
ORDER BY tc.test_category, tc.priority DESC;

-- =====================================================
-- PERFORMANCE BENCHMARKING
-- =====================================================

-- Test artifact creation performance
DO $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_ms INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    -- Performance test code would go here
    -- (Actual artifact creation requires valid user/workflow)
    
    end_time := clock_timestamp();
    execution_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    
    RAISE NOTICE 'Execution time: % ms', execution_ms;
END $$;

-- Check database performance indicators
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND (tablename LIKE '%artifact%' OR tablename LIKE '%storage%')
ORDER BY tablename;

-- =====================================================
-- MONITORING VALIDATION
-- =====================================================

-- Check storage health report
SELECT get_storage_health_report();

-- View sync queue status (if any items exist)
SELECT * FROM get_sync_queue_status();

-- Performance analytics (will be empty until operations are recorded)
SELECT * FROM get_storage_performance_analytics();

-- =====================================================
-- SECURITY VALIDATION
-- =====================================================

-- Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE '%artifact%' OR tablename LIKE '%storage%' OR tablename LIKE '%task09%')
ORDER BY tablename;

-- Check foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND (tc.table_name LIKE '%artifact%' OR tc.table_name LIKE '%storage%')
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- FINAL VALIDATION CHECKLIST
-- =====================================================

-- Verify all components are operational
SELECT jsonb_build_object(
    'tables_created', (
        SELECT COUNT(*) FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (tablename LIKE '%artifact%' OR tablename LIKE '%storage%')
    ),
    'functions_created', (
        SELECT COUNT(*) FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND (routine_name LIKE '%artifact%' OR routine_name LIKE '%storage%' OR routine_name LIKE '%version%')
    ),
    'indexes_created', (
        SELECT COUNT(*) FROM pg_indexes
        WHERE schemaname = 'public'
        AND (tablename LIKE '%artifact%' OR tablename LIKE '%storage%')
    ),
    'rls_enabled', (
        SELECT COUNT(*) FROM pg_tables
        WHERE schemaname = 'public'
        AND (tablename LIKE '%artifact%' OR tablename LIKE '%storage%')
        AND rowsecurity = true
    ),
    'test_cases_ready', (
        SELECT COUNT(*) FROM public.task09_test_cases WHERE is_active = true
    ),
    'validation_timestamp', NOW()
) AS task09_validation_summary;

-- Success message
SELECT 'Task 09 - Artifact Storage and Versioning System validation completed!' AS status;