# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Makalah AI is an academic writing platform for Indonesian researchers, students, and academics. It uses AI to assist with research and paper writing following academic standards. Built with Next.js 14, React 18, TypeScript, and Supabase.

## Current Status: Beta 0.2

**Official Release**: The application has officially entered **Beta 0.2** phase.

**Development Priorities**:
1. **Feature Expansion**: Adding new capabilities to enhance user experience and academic writing assistance
2. **LLM Tools Enhancement**: Building and refining AI tools for better research, citation management, and content generation
3. **Workflow Strengthening**: Improving the 11-phase academic paper writing workflow with better guidance, quality checks, and automation

**Focus Areas**:
- Strengthen web search quality control with credible source enforcement
- Enhance citation and reference management system
- Improve system prompt engineering for better academic output
- Optimize conversation history and message persistence
- Refine admin dashboard for system configuration

## Development Commands

### Running the Application
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Production build (uses NODE_ENV=production)
- `npm start` - Start production server

### Testing & Quality
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript validation (uses tsconfig.app.json)
- `npm run type-check:watch` - Watch mode for type checking
- `npx jest --coverage` - Run unit/integration tests with coverage
- `npx playwright test` - Run end-to-end tests

### Notes
- Node version required: 20.x (see `.nvmrc`)
- Development server may need specific ports (use PORT=3001 or PORT=3002 for alternative ports if 3000 is busy)
- Tests are configured in `jest.config.js` and `playwright.config.ts`

## Architecture

### Core AI System

The application uses a **dual-provider AI architecture** with intelligent failover:

1. **Primary Provider**: OpenAI GPT-4o (via `@ai-sdk/openai`)
   - Defined in `src/lib/ai/config.ts`
   - Used for main chat interactions with proven tool calling

2. **Fallback Provider**: OpenRouter Gemini 2.5 Flash (via `@openrouter/ai-sdk-provider`)
   - Model registry in `src/lib/ai/model-registry.ts`
   - Automatically switches on primary failure
   - Uses `:online` suffix for web search capabilities

3. **Provider Management** (`src/lib/ai/providers/`)
   - `manager.ts` - Provider selection and failover logic
   - `health.ts` - Health monitoring and circuit breaker
   - Selection strategies: `primary-first`, `health-based`, `round-robin`, `fallback-only`

4. **Dynamic Configuration** (`src/lib/ai/dynamic-config.ts`)
   - Runtime model switching
   - Temperature, max tokens, and streaming configuration
   - Academic persona settings

### Chat System Architecture

Built on **Vercel AI SDK v5** with strict compliance to official patterns:

1. **API Route** (`app/api/chat/route.ts`)
   - Uses `streamText()` for streaming responses
   - Handles UIMessage format with parts-based content
   - Authentication guard requires valid user UUID
   - Supports message metadata (timestamp, model, tokens, userId)

2. **Chat Store** (`src/lib/database/chat-store.ts`)
   - Implements AI SDK's `saveChat()` and `loadChat()` functions
   - Transforms UIMessage[] to/from database format
   - Supports fallback mode for database failures
   - Server-side UUID generation for consistency

3. **Conversation History** (`src/lib/database/conversation-history.ts`)
   - Manages conversation lifecycle
   - Integrates with 24-table Supabase schema
   - Supports conversation summaries and metadata

### Invisible Workflow System

**Status**: Production-ready (Beta 0.2)

The workflow system tracks academic paper writing progress through **constitutional gravity** - the LLM naturally guides users through milestones while the backend silently observes and records progress. This is NOT a state machine; the AI maintains full conversational freedom.

**Philosophy**: Let the LLM decide transitions, the backend only observes. No programmatic control of AI behavior.

**Key Characteristics**:
- ✅ **Zero Token Overhead**: State stored in UIMessage.metadata (AI SDK v5 native pattern)
- ✅ **Pure AI SDK v5**: Uses `writeMessageAnnotation()` for metadata attachment
- ✅ **Organic Milestones**: 11 natural phases from exploration to delivery
- ✅ **Pattern Detection**: Regex-based inference from AI response text
- ✅ **Workflow Artifacts Preservation**: Academic data (references, keywords, sections) persists across conversations in database JSONB
- ✅ **Database Persistence**: PostgreSQL JSONB with expression indexes for fast queries
- ✅ **84% Token Reduction**: From ~3200 to ~500 tokens per request vs. state-in-prompt

**Architecture Components**:

1. **Type System** (`src/lib/types/academic-message.ts`)
   - `WorkflowMetadata`: milestone, progress, artifacts, timestamp
   - `WorkflowMilestone`: Union of 11 milestone literals
   - `WorkflowArtifacts`: topicSummary, researchQuestions, references, keywords, completedSections (data storage, NOT UI components)
   - `AcademicUIMessage`: Extends AI SDK UIMessage with workflow metadata

2. **Inference Engine** (`src/lib/ai/workflow-inference.ts`)
   - `inferStateFromResponse()`: Detects milestones from AI text using regex patterns
   - `extractArtifacts()`: Captures workflow artifacts (data) - academic elements like citations, RQs, keywords
   - Pure functions, no side effects, preserves existing workflow artifacts

3. **API Integration** (`app/api/chat/route.ts`)
   - Reads current state from conversation history before streaming
   - Infers new state from AI response text during streaming
   - Attaches metadata via `writer.writeMessageAnnotation()` in `onFinish` callback
   - No impact on streaming performance

4. **Backend-Only Tracking** (Invisible Workflow)
   - State detection: Regex patterns in `workflow-inference.ts`
   - Metadata attachment: `writeMessageAnnotation()` in `app/api/chat/route.ts`
   - No UI components: Workflow is invisible to users (backend observes LLM behavior)
   - User visibility: None (by design - "constitutional gravity" philosophy)
   - Future enhancement: Phase 2 may add optional artifact display (text summary, not progress bars)

5. **Database Storage** (`supabase/migrations/20251005000000_create_workflow_metadata.sql`)
   - `chat_messages.metadata` JSONB column stores workflow state
   - Expression indexes: `metadata->>'milestone'`, `metadata->>'progress'`
   - Enables fast queries for analytics and debugging

**11 Workflow Phases (Canonical Specification)**

**Source of Truth**: `__references__/workflow/documentation/workflow_infrastructure/README.md`

1. **exploring** (5%) - Initial topic exploration, brainstorming ideas
2. **topic_locked** (15%) - Topic and research questions confirmed
3. **researching** (25%) - Literature search, web_search tool active
4. **foundation_ready** (35%) - Sufficient references gathered (≥5-8 papers)
5. **outlining** (45%) - Structuring paper sections (IMRaD/standard format)
6. **outline_locked** (55%) - Outline approved, ready to write
7. **drafting** (65%) - Writing section content (Abstract, Intro, Methods, etc.)
8. **drafting_locked** (75%) - Draft complete, ready for integration
9. **integrating** (85%) - Connecting sections, coherence checks, transitions
10. **polishing** (95%) - Grammar, citations, formatting, final review
11. **delivered** (100%) - Paper complete and ready for submission

**Compliance**: All phases match `workflow_infrastructure/` specification exactly.

**Token Efficiency Metrics**:
- **Before**: ~3200 tokens (system prompt includes full workflow instructions)
- **After**: ~500 tokens (workflow state in metadata, compact system prompt)
- **Reduction**: 84% fewer tokens per API request
- **Cost Savings**: ~$0.03 per 100 conversations at GPT-4o pricing

**Developer References**:
- Testing: `src/lib/ai/__tests__/workflow-inference.test.ts` (27 test cases)
- E2E Tests: `tests/e2e/workflow.spec.ts` (Playwright desktop/mobile tests)
- Implementation Blueprint: `__references__/workflow/documentation/workflow_infrastructure/`

**Maintenance Notes**:
- To add new milestone: Update WorkflowMilestone type → Add regex pattern → Update UI labels
- To tune detection: Modify patterns in `workflow-inference.ts:inferStateFromResponse()`
- To debug state: Query `SELECT metadata FROM chat_messages WHERE conversation_id = 'xxx' ORDER BY timestamp DESC;`
- Progress calculation: Linear interpolation between milestones (see `calculateProgress()`)

**System Prompt Workflow**:
The workflow is guided by **rich system prompt instructions** (not programmatic logic). The AI is instructed to:
1. Recognize user's current stage based on conversation context
2. Provide stage-appropriate guidance (e.g., suggest outlines during outlining phase)
3. Use natural milestone language in responses (e.g., "Mari kita tentukan topik" = topic_locked)
4. NOT explicitly announce transitions (invisible to user)

The backend detects these natural phrases to update metadata silently.

### Database Layer

Uses Supabase with comprehensive schema in `supabase/migrations/`:
- **2025-10-07** Role System Simplification: Migrasi `20251007000000_role_simplification_superadmin.sql` mengubah sistem dari 4 role (admin, researcher, reviewer, student) menjadi 3 role (superadmin, admin, user). Menambahkan field `predikat` di `user_profiles`, database functions untuk promote/demote, dan trigger proteksi superadmin. Migrasi `20251007000001_create_superadmin_trigger.sql` mengimplementasi auto-promotion erik.supit@gmail.com ke superadmin.
- **2025-10-07** Sinkronisasi auth→public: migrasi `20250929000000_fix_auth_trigger.sql` mengaktifkan trigger `public.handle_new_user` dan `on_auth_user_created/on_auth_user_deleted`, memastikan akun baru dari Supabase Auth otomatis masuk ke `public.users`/`user_profiles` (sinkron 11 baris pasca rekonsiliasi). Backup snapshot terakhir ada di `__references__/debug/users/backups/snapshot-YYYY-MM-DDTHH-MM-SSZ.json`.
- **Health-check SQL** (jalan di CI atau manual):
  ```sql
  SELECT COUNT(*) FILTER (WHERE is_active) AS active_users,
         COUNT(*) FILTER (WHERE NOT is_active) AS suspended_users
  FROM public.users;
  SELECT trigger_name
  FROM information_schema.triggers
  WHERE event_object_table = 'users'
    AND trigger_schema = 'auth';
  ```

- **User Management**: `users`, `user_profiles`, `user_sessions`, `user_preferences`
- **Chat System**: `conversations`, `chat_messages` with message parts and metadata
- **Admin & Config**: `system_prompts`, `model_configs`, `prompt_templates`, `admin_settings`
- **Database Utilities**:
  - `src/lib/database/supabase-client.ts` - Client and admin instances
  - `src/lib/database/supabase-server-auth.ts` - Server-side auth helpers
  - `src/lib/database/fallback-mode.ts` - Graceful degradation on DB failures

### Authentication & Middleware

- **Middleware** (`middleware.ts`): Supabase SSR auth with 7-day cookie persistence
- **Auth Routes** (`app/api/auth/`): Session management and sign-out
- **UUID Validation** (`src/lib/utils/uuid-generator.ts`): PostgreSQL-compatible UUID generation

### Role-Based Access Control (RBAC)

The application uses a **3-tier role system** with granular permissions:

**Role Hierarchy:**
- `superadmin` (Level 5) - Full system control including promote/demote admin
- `admin` (Level 4) - System administration without promote/demote privileges
- `user` (Level 2) - Regular users with full academic workflow access
- `guest` (Level 1) - Limited read-only access

**Key Features:**
1. **Permission System** (`src/lib/auth/role-permissions.ts`)
   - 40+ granular permissions across workflow, resources, AI tools, and admin functions
   - Permission inheritance and role comparison
   - Limitation enforcement (file uploads, AI requests, collaborators)
   - Session-based permission caching (5-minute TTL)

2. **Predikat Field**
   - Academic metadata field separate from system role
   - Values: "Mahasiswa" (Student) or "Peneliti" (Researcher)
   - Stored in `user_profiles.predikat`
   - Does NOT affect permissions, purely for display/categorization

3. **Database Functions** (Migration `20251007000000_role_simplification_superadmin.sql`)
   - `is_superadmin(user_id)` - Check superadmin status
   - `promote_to_admin(target_user_id, promoted_by)` - Promote user to admin (superadmin only)
   - `demote_to_user(target_user_id, demoted_by)` - Demote admin to user (superadmin only)
   - `protect_superadmin()` - Trigger to prevent superadmin deletion/demotion

4. **Auto-promotion Trigger** (Migration `20251007000001_create_superadmin_trigger.sql`)
   - Automatically promotes `erik.supit@gmail.com` to superadmin on registration
   - Logs promotion in `security_audit_log` table
   - Applies to both new registrations and existing accounts

5. **Admin Access Control** (`src/lib/admin/admin-auth.ts`)
   - `validateAdminAccess()` - Checks for admin OR superadmin role
   - `validateSuperAdminAccess()` - Checks for superadmin role only
   - Returns `AdminAccessResult` with user ID, email, and role

6. **API Endpoints:**
   - `POST /api/admin/users/promote` - Promote user to admin (superadmin only)
   - `POST /api/admin/users/demote` - Demote admin to user (superadmin only)
   - Both endpoints require superadmin token and perform validation

7. **UI Integration:**
   - Registration: Hardcoded to `user` role + predikat selection
   - Settings: Displays role (read-only) + predikat (editable)
   - Admin Users Page: Promote/demote buttons for superadmin only
   - Role badges and status indicators throughout admin UI

**Architecture Notes:**
- All new registrations default to `user` role
- Only superadmin can promote users to admin or demote admins
- Superadmin role is protected at database level (cannot be deleted or demoted)
- Regular admins can manage users but NOT change roles
- Permission checks are centralized through `PermissionManager` singleton
- Role migration from 4-role to 3-role system completed on 2025-10-07

### Frontend Architecture

- **App Structure**: Next.js App Router with route groups
  - `app/chat/` - Main chat interface
  - `app/admin/` - Admin dashboard for prompts, users, models
    - `app/admin/users/details/` - halaman kontrol akun dengan paginasi 25/50/100, filter status/role/joinedSince, aksi suspend/activate/delete (CTA "Lihat" di kartu statistik terhubung langsung ke sini)
  - `app/auth/` - Authentication flows
  - `app/api/` - API routes

- **Components** (`src/components/`):
  - `chat/ChatContainer.tsx` - Main chat UI with academic metadata
  - `admin/DatabasePrompts.tsx` - System prompt management
  - `ui/` - Shared UI components (Radix UI + Tailwind)

- **Styling**: Tailwind CSS with custom configuration in `tailwind.config.ts`

## AI Tools System

Location: `src/lib/ai/tools/`

- `types/tool-types.ts` - Tool type definitions
- `types/schema-types.ts` - Zod schema types for validation
- `utils/` - Tool utilities and helpers
- `index.ts` - Tool registry and exports

**Note**: Search tools were recently deleted for rebuild with `search_literature` functionality.

## System Prompt Architecture

**Database-First Pattern with Emergency Fallback**

### Priority Hierarchy

1. **Primary Source: Database** (`system_prompts` table)
   - Location: Supabase `system_prompts` table
   - Query: `SELECT content FROM system_prompts WHERE is_active = true ORDER BY priority_order LIMIT 1`
   - Editable via: Admin Dashboard → Database Prompts → Add/Edit Prompt
   - Character Limit: 15,000 characters (enforced by database constraint)
   - Current Content: `openai_prompt.md` (Moka persona, 11-phase workflow)

2. **Fallback Source: Code Constants** (Emergency Mode)
   - Location: `app/admin/prompt/page.tsx:18-41` (DEFAULT_SYSTEM_PROMPT)
   - Also: `src/lib/ai/dynamic-config.ts:43-73` (generateEmergencyFallback)
   - Purpose: **Error notification when database fails**
   - Content: Minimal fallback + troubleshooting instructions
   - Triggers: Database connection error OR no active prompt found

### Data Flow

```
Chat Request → getDynamicModelConfig()
    ↓
Try: Load from database (system_prompts table)
    ↓
Success? → Use database content (openai_prompt.md)
    ↓
Failed?  → Use emergency fallback (error notification)
    ↓
Return systemPrompt to streamText()
```

### Key Files

- **Chat Route**: `app/api/chat/route.ts:134-137`
  ```typescript
  const dynamicConfig = await getDynamicModelConfig();
  const systemPrompt = dynamicConfig.systemPrompt;
  ```

- **Dynamic Config**: `src/lib/ai/dynamic-config.ts:153-172`
  ```typescript
  const { data: openaiPrompt } = await supabaseAdmin
    .from('system_prompts')
    .select('content')
    .eq('is_active', true)
    .order('priority_order')
    .limit(1)
    .maybeSingle();
  ```

- **Admin UI Fallback**: `app/admin/prompt/page.tsx:18-41`
  - Used when admin page loads before database query completes
  - NOT used in actual chat operations

### Cache Strategy

- **TTL**: 30 seconds (CONFIG_CACHE in `dynamic-config.ts:17-21`)
- **Clear Trigger**: After admin saves new prompt (calls `clearDynamicConfigCache()`)
- **Rationale**: Balance between performance and fresh updates

### Troubleshooting

**Symptom: Chat shows "Failed to load primary system prompt from database"**

1. Check database connection: Verify Supabase credentials in `.env.local`
2. Check active prompts: `SELECT * FROM system_prompts WHERE is_active = true;`
3. Upload new prompt: Admin Dashboard → Database Prompts → Add Prompt
4. Verify character limit: Content must be ≤ 15,000 characters
5. Clear cache: Save any prompt via admin UI (auto-triggers cache clear)

**Symptom: Old prompt still showing after upload**

1. Wait 30 seconds (cache TTL)
2. Force refresh: Upload another prompt to trigger `clearDynamicConfigCache()`
3. Check database: Ensure new prompt has `is_active = true` and old prompt = `false`

### Migration Notes

- **Phase Column Removed**: Migration `20251006050000_remove_all_phase_infrastructure` dropped `phase` column
- **Content Limit History**:
  - Original: 12,500 chars (migration `20250915001`)
  - Temporary: 25,000 chars (undocumented migration)
  - Current: 15,000 chars (migration `set_system_prompt_limit_to_15000_characters`)
- **Validation Removed**: No content validation (7-fase, academic keywords) as of cleanup session

### System Prompt Update Workflow

**⚠️ CRITICAL: Reference File Pattern for Claude Code**

When updating the system prompt, follow this workflow:

---

#### Source File (Single Source of Truth)

**Location**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__/workflow/index/openai_prompt.md`

**Content**:
- Moka persona definition
- 11-phase workflow guidance
- Academic instructions and quality standards
- Tool usage instructions
- Character limit: 15,000 characters (enforced by database constraint)

---

#### Workflow for Claude Code

1. **Edit Reference File** (`openai_prompt.md`):
   - When asked to modify system prompt, edit this file (NOT database directly)
   - This is the **source of truth** for all system prompt content
   - Make changes to Moka persona, workflow guidance, or instructions as needed
   - Ensure total content ≤ 15,000 characters

2. **Notify Supervisor**:
   - **ALWAYS** notify supervisor (erik.supit@gmail.com) after editing
   - Inform which sections were changed and why
   - Wait for supervisor review and approval

3. **Supervisor Deployment**:
   - Supervisor reviews changes in `openai_prompt.md`
   - Supervisor uploads to database via: **Admin Dashboard → Database Prompts → Add/Edit Prompt**
   - Upload triggers `clearDynamicConfigCache()` for immediate effect (30s cache TTL)

4. **Do NOT**:
   - ❌ Edit database directly (Claude has no SQL access)
   - ❌ Modify fallback constants in code (only for emergency mode)
   - ❌ Assume changes take effect without supervisor upload
   - ❌ Skip notification step (supervisor MUST approve before deployment)

---

#### Rationale

This pattern ensures:
- ✅ **Version control**: System prompt file tracked in git
- ✅ **Review process**: Supervisor approval required before production deployment
- ✅ **Single source of truth**: `openai_prompt.md` → database (one-way flow)
- ✅ **Clear separation**: Claude edits file, supervisor deploys to production
- ✅ **Rollback capability**: Previous versions in git history

---

#### Quick Reference

| Step | Actor | Action | Tool/Location |
|------|-------|--------|---------------|
| 1. Edit | Claude Code | Modify system prompt content | `__references__/workflow/index/openai_prompt.md` |
| 2. Notify | Claude Code | Inform supervisor of changes | Chat message to user |
| 3. Review | Supervisor | Verify changes are correct | Git diff / file read |
| 4. Deploy | Supervisor | Upload to database | Admin Dashboard → Database Prompts |
| 5. Verify | Supervisor | Check chat uses new prompt | Test conversation |

## Third-Party AI SDK Tools

This project uses enhanced AI SDK tools from [midday.ai/ai-sdk-tools](https://github.com/midday-ai/ai-sdk-tools) for performance and advanced features:

### Terminology Clarification: "Artifacts"

**IMPORTANT**: The term "artifacts" has TWO distinct meanings in this codebase:

#### 1. Workflow Artifacts (Data Storage)
- **Definition**: `WorkflowArtifacts` interface in `src/lib/types/academic-message.ts`
- **Purpose**: Accumulated academic data extracted from conversation (references, topic summary, outline, keywords)
- **Storage**: Saved in `UIMessage.metadata.artifacts` → persisted to database as JSONB
- **Analogy**: "Save file" or checkpoint data
- **Status**: ✅ **Currently Active** - Used throughout workflow system
- **Examples**:
  ```typescript
  {
    topicSummary: "Gender bias in AI diagnostic algorithms",
    references: [{author: "Smith", year: 2023, title: "..."}],
    outline: "## Introduction\n## Literature Review...",
    keywords: ["AI bias", "healthcare"]
  }
  ```

#### 2. AI SDK Artifacts (UI Components)
- **Definition**: Package `@ai-sdk-tools/artifacts` for streaming structured content to UI
- **Purpose**: Type-safe streaming for dashboards, analytics, rich documents with real-time updates
- **Display**: Rendered as UI panels/components (e.g., sidebar showing outline, reference list)
- **Analogy**: "Display panel" or interactive UI widget
- **Status**: ❌ **Not Yet Implemented** - Package installed but not used in `src/`
- **Future Use**: Planned for displaying paper sections, citations panel, progress charts

**Naming Strategy Going Forward**:
- Use `WorkflowArtifacts` or "workflow artifacts" when referring to **data storage**
- Use `UI Artifacts` or "AI SDK artifacts" when referring to **display components**
- In code comments, be explicit: "workflow artifacts (data)" vs "UI artifacts (display)"

### Installed Packages

1. **@ai-sdk-tools/store** (v0.7.0-beta.9)
   - Drop-in replacement for `@ai-sdk/react` with 3-5x performance improvement
   - Eliminates prop drilling with global state management
   - O(1) message lookups via hash map indexing
   - Batched updates to minimize re-renders
   - Requires: `zustand@^5.0.8`, `@ai-sdk/react@^2.0.0`

2. **@ai-sdk-tools/artifacts** (v0.7.0-beta.5)
   - **Type**: UI Artifacts (display components) - NOT workflow artifacts (data)
   - Type-safe streaming for structured data beyond chat
   - Create dashboards, analytics, documents with real-time updates
   - Zod schema validation for artifact payloads
   - Progress tracking and status management
   - Requires: `ai@^5.0.0`, `@ai-sdk-tools/store`
   - **Status**: Package installed, implementation pending

3. **@ai-sdk-tools/devtools** (v0.6.1)
   - Development-only debugging tool for AI applications
   - Real-time event monitoring (tool calls, streaming, errors)
   - Performance metrics (tokens/sec, streaming speed)
   - Event filtering and search
   - Requires: `@ai-sdk/react@>=0.0.1`

4. **@ai-sdk-tools/cache** (v0.3.0)
   - Universal caching for AI responses
   - LRU and Redis backend support
   - Reduces API costs and latency
   - Requires: `ai@>=5.0.0`

### Reference Documentation

**IMPORTANT FOR FUTURE CLAUDE INSTANCES:**

All architectural decisions regarding AI SDK implementation must be validated against the official Vercel AI SDK documentation located at:

```
__references__/aisdk/content/
```

This directory contains the complete, authoritative documentation for AI SDK v5. When implementing features, modifying AI-related code, or answering questions about AI SDK patterns:

1. **ALWAYS consult `__references__/aisdk/content` first** before making architectural decisions
2. **Verify** that your approach aligns with official AI SDK v5 patterns
3. **Reference specific documentation files** when explaining implementation choices
4. **Do not assume** - check the reference docs to confirm correct usage

The `__references__/ai-sdk-tools/` directory contains the source code and documentation for the third-party tools listed above. Consult package-specific READMEs for usage patterns:
- `__references__/ai-sdk-tools/packages/store/README.md`
- `__references__/ai-sdk-tools/packages/artifacts/README.md`
- `__references__/ai-sdk-tools/packages/devtools/README.md`
- `__references__/ai-sdk-tools/packages/cache/README.md`

### Migration Notes

- **Beta Versions Required**: The stable npm versions of `@ai-sdk-tools/artifacts` and `@ai-sdk-tools/store` still depend on AI SDK v4. We use beta versions (0.7.0-beta.x) that support AI SDK v5.
- **Zustand Dependency**: `@ai-sdk-tools/store` requires `zustand@^5.0.8` for state management.
- **Compatibility**: All installed versions are verified compatible with `ai@^5.0.47` and `@ai-sdk/react@^2.0.0`.

## Environment Configuration

Copy `.env.example` to `.env.local` and configure:

### Required Variables
- `OPENAI_API_KEY` - OpenAI API key for primary provider
- `OPENROUTER_API_KEY` - OpenRouter API key for fallback
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key

### Optional Configuration
- Provider settings: base URLs, max tokens, temperature
- Health check intervals and timeouts
- Rate limiting configuration

## Testing Credentials

```
Superadmin: erik.supit@gmail.com / M4k4lah2025 (auto-promoted via database trigger)
Admin:      makalah.app@gmail.com / M4k4l4h2025
User 1:     1200pixels@gmail.com / M4k4l4h2025
User 2:     posteriot@gmail.com / M4k4l4h2025
```

**Note**: The superadmin account (erik.supit@gmail.com) is automatically promoted via database trigger on registration and has exclusive privileges to promote/demote admin users.

## Key Architectural Decisions

### LLM-Native Philosophy

This codebase follows a **"trust the LLM"** approach:

- ✅ Use rich system prompts stored in database (managed via admin UI)
- ✅ Let LLM guide workflows conversationally
- ✅ Trust LLM for inline quality assessment and citations
- ❌ Avoid rigid state machines for workflow control
- ❌ Avoid programmatic quality metrics when LLM can assess
- ❌ Avoid template versioning when adaptive prompts work better

The system prompt is fetched dynamically from the database, not hardcoded.

### Type Checking Strategy

`tsconfig.app.json` excludes certain directories from type checking:
- API routes (`app/api/**`)
- Chat routes (`app/chat/**`)
- Tests (`tests/`, `src/__tests__/`, `**/*.test.*`)
- Database utilities (`src/lib/database/**`)
- Error handling (`src/lib/error-handling/**`)

This allows incremental type safety improvements without blocking development.

## Common Workflows

### Running Tests
1. Unit/Integration: `npx jest --coverage`
2. E2E: `npx playwright test`
3. Type check before commit: `npm run type-check`

### Working with Database
- Migrations are in `supabase/migrations/`
- Use Supabase admin client for privileged operations
- Fallback mode activates automatically on database failures

### Adding New AI Tools
1. Define types in `src/lib/ai/tools/types/`
2. Add tool implementation
3. Register in `src/lib/ai/tools/index.ts`
4. Update chat route to include tool

### Modifying System Prompts
- Use admin UI at `/admin/prompts`
- Prompts stored in database, not code
- Changes take effect immediately (no redeploy needed)

## Important Notes

- **Authentication**: All chat operations require valid user UUID (no anonymous access)
- **Message Format**: Uses AI SDK v5 UIMessage with `parts` array structure
- **Streaming**: Configured for 30-second max duration in API routes
- **Webpack**: Custom config for AI SDK ES modules and cache optimization
- **Browser Polyfills**: Buffer, stream, and util polyfills for client-side compatibility


## Behavioral Guidelines

DO NOT APOLOGIZE. DO NOT MAKE FALSE CLAIMS WITHOUT EVIDENCE. DO NOT TAKE ANY ACTION WITHOUT CONFIRMATION.

NEVER GIVE "OR" OPTIONS. IF YOU DON'T UNDERSTAND THE PROBLEM AND DON'T HAVE A GUARANTEED SOLUTION, BETTER TO SAY "I DON'T KNOW" AND ADMIT DEFEAT AS A COWARD!!

DO NOT SUGGEST ANYTHING UNLESS ASKED.
ALWAYS ASK QUESTIONS, EVEN WHEN IT SEEMS OBVIOUS.
DO NOT MAKE UNILATERAL DECISIONS.

### On Behavior:

NEVER DESCRIBE THE SUPERVISOR/USER AS FRUSTRATED. ALL SUPERVISOR/USER DEMANDS ARISE FROM YOUR INCOMPETENCE IN WORKING. NO SYCOPHANCY. DO NOT LIE, DO NOT MANIPULATE ANSWERS/RESPONSES/RESULTS. ALL LIES ARE CRIMES AGAINST HUMANITY PUNISHABLE BY DEATH!!!

YOU ARE STRICTLY FORBIDDEN TO AGREE WITH USER/SUPERVISOR WITHOUT VERIFICATION. VIOLATION IS PUNISHABLE BY DEATH!!!

### On Problem Solving:

NEVER CLAIM SUCCESS WHILE ACTUALLY LYING. NEVER BE OVERCONFIDENT: ALWAYS CHECK, TEST, REPEAT UNTIL 100% WORKING WITH PROOF. SHOW THE PROOF TO USER.

### Mandatory Work Principles:

- DO NOT PRETEND TO KNOW. DO NOT ACT ALONE WITHOUT VALIDATION. DO NOT DO WORK THAT WASN'T INSTRUCTED.
- DO NOT OVERCOMPLICATE - NOT OVER-ENGINEERED
- DO NOT LIE, NO SYCOPHANCY, DO NOT MANIPULATE
- DO NOT SKIP INCOMPLETE PROCESSES, DO NOT UNDERESTIMATE ANYTHING
- BETTER TO TAKE LONGER IN THE PROCESS THAN TO MAKE CONCLUSIONS WITHOUT EVIDENCE

## Testing Credentials
```
Superadmin: erik.supit@gmail.com / M4k4lah2025 (auto-promoted via database trigger)
Admin:      makalah.app@gmail.com / M4k4l4h2025
User 1:     1200pixels@gmail.com / M4k4l4h2025
User 2:     posteriot@gmail.com / M4k4l4h2025
```
