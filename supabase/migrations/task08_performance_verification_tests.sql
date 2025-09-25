-- Migration 008 Performance Verification Tests
-- Target: Verify approval_gates table performance and functionality
-- Author: Database Testing Team
-- Date: 2025-01-26

-- =====================================================
-- SETUP TEST DATA FOR REALISTIC TESTING
-- =====================================================

-- Create temporary test workflow and phases for testing
INSERT INTO public.workflows (
    id,
    user_id,
    title,
    academic_level,
    subject_area,
    total_phases,
    current_phase,
    status,
    created_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'Test Workflow for Performance Testing',
    'undergraduate',
    'Computer Science',
    7,
    1,
    'active',
    NOW() - INTERVAL '1 hour'
) ON CONFLICT (id) DO NOTHING;

-- Create test workflow phase
INSERT INTO public.workflow_phases (
    id,
    workflow_id,
    phase_name,
    phase_order,
    description,
    status,
    approval_required,
    approval_status,
    created_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'Literature Review',
    1,
    'Conduct comprehensive literature review',
    'waiting_approval',
    true,
    'waiting_approval',
    NOW() - INTERVAL '30 minutes'
) ON CONFLICT (id) DO NOTHING;

-- Create test approval gate
INSERT INTO public.approval_gates (
    id,
    workflow_id,
    phase_id,
    gate_name,
    gate_description,
    required_approvers,
    approval_threshold,
    is_mandatory,
    timeout_duration,
    auto_approve_after_timeout,
    gate_status,
    submitted_at,
    deadline,
    created_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440004'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'Literature Review Quality Gate',
    'Review the quality and comprehensiveness of literature review',
    2,
    0.75,
    true,
    INTERVAL '48 hours',
    false,
    'waiting_approval',
    NOW() - INTERVAL '10 minutes',
    NOW() + INTERVAL '38 hours',
    NOW() - INTERVAL '10 minutes'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INDEX PERFORMANCE TESTS
-- =====================================================

-- Test 1: workflow_id index performance
\echo '=== Test 1: workflow_id Index Performance ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM public.approval_gates 
WHERE workflow_id = '550e8400-e29b-41d4-a716-446655440001'::uuid;

-- Test 2: phase_id index performance
\echo '=== Test 2: phase_id Index Performance ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM public.approval_gates 
WHERE phase_id = '550e8400-e29b-41d4-a716-446655440003'::uuid;

-- Test 3: gate_status index performance
\echo '=== Test 3: gate_status Index Performance ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM public.approval_gates 
WHERE gate_status = 'waiting_approval'::phase_status;

-- Test 4: composite index workflow_id + gate_status
\echo '=== Test 4: Composite Index (workflow_id + gate_status) Performance ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM public.approval_gates 
WHERE workflow_id = '550e8400-e29b-41d4-a716-446655440001'::uuid 
AND gate_status = 'waiting_approval'::phase_status;

-- Test 5: deadline index for timeout queries
\echo '=== Test 5: Deadline Index Performance ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM public.approval_gates 
WHERE deadline <= NOW() + INTERVAL '24 hours'
AND gate_status = 'waiting_approval'::phase_status;

-- Test 6: Complex query with multiple conditions
\echo '=== Test 6: Complex Multi-condition Query Performance ==='
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT ag.*, wp.phase_name, w.title
FROM public.approval_gates ag
JOIN public.workflow_phases wp ON ag.phase_id = wp.id
JOIN public.workflows w ON ag.workflow_id = w.id
WHERE ag.workflow_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
AND ag.is_mandatory = true
AND ag.gate_status = 'waiting_approval'::phase_status
ORDER BY ag.deadline ASC;

-- =====================================================
-- TRIGGER FUNCTIONALITY TESTS
-- =====================================================

-- Test 7: Test updated_at trigger
\echo '=== Test 7: updated_at Trigger Functionality ==='
SELECT 
    id,
    gate_name,
    created_at,
    updated_at
FROM public.approval_gates 
WHERE id = '550e8400-e29b-41d4-a716-446655440004'::uuid;

-- Update gate description to trigger updated_at
UPDATE public.approval_gates 
SET gate_description = 'Updated description to test trigger - ' || NOW()::text
WHERE id = '550e8400-e29b-41d4-a716-446655440004'::uuid;

-- Verify updated_at was changed
SELECT 
    id,
    gate_name,
    gate_description,
    created_at,
    updated_at,
    (updated_at > created_at) as trigger_worked
FROM public.approval_gates 
WHERE id = '550e8400-e29b-41d4-a716-446655440004'::uuid;

-- Test 8: Test approval response trigger
\echo '=== Test 8: Approval Response State Management Trigger ==='

-- Insert test approval response
INSERT INTO public.approval_responses (
    id,
    approval_gate_id,
    approver_id,
    response_action,
    response_text,
    confidence_score,
    review_notes
) VALUES (
    '550e8400-e29b-41d4-a716-446655440005'::uuid,
    '550e8400-e29b-41d4-a716-446655440004'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'approve',
    'Literature review meets high academic standards',
    0.95,
    '{"quality": "excellent", "completeness": "thorough"}'::jsonb
);

-- Check if approval gate statistics were updated by trigger
SELECT 
    id,
    gate_name,
    approved_count,
    rejected_count,
    total_responses,
    required_approvers,
    approval_threshold,
    gate_status
FROM public.approval_gates 
WHERE id = '550e8400-e29b-41d4-a716-446655440004'::uuid;

-- Add second approval to test threshold evaluation
INSERT INTO public.approval_responses (
    id,
    approval_gate_id,
    approver_id,
    response_action,
    response_text,
    confidence_score
) VALUES (
    '550e8400-e29b-41d4-a716-446655440006'::uuid,
    '550e8400-e29b-41d4-a716-446655440004'::uuid,
    '550e8400-e29b-41d4-a716-446655440007'::uuid,
    'approve',
    'Approved after thorough review',
    0.88
);

-- Verify trigger updated approval statistics and made final decision
SELECT 
    id,
    gate_name,
    approved_count,
    rejected_count,
    total_responses,
    (approved_count::DECIMAL / total_responses::DECIMAL) as approval_ratio,
    approval_threshold,
    gate_status,
    final_decision,
    decision_made_at IS NOT NULL as decision_made
FROM public.approval_gates 
WHERE id = '550e8400-e29b-41d4-a716-446655440004'::uuid;

-- =====================================================
-- BUSINESS FUNCTION TESTS
-- =====================================================

-- Test 9: evaluate_approval_gate function
\echo '=== Test 9: evaluate_approval_gate Function ==='

-- Create a new test gate that needs evaluation
INSERT INTO public.approval_gates (
    id,
    workflow_id,
    phase_id,
    gate_name,
    required_approvers,
    approval_threshold,
    gate_status,
    approved_count,
    total_responses
) VALUES (
    '550e8400-e29b-41d4-a716-446655440008'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'Manual Evaluation Test Gate',
    3,
    0.67, -- Need 67% approval (2 out of 3)
    'waiting_approval',
    2,
    3
) ON CONFLICT (id) DO NOTHING;

-- Test the function directly
SELECT evaluate_approval_gate('550e8400-e29b-41d4-a716-446655440008'::uuid);

-- Check if function updated the gate correctly
SELECT 
    id,
    gate_name,
    approved_count,
    total_responses,
    (approved_count::DECIMAL / total_responses::DECIMAL) as approval_ratio,
    approval_threshold,
    gate_status,
    final_decision,
    decision_made_at IS NOT NULL as decision_made
FROM public.approval_gates 
WHERE id = '550e8400-e29b-41d4-a716-446655440008'::uuid;

-- Test 10: handle_approval_timeouts function
\echo '=== Test 10: handle_approval_timeouts Function ==='

-- Create expired approval gate for timeout testing
INSERT INTO public.approval_gates (
    id,
    workflow_id,
    phase_id,
    gate_name,
    gate_status,
    deadline,
    auto_approve_after_timeout
) VALUES (
    '550e8400-e29b-41d4-a716-446655440009'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'Expired Auto-Approve Gate',
    'waiting_approval',
    NOW() - INTERVAL '1 hour', -- Expired 1 hour ago
    true -- Auto approve on timeout
) ON CONFLICT (id) DO NOTHING;

-- Create expired gate that should fail on timeout
INSERT INTO public.approval_gates (
    id,
    workflow_id,
    phase_id,
    gate_name,
    gate_status,
    deadline,
    auto_approve_after_timeout
) VALUES (
    '550e8400-e29b-41d4-a716-446655440010'::uuid,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'Expired Fail Gate',
    'waiting_approval',
    NOW() - INTERVAL '2 hours', -- Expired 2 hours ago
    false -- Fail on timeout
) ON CONFLICT (id) DO NOTHING;

-- Test timeout handling function
SELECT handle_approval_timeouts();

-- Verify timeout handling results
SELECT 
    id,
    gate_name,
    gate_status,
    final_decision,
    decision_made_at IS NOT NULL as timeout_handled,
    decision_rationale,
    auto_approve_after_timeout
FROM public.approval_gates 
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440009'::uuid,
    '550e8400-e29b-41d4-a716-446655440010'::uuid
);

-- =====================================================
-- INDEX USAGE ANALYSIS
-- =====================================================

-- Test 11: Index usage statistics
\echo '=== Test 11: Index Usage Statistics ==='
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE tablename IN ('approval_gates', 'approval_responses')
AND schemaname = 'public'
ORDER BY idx_scan DESC;

-- Test 12: Table size and index efficiency
\echo '=== Test 12: Table Size and Index Efficiency ==='
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size_bytes,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('approval_gates', 'approval_responses');

-- =====================================================
-- PERFORMANCE BENCHMARK RESULTS
-- =====================================================

-- Test 13: Query performance comparison
\echo '=== Test 13: Query Performance Benchmarks ==='

-- Measure simple lookup performance
\timing on

-- Benchmark 1: Primary key lookup
SELECT * FROM public.approval_gates WHERE id = '550e8400-e29b-41d4-a716-446655440004'::uuid;

-- Benchmark 2: Workflow-based lookup
SELECT * FROM public.approval_gates WHERE workflow_id = '550e8400-e29b-41d4-a716-446655440001'::uuid;

-- Benchmark 3: Status-based filtering
SELECT COUNT(*) FROM public.approval_gates WHERE gate_status = 'waiting_approval'::phase_status;

-- Benchmark 4: Complex join query
SELECT ag.gate_name, wp.phase_name, w.title
FROM public.approval_gates ag
JOIN public.workflow_phases wp ON ag.phase_id = wp.id
JOIN public.workflows w ON ag.workflow_id = w.id
WHERE ag.gate_status = 'waiting_approval'::phase_status;

\timing off

-- =====================================================
-- CLEANUP TEST DATA (Optional)
-- =====================================================

\echo '=== Cleanup Test Data (Uncomment to clean up) ==='
-- DELETE FROM public.approval_responses WHERE approval_gate_id IN (
--     '550e8400-e29b-41d4-a716-446655440004'::uuid,
--     '550e8400-e29b-41d4-a716-446655440008'::uuid,
--     '550e8400-e29b-41d4-a716-446655440009'::uuid,
--     '550e8400-e29b-41d4-a716-446655440010'::uuid
-- );
-- 
-- DELETE FROM public.approval_gates WHERE workflow_id = '550e8400-e29b-41d4-a716-446655440001'::uuid;
-- DELETE FROM public.workflow_phases WHERE workflow_id = '550e8400-e29b-41d4-a716-446655440001'::uuid;
-- DELETE FROM public.workflows WHERE id = '550e8400-e29b-41d4-a716-446655440001'::uuid;

-- =====================================================
-- TEST RESULTS SUMMARY
-- =====================================================

\echo '=== Migration 008 Performance Verification Complete ==='
\echo 'Expected Results:'
\echo '1. All EXPLAIN ANALYZE queries should show index scans (not Seq Scan)'
\echo '2. Trigger functions should execute without errors'
\echo '3. Business functions should return expected results'
\echo '4. Query execution times should be < 50ms for simple lookups'
\echo '5. Complex joins should complete < 200ms'
\echo ''
\echo 'If any test fails, check:'
\echo '- Index creation success'
\echo '- Trigger function definitions'
\echo '- Foreign key constraints'
\echo '- Data type compatibility'