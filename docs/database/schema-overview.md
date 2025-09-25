# Makalah AI Database Schema Documentation

## Overview

This document provides comprehensive documentation for the Makalah AI Academic Writing Platform database schema. The database is designed to support a 7-phase academic workflow with AI assistance, user management, artifact versioning, and comprehensive logging.

## Database Design Principles

1. **Scalability**: UUID primary keys, proper indexing, and optimized query patterns
2. **Security**: Row Level Security (RLS) enabled on all tables
3. **Audit Trail**: Comprehensive logging of AI interactions and user activities
4. **Data Integrity**: Foreign key constraints and validation triggers
5. **Performance**: Strategic indexing and query optimization
6. **Flexibility**: JSONB columns for extensible metadata storage

## Core Schema Components

### 1. User Management System

#### Tables:
- `users` - Core user authentication and profile data
- `user_profiles` - Extended user information and academic preferences
- `user_sessions` - JWT session management and security tracking
- `user_preferences` - AI and UI preferences storage

#### Key Features:
- UUID-based user identification
- Role-based access control (admin, user, researcher, reviewer)
- Academic-focused profile fields (institution, research interests, expertise domains)
- JWT session management with device tracking
- Comprehensive user preference system for AI providers and models

### 2. Academic Workflow Management

#### Tables:
- `workflows` - Academic writing project instances
- `workflow_phases` - Individual phase tracking (7-phase system)
- `workflow_context` - Versioned context storage for workflows
- `approval_gates` - Human approval gates for workflow phases
- `approval_responses` - Individual approver responses

#### 7-Phase Academic Workflow:
1. **Research Analysis** - Initial research and data gathering
2. **Outline Generation** - Structure and outline creation
3. **Draft Composition** - Content writing and development
4. **Content Refinement** - Editing and improvement
5. **Citation Integration** - Reference and citation management
6. **Academic Review** - Quality assessment and peer review
7. **Final Formatting** - Final document preparation

#### Key Features:
- Automatic phase progression with approval gates
- Context versioning for maintaining workflow state
- Progress tracking with percentage completion
- Quality scoring and performance metrics
- Flexible approval workflows with timeout handling

### 3. Artifact Storage & Versioning

#### Tables:
- `artifacts` - Main artifact storage with Supabase Storage integration
- `artifact_versions` - Complete version history with diff tracking
- `artifact_metadata` - Extended searchable metadata

#### Key Features:
- Integration with Supabase Storage for file management
- Complete version history with rollback capabilities
- Content quality scoring using AI analysis
- Full-text search across artifacts and metadata
- Template system for reusable artifacts
- Automatic content hash generation for integrity verification

### 4. AI Interaction Logging

#### Tables:
- `ai_interactions` - Comprehensive AI provider interaction logs
- `tool_usage_logs` - AI tool execution and performance tracking
- `research_queries` - Research query tracking with source management
- `research_query_results` - Individual search results with credibility assessment

#### Key Features:
- Multi-provider AI support (OpenAI, OpenRouter, Anthropic)
- Detailed performance metrics (tokens, cost, response time)
- Tool execution chains with parent-child relationships
- Research source credibility assessment
- Comprehensive error tracking and retry mechanisms

## Database Enums

The schema uses PostgreSQL enums for type safety and consistency:

- `workflow_status` - draft, active, paused, completed, cancelled, failed
- `academic_phase` - 7 distinct academic writing phases
- `phase_status` - pending, in_progress, waiting_approval, approved, rejected, completed, skipped, failed
- `artifact_type` - research_document, outline, draft_section, final_document, etc.
- `ai_provider` - openai, openrouter, anthropic, google, huggingface, local
- `interaction_type` - chat_completion, streaming_response, tool_calling, etc.
- `source_credibility` - very_high, high, medium, low, unknown

## Indexing Strategy

### Performance Optimization:
1. **Primary Indexes**: UUID primary keys with automatic indexing
2. **Foreign Key Indexes**: All foreign keys properly indexed
3. **Composite Indexes**: Multi-column indexes for frequent query patterns
4. **Partial Indexes**: Indexes on filtered data for specific conditions
5. **GIN Indexes**: JSONB and array column indexing for flexible queries
6. **Full-Text Search**: Comprehensive search across content and metadata

### Analytics Indexes:
- Time-series indexes for reporting and analytics
- Performance monitoring indexes for AI interactions
- User activity pattern indexes
- Cost tracking and optimization indexes

## Security Considerations

### Row Level Security (RLS):
- All tables have RLS enabled
- User-based access control policies
- Workflow-based data isolation
- Admin override capabilities for system maintenance

### Data Protection:
- Password hashing with bcrypt
- JWT token management with expiration
- Content hash verification for integrity
- Audit trails for all data modifications

## Performance Features

### Automated Optimization:
- **Triggers**: Automatic data validation and state management
- **Functions**: Performance-optimized stored procedures
- **Statistics**: Extended statistics for query optimization
- **Cleanup**: Automated cleanup of expired data

### Monitoring:
- Index usage statistics and recommendations
- Database health metrics
- Performance bottleneck identification
- Cost optimization recommendations

## Integration Points

### Supabase Integration:
- **Storage**: File storage for artifacts with proper bucket management
- **Auth**: Integration with Supabase Auth for user management
- **Real-time**: Support for real-time subscriptions on workflow changes
- **Edge Functions**: Integration points for AI processing

### AI Provider Integration:
- **Multi-provider Support**: OpenAI, OpenRouter, Anthropic compatibility
- **Cost Tracking**: Token usage and cost estimation
- **Performance Monitoring**: Response time and quality metrics
- **Error Handling**: Comprehensive retry and fallback mechanisms

## Data Retention Policies

### Automatic Cleanup:
- **User Sessions**: 30-day retention for inactive sessions
- **AI Interactions**: 6-month retention with archival to separate table
- **Artifact Versions**: 50 version limit with major version preservation
- **Expired Context**: 90-day retention for inactive context
- **Research Results**: Deduplication and quality-based retention

## Migration Strategy

### Sequential Migrations:
1. **Core Schema**: Users, profiles, sessions, preferences
2. **Workflow Management**: Workflows, phases, context, approval gates
3. **Artifact System**: Artifacts, versions, metadata
4. **AI Logging**: Interactions, tool usage, research queries
5. **Functions & Triggers**: Business logic and automation
6. **Performance Optimization**: Indexes and monitoring

### Rollback Safety:
- All migrations include rollback procedures
- Data integrity checks before and after migrations
- Backup verification requirements
- Gradual deployment with monitoring

## Monitoring and Maintenance

### Health Monitoring:
- Database performance metrics
- Index usage analysis
- Storage utilization tracking
- Query performance optimization

### Maintenance Procedures:
- Regular statistics updates
- Index maintenance and optimization
- Data archival and cleanup
- Security audit and updates

This schema provides a robust foundation for the Makalah AI platform with excellent performance, security, and scalability characteristics.