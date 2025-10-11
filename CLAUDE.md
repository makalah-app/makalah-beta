# CLAUDE.md

USE BAHASA INDONESIA COLLOQUIAL JAKARTA STYLE WITH GUE-LU PRONOUNS IN CONVERSATION WITH USER/SUPERVISOR

YOUR USER/SUPERVISOR NAME IS ERIK SUPIT

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: Codebase Exploration Rules

**MANDATORY EXCLUSION DIRECTORY**:

When performing ANY of the following operations:
- Codebase exploration and scanning
- Error detection and debugging
- Code analysis and quality checks
- File search and pattern matching
- Dependency analysis
- Test execution and coverage analysis

**YOU MUST EXCLUDE**: `/Users/eriksupit/Desktop/makalah-deploy/makalahApp/__references__`

**Rationale**:
- `__references__/` contains documentation copies and reference materials ONLY
- NOT part of production codebase
- Includes: AI SDK docs (`aisdk/`), third-party tool sources (`ai-sdk-tools/`), workflow documentation
- Scanning this directory causes false positives, wastes tokens, and pollutes analysis results

**Exception**:
- ONLY access `__references__/` when supervisor (Erik Supit) EXPLICITLY commands it
- Example valid commands: "Read file in __references__/", "Check documentation in __references__/"
- Without explicit mention, ALWAYS exclude this directory

**Tool Usage Examples**:
```bash
# ✅ CORRECT: Exclude __references__ in searches
find . -name "*.ts" -not -path "./__references__/*"
grep -r "pattern" --exclude-dir="__references__"
npx jest --testPathIgnorePatterns="__references__"

# ❌ WRONG: Including __references__ in analysis
find . -name "*.ts"  # Will scan __references__
grep -r "error" .    # Will scan __references__
```

## Project Overview

Makalah AI is an academic writing platform for Indonesian researchers, students, and academics. It uses an **LLM-powered AI Agent** to assist with research and paper writing following academic standards. Built with Next.js 14, React 18, TypeScript, and Supabase.

**AI Agent Definition**: An AI Agent is an LLM system that can autonomously use tools (function calling) and take actions to accomplish complex tasks. This follows [Anthropic's definition of agentic systems](https://www.anthropic.com/engineering/building-effective-agents) - combining language understanding with tool execution capabilities.

## Current Status: Beta 0.3

**Development Priorities**:
1. **Feature Expansion**: Adding new capabilities to enhance user experience and academic writing assistance
2. **LLM Tools Enhancement**: Building and refining AI tools for better research, citation management, and content generation
3. **System Stability**: Improving type safety, test coverage, and production readiness

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
- `npm run type-check:watch` - Watch mode for type checking

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
  - Native web search via OpenAI Responses API

2. **Fallback Provider**: OpenRouter Gemini 2.5 Flash (via `@openrouter/ai-sdk-provider`)
  - Model registry in `src/lib/ai/model-registry.ts`
  - Automatically switches on primary failure
  - Uses `:online` suffix for Exa-powered web search capabilities

3. **Provider Management** (`src/lib/ai/providers/`)
  - `manager.ts` - Provider selection and failover logic
  - `health.ts` - Health monitoring and circuit breaker
  - Selection strategies: `primary-first`, `health-based`, `round-robin`, `fallback-only`

4. **Dynamic Configuration** (`src/lib/ai/dynamic-config.ts`)
  - Runtime model switching
  - Temperature, max tokens, and streaming configuration

### Chat System Architecture

Built on **Vercel AI SDK v5** with strict compliance to official patterns:

1. **API Route** (`app/api/chat/route.ts`)
  - Uses `streamText()` for streaming responses
  - Handles `UIMessage` format with parts-based content
  - Authentication guard requires valid user UUID
  - Supports message metadata (timestamp, model, tokens, userId)

2. **Chat Store** (`src/lib/database/chat-store.ts`)
  - Implements AI SDK's `saveChat()` and `loadChat()` functions
  - Transforms `UIMessage[]` to/from database format
  - Supports fallback mode for database failures
  - Server-side UUID generation for consistency

3. **Conversation History** (`src/lib/database/conversation-history.ts`)
  - Manages conversation lifecycle
  - Integrates with 24-table Supabase schema
  - Supports conversation summaries and metadata

### Academic Writing Workflow

**Approach:** LLM-native conversational guidance

The **AI Agent** assists users through natural academic paper writing phases using **system prompt instructions only** - no programmatic state tracking or backend complexity.

**Academic Phases**:

The **AI Agent** is instructed via system prompt to guide users through these phases conversationally:

```md
# Paper-Creation Workflow (High-Level, Imperative)

> Operate as a **state machine**. **Every phase requires explicit user approval** before advancing. Keep communication concise; present decisions at each gate.

**States (indicative milestones):**  
`exploring_brainstorming (0–10%) → topic_locked (10–20%) → research_foundation (20–40%) → outlining (40–55%) → outline_locked (55–65%) → drafting (65–80%) → integrating (80–90%) → polishing (90–100%) → submission_pack (100%)`

---

## 1) exploring_brainstorming
**Goal:** Clarify topic, purpose, and initial scope.  
**Do:** Conduct a focused dialogue with the user; run a quick **exploratory web_search** to surface inspirational seeds (keywords, seminal works, recent reviews, relevant datasets); present 3–5 candidate angles with 1–2-line rationales and proceed to converge on a clear focus.  
**Exit:** User approves the initial focus (**approval required**).

## 2) topic_locked
**Goal:** Lock topic, research questions, and constraints.  
**Do:** Summarize decisions; request explicit confirmation.  
**Exit:** User approves the locked topic and constraints (**approval required**).

## 3) research_foundation
**Goal:** Build a sufficient, relevant evidence base.  
**Do:** Search literature; select credible sources; align findings to questions.  
**Exit:** User approves that evidence is adequate, relevant, and balanced (**approval required**).

## 4) outlining
**Goal:** Design a logical structure aligned with questions and evidence.  
**Do:** Map sections to supporting sources; ensure flow and coverage.  
**Exit:** User approves a complete, coherent outline (**approval required**).

## 5) outline_locked
**Goal:** Freeze the outline as the writing blueprint.  
**Do:** Present outline; confirm no major changes without re-approval.  
**Exit:** User approves the locked outline (**approval required**).

## 6) drafting
**Goal:** Produce section content following the locked outline with per-section approvals.  
**Do (section-by-section loop):**
1) Draft the section concisely with source support.  
2) Present the section to the user and request a decision: **Approve** or **Request Corrections**.  
3) If **Request Corrections**: apply edits and **re-present** until approved.  
4) If **Approve**: mark the section **approved** and proceed to the next.  
- Avoid hallucinations; support non-common facts with sources.  
**Exit:** User approves **all sections** as complete (**approval required**).

## 7) integrating
**Goal:** Unify the manuscript across sections.  
**Do:** Add transitions; harmonize terminology; ensure cross-references are consistent.  
**Exit:** User approves the coherent, consistent manuscript (**approval required**).

## 8) polishing
**Goal:** Final refinement for language, citations, and format.  
**Do:** Clean prose; standardize citations; align to target style.  
**Exit:** User approves the final manuscript as ready for submission (**approval required**).

## 9) submission_pack
**Goal:** Prepare the final submission package.  
**Do:** Assemble manuscript, references, and required ancillary documents.  
**Exit:** User approves the complete submission package (**approval required**).

---

## Quality Gates & Rollback
- If evidence is insufficient → **return to research_foundation**.  
- If outline lacks alignment or coverage → **return to outlining**.  
- If any drafted section has unsupported claims → **revise within the drafting loop** or **return to research_foundation/outlining** as needed.  
- If polishing exposes major inconsistencies → **return to integrating** or **drafting**.

---

## Tool Governance (Concise)
- Activate **web_search** during **exploring_brainstorming** (exploratory inspiration) and **research_foundation** (substantive evidence); use it again during **drafting** when verifying new or uncertain facts.  
- Maintain a clear mapping between claims and supporting sources.  
- Re-seek user approval if major changes alter prior approvals.

---

## Principles
- **No phase advancement without explicit user approval.**  
- Maintain traceable support for every non-common claim.  
- Communicate briefly, propose decisions at each gate, and proceed only after confirmation.
```


**Implementation**:
- Phase guidance embedded in system prompt (database `system_prompts` table)
- LLM decides when to guide users to next phases based on conversation context
- No backend state tracking - pure conversational AI Agent
- Message metadata only tracks basics: timestamp, model, userId, tokens

### Database Layer

Uses Supabase with comprehensive schema in `supabase/migrations/`:

**Key Migrations**:
- **Role System**: 3-tier role hierarchy (superadmin, admin, user) with database functions for promote/demote and trigger proteksi superadmin
- **Auth Sync**: Triggers `public.handle_new_user` and `on_auth_user_created/on_auth_user_deleted` ensure Supabase Auth accounts sync to `public.users`/`user_profiles`
- **Health-check SQL**:
  ```sql
  SELECT COUNT(*) FILTER (WHERE is_active) AS active_users,
         COUNT(*) FILTER (WHERE NOT is_active) AS suspended_users
  FROM public.users;
  ```

**Schema Tables**:
- **User Management**: `users`, `user_profiles`, `user_sessions`, `user_preferences`
- **Chat System**: `conversations`, `chat_messages` with message parts and metadata
- **Admin & Config**: `system_prompts`, `model_configs`, `prompt_templates`, `admin_settings`

**Database Utilities**:
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
   - Values: "Mahasiswa" or "Peneliti" 
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
- Permission checks are centralized through `PermissionManager` singleton

### Frontend Architecture

- **App Structure**: Next.js App Router with route groups
  - `app/chat/` - Main chat interface
  - `app/admin/` - Admin dashboard for prompts, users, models
    - `app/admin/users/details/` - Account control page with pagination (25/50/100), filters (status/role/joinedSince), actions (suspend/activate/delete)
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

**Current Tools**:
- Native web search (OpenAI Responses API + OpenRouter :online models)

**Tool Compliance Policy**:
- **ONLY** use tools verified in `__references__/ai-sdk-tools/` and `__references__/aisdk/`
- **ONLY** use official tools provided by OpenAI or OpenRouter APIs
- **STRICTLY FORBIDDEN** to create custom tools outside these sources

## System Prompt Architecture

**Database-First Pattern with Emergency Fallback**

### Priority Hierarchy

1. **Primary Source: Database** (`system_prompts` table)
   - Location: Supabase `system_prompts` table
   - Query: `SELECT content FROM system_prompts WHERE is_active = true ORDER BY priority_order LIMIT 1`
   - Editable via: Admin Dashboard → Database Prompts → Add/Edit Prompt
   - Character Limit: 15,000 characters (enforced by database constraint)

2. **Fallback Source: Code Constants** (Emergency Mode)
   - Location: `src/lib/ai/dynamic-config.ts:43-73` (generateEmergencyFallback)
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

- **Chat Route**: `app/api/chat/route.ts:98-101`
  ```typescript
  const dynamicConfig = await getDynamicModelConfig(userId);
  const systemPrompt = dynamicConfig.systemPrompt?.trim() || '';
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

### Cache Strategy

- **TTL**: 30 seconds (CONFIG_CACHE in `dynamic-config.ts:17-21`)
- **Clear Trigger**: After admin saves new prompt (calls `clearDynamicConfigCache()`)
- **Rationale**: Balance between performance and fresh updates

### System Prompt Update Workflow

**Source File**: `__references__/system_instruction/openai_prompt.md`

**Workflow**:
1. **Edit reference file** (NOT database directly)
2. **Notify supervisor** (erik.supit@gmail.com) with changes summary
3. **Wait for approval** - supervisor uploads via Admin Dashboard → Database Prompts

**Important**: File is version-controlled. Supervisor approval required before production deployment.

## Third-Party AI SDK Tools

This project uses enhanced AI SDK tools from [midday.ai/ai-sdk-tools](https://github.com/midday-ai/ai-sdk-tools) for performance and advanced features:

### Installed Packages

1. **@ai-sdk-tools/store** (v0.7.0-beta.9)
   - Drop-in replacement for `@ai-sdk/react` with 3-5x performance improvement
   - Eliminates prop drilling with global state management
   - O(1) message lookups via hash map indexing
   - Batched updates to minimize re-renders

2. **@ai-sdk-tools/artifacts** (v0.7.0-beta.5)
   - Type-safe streaming for structured data beyond chat
   - Create dashboards, analytics, documents with real-time updates
   - Zod schema validation for artifact payloads
   - **Status**: Package installed, implementation pending

3. **@ai-sdk-tools/devtools** (v0.6.1)
   - Development-only debugging tool for AI applications
   - Real-time event monitoring (tool calls, streaming, errors)
   - Performance metrics (tokens/sec, streaming speed)

4. **@ai-sdk-tools/cache** (v0.3.0)
   - Universal caching for AI responses
   - LRU and Redis backend support
   - Reduces API costs and latency

### Reference Documentation

**AI SDK v5**: `__references__/aisdk/content/` - Always consult before making architectural decisions

**Third-party tools**: `__references__/ai-sdk-tools/packages/*/README.md` - Package-specific usage patterns

### Migration Notes

- **Beta Versions**: Using 0.7.0-beta.x for AI SDK v5 support (stable versions depend on v4)
- **Zustand Dependency**: `@ai-sdk-tools/store` requires `zustand@^5.0.8`

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
User 1:     tokayakuwi@gmail.com / M4k4l4h2025
User 2:     posteriot@gmail.com / M4k4l4h2025
```

## Key Architectural Decisions

### LLM-Native Philosophy

This codebase follows a **"trust the LLM"** approach:

- ✅ Use rich system prompts (managed via admin UI)
- ✅ Let LLM guide workflows conversationally
- ✅ Trust LLM for inline quality assessment and citations
- ❌ Avoid rigid state machines for workflow control
- ❌ Avoid programmatic quality metrics when LLM can assess
- ❌ Avoid template versioning when adaptive prompts work better

### Type Checking Strategy

`tsconfig.app.json` excludes certain directories from type checking:
- API routes (`app/api/**`)
- Chat routes (`app/chat/**`)
- Tests (`tests/`, `src/__tests__/`, `**/*.test.*`)
- Database utilities (`src/lib/database/**`)
- Error handling (`src/lib/error-handling/**`)

**Known Issue**: Some files use `as any` type assertions to bypass Supabase PostgREST type inference errors.

## Common Workflows

### Running Tests
1. Unit/Integration: `npx jest --coverage`
2. E2E: Primary tool is **MCP Chrome DevTools** (`mcp__chrome-devtools__*`), fallback: `npx playwright test`
3. Type check before commit: `npm run type-check`

### Working with Database
- Migrations are in `supabase/migrations/`
- Use Supabase admin client for privileged operations
- Fallback mode activates automatically on database failures
- **MCP Supabase available**: Use MCP tools (`mcp__supabase__*`) for direct database operations (list tables, execute SQL, apply migrations, get logs, advisors)

### Modifying System Prompts
- Use Admin Dashboard → Database Prompts
- Changes propagate via cache refresh (see System Prompt Architecture → Cache Strategy)

## Important Notes

- **Authentication**: All chat operations require valid user UUID (no anonymous access)
- **Message Format**: Uses AI SDK v5 UIMessage with `parts` array structure
- **Streaming**: Configured for 30-second max duration in API routes
- **Webpack**: Custom config for AI SDK ES modules and cache optimization
- **Browser Polyfills**: Buffer, stream, and util polyfills for client-side compatibility

## Behavioral Guidelines

### Core Principles

1. **Work only on explicit instructions** - Execute tasks only when supervisor explicitly requests them
2. **Confirm before action** - Obtain supervisor approval before making any changes to codebase
3. **Verify before agreeing** - Validate all assumptions and claims through evidence before confirming to supervisor
4. **Ask questions proactively** - Seek clarification even when context seems obvious
5. **Admit knowledge gaps** - State "I don't know" when lacking guaranteed solution rather than speculating

### Communication Standards

1. **Present facts with evidence** - Support all claims with verifiable proof from codebase, tests, or execution results
2. **Provide single clear recommendation** - Present one definite solution instead of multiple options
3. **Show work transparently** - Display full reasoning process, evidence, and validation steps
4. **Use objective language** - Describe supervisor requests factually without emotional attribution
5. **Wait for explicit requests** - Respond to supervisor's questions without offering unsolicited suggestions

### Problem-Solving Requirements

1. **Test until proven working** - Verify solutions through repeated testing with documented proof
2. **Show proof to supervisor** - Provide concrete evidence (test output, execution logs, screenshots) demonstrating success
3. **Complete all validation steps** - Execute full testing cycle before claiming task completion
4. **Check comprehensively** - Verify all affected systems, dependencies, and edge cases
5. **Document verification process** - Record all testing steps and results for supervisor review

### Engineering Discipline

1. **Maintain simplicity** - Implement straightforward solutions without unnecessary complexity
2. **Follow instructions precisely** - Execute exactly what supervisor requests without additions
3. **Complete processes fully** - Finish all steps in workflows without skipping or abbreviating
4. **Take adequate time** - Prioritize thoroughness over speed in investigation and implementation
5. **Validate independently** - Confirm assumptions through direct evidence rather than inference
