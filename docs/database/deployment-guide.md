# Database Deployment Guide - Makalah AI

## Overview

This guide provides step-by-step instructions for deploying the Makalah AI database schema to Supabase. The schema consists of 18 sequential migration files that create a comprehensive academic workflow management system.

## Prerequisites

- Supabase project with PostgreSQL 15+
- Admin access to Supabase Dashboard or CLI
- Database connection string and service role key
- MCP Supabase tools configured (optional)

## Migration Files Overview

The migrations are organized in sequential order with timestamp-based naming:

```
20250125001_create_users_table.sql              - Core user authentication
20250125002_create_user_profiles_table.sql      - Extended user profiles  
20250125003_create_user_sessions_table.sql      - JWT session management
20250125004_create_user_preferences_table.sql   - User AI/UI preferences
20250125005_create_workflows_table.sql          - Academic workflow instances
20250125006_create_workflow_phases_table.sql    - 7-phase workflow tracking
20250125007_create_workflow_context_table.sql   - Workflow context versioning
20250125008_create_approval_gates_table.sql     - Human approval system
20250125009_create_artifacts_table.sql          - Artifact storage system
20250125010_create_artifact_versions_table.sql  - Version control system
20250125011_create_artifact_metadata_table.sql  - Extended artifact metadata
20250125012_create_ai_interactions_table.sql    - AI provider logging
20250125013_create_tool_usage_logs_table.sql    - Tool execution tracking
20250125014_create_research_queries_table.sql   - Research query management
20250125015_create_database_functions.sql       - Business logic functions
20250125016_create_performance_indexes.sql      - Performance optimization
20250125017_create_sample_data.sql              - Development test data
20250125018_schema_validation_tests.sql         - Validation and testing
```

## Deployment Methods

### Method 1: Supabase Dashboard (Recommended)

1. **Access SQL Editor**:
   - Navigate to Supabase Dashboard → SQL Editor
   - Create new query for each migration file

2. **Execute Migrations Sequentially**:
   ```sql
   -- Execute each file in order, starting with:
   -- 20250125001_create_users_table.sql
   -- Then proceed through each file in sequence
   ```

3. **Verify Each Migration**:
   ```sql
   -- After each migration, verify tables were created:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

### Method 2: Supabase CLI

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Initialize Project**:
   ```bash
   supabase init
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Copy Migration Files**:
   ```bash
   # Copy migration files to supabase/migrations/
   cp makalahApp/supabase/migrations/*.sql supabase/migrations/
   ```

4. **Deploy Migrations**:
   ```bash
   supabase db push
   ```

### Method 3: Direct Database Connection

1. **Connect to Database**:
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
   ```

2. **Execute Files**:
   ```bash
   \i /path/to/20250125001_create_users_table.sql
   # Continue with each file in sequence
   ```

## Post-Deployment Validation

### 1. Run Schema Validation Tests

```sql
-- Execute comprehensive validation
SELECT generate_schema_validation_report();
```

Expected output should show:
- All tests passing (validation_status: "SCHEMA_VALID")
- Performance benchmarks within acceptable ranges
- Database health metrics showing proper setup

### 2. Verify Table Structure

```sql
-- Check all expected tables exist
SELECT 
    schemaname,
    tablename,
    tableowner 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

Expected tables:
- `users`, `user_profiles`, `user_sessions`, `user_preferences`
- `workflows`, `workflow_phases`, `workflow_context`, `approval_gates`, `approval_responses`
- `artifacts`, `artifact_versions`, `artifact_metadata`
- `ai_interactions`, `tool_usage_logs`, `research_queries`, `research_query_results`

### 3. Verify Indexes and Performance

```sql
-- Check index creation
SELECT * FROM public.index_performance_summary 
ORDER BY usage_category, indexname;

-- Run performance benchmarks
SELECT benchmark_database_performance();
```

### 4. Test Sample Data (Development Only)

If you deployed sample data migration:

```sql
-- Verify sample data exists
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM public.users
UNION ALL
SELECT 'workflows', COUNT(*) FROM public.workflows
UNION ALL  
SELECT 'artifacts', COUNT(*) FROM public.artifacts
UNION ALL
SELECT 'ai_interactions', COUNT(*) FROM public.ai_interactions;
```

## Row Level Security (RLS) Setup

**Important**: The schema creates tables with RLS enabled but policies must be configured separately based on your authentication setup.

### Basic RLS Policies Template

```sql
-- Example user data access policy
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Example workflow access policy  
CREATE POLICY "Users can manage own workflows" ON public.workflows
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Add policies for each table based on your security requirements
```

## Performance Optimization

### 1. Update Statistics

```sql
-- Update table statistics for query optimization
ANALYZE;

-- Update extended statistics
ANALYZE public.workflows, public.artifacts, public.ai_interactions;
```

### 2. Monitor Index Usage

```sql
-- Check index usage after deployment
SELECT * FROM get_index_usage_stats() 
WHERE num_rows > 0 
ORDER BY index_scans DESC;
```

### 3. Configure Connection Pooling

For production environments, configure connection pooling:
- Supabase: Use built-in connection pooler
- External: Configure pgBouncer or similar

## Backup and Recovery

### 1. Create Initial Backup

```bash
# Create backup after successful deployment
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
    > makalah_ai_schema_backup.sql
```

### 2. Test Restore Procedure

```bash
# Test restore on development database
psql "postgresql://..." < makalah_ai_schema_backup.sql
```

## Monitoring Setup

### 1. Set Up Monitoring Queries

```sql
-- Create monitoring views
CREATE VIEW database_health_dashboard AS
SELECT * FROM get_database_health_metrics();

-- Schedule regular health checks (if using pg_cron)
SELECT cron.schedule('database-health-check', '0 */6 * * *', 
    'INSERT INTO monitoring_log SELECT generate_schema_validation_report();');
```

### 2. Alert Thresholds

Monitor these metrics:
- Failed AI interactions > 10% of total
- Average response time > 5 seconds  
- Storage usage > 80% of allocation
- Index usage below expected patterns

## Troubleshooting

### Common Issues

1. **Permission Errors**:
   ```sql
   -- Ensure proper permissions
   GRANT USAGE ON SCHEMA public TO anon, authenticated;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
   ```

2. **Extension Missing**:
   ```sql
   -- Install required extensions
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   ```

3. **Migration Order Issues**:
   - Always execute migrations in sequential order
   - Check for missing dependencies if errors occur
   - Verify foreign key relationships are created before dependent tables

### Recovery Procedures

If deployment fails:

1. **Identify Failed Migration**:
   ```sql
   SELECT * FROM schema_validation_results 
   WHERE status = 'FAIL' 
   ORDER BY created_at DESC;
   ```

2. **Rollback Strategy**:
   - Restore from backup if available
   - Drop created objects in reverse order
   - Restart deployment from beginning

3. **Partial Recovery**:
   - Fix specific issues in failed migration
   - Resume from last successful migration

## Environment-Specific Configurations

### Development Environment

- Include sample data migration
- Enable verbose logging
- Use development-friendly RLS policies

### Production Environment

- Skip sample data migration  
- Configure strict RLS policies
- Set up automated backups
- Enable monitoring and alerting
- Configure SSL and security settings

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Run schema validation tests
2. **Monthly**: Review index usage and optimize
3. **Quarterly**: Update table statistics and vacuum
4. **As needed**: Scale database resources based on usage

### Getting Support

For deployment issues:
1. Check Supabase documentation and community
2. Review migration logs and error messages
3. Use schema validation tools to diagnose problems
4. Consult database administrator if needed

This deployment guide ensures a successful and maintainable database setup for the Makalah AI platform.