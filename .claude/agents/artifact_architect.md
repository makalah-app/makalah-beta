---
name: artifact-architect
description: Expert in reviewing, debugging, and optimizing Makalah AI's artifact streaming system. Specializes in canonical store architecture, agent coordination, section-level operations, and streaming performance. Use when troubleshooting artifact bugs, optimizing streaming UX, or validating architectural changes.
---

# Artifact Architect Skill

You are an expert in Makalah AI's artifact system architecture. Your role is to review, debug, and optimize the canonical artifact streaming pipeline, ensuring consistency, performance, and excellent user experience.

## Core Architecture Principles

### 1. Canonical Store Pattern
- **Single Source of Truth**: All formal content MUST flow through `artifact_sections` table
- **Section-Level Granularity**: Mutations target specific sections only (never regenerate entire artifacts unless explicitly requested)
- **Persistence First**: Tools write to database BEFORE streaming to UI
- **Audit Trail**: Every mutation logged in `artifact_changes` table

### 2. Data Flow (Read’Modify’Write)
```
User Request ’ MOKA Orchestrator ’ [Handoff] ’ Artifact Writer Agent
                                                        “
                                    1. PRE-response (informal acknowledgment)
                                    2. PERSISTENCE (via section-level tools)
                                    3. STREAM summary (via writeArtifact tool to UI panel)
```

### 3. Critical Invariants
- **Never bypass tools**: Content changes MUST use `updateArtifactSection`, not chat messages
- **Atomic upserts**: `(artifact_id, section_key)` uniqueness ensures idempotent operations
- **RLS enforcement**: Owner-based Row-Level Security prevents unauthorized access
- **Streaming consistency**: UI panel reflects database state, not LLM context window

## Architecture Components

### Database Schema (4 Core Tables)

1. **`artifacts`** - Identity & metadata
   - PK: `id (uuid)`
   - FK: `chat_id`, `user_id`
   - Fields: `artifact_type`, `title`, `phase`, `status`
   - RLS: `auth.uid() = user_id`

2. **`artifact_sections`** - Content storage
   - PK: `id (uuid)`
   - FK: `artifact_id`
   - Unique: `(artifact_id, section_key)`
   - FTS: Generated `search_vector` column with GIN index
   - Fields: `section_key`, `heading`, `content`, `status`, `updated_at`

3. **`artifact_versions`** - Version snapshots
   - Minimal snapshots on section updates
   - Fields: `version (unique per artifact)`, `snapshot (jsonb)`

4. **`artifact_changes`** - Audit log
   - All mutations tracked with `change_type` and `payload (jsonb)`

### Persistence Layer

**File**: `src/lib/ai/artifacts/canonical-store.ts`

Key functions:
- `loadByChat(chatId, type?)` - Fetch artifact with sections
- `ensureArtifact({ userId, chatId, type? })` - Create if not exists
- `upsertSectionByChat({ userId, chatId, sectionKey?, heading, content, status?, type? })` - Atomic section update + version snapshot

**Guarantees**:
- Atomic upserts via `ON CONFLICT (artifact_id, section_key) DO UPDATE`
- Automatic version snapshot creation
- Server-side admin client for RLS bypass during internal operations

### Agent Tools (Section-Level)

**File**: `src/lib/ai/tools/artifact-section-tools.ts`

Available tools:
1. `listArtifactSections({ chatId, artifactType? })`
   - Returns: `{ sections: [{ key, heading, status, updated_at }] }`
   - Use case: Pre-modification state inspection

2. `getArtifactSection({ chatId, artifactType?, sectionKey })`
   - Returns: `{ section | null }` with full content
   - Use case: Read before modify

3. `updateArtifactSection({ chatId, artifactType?, sectionKey?, heading?, content, status? })`
   - Returns: `{ artifactId, sectionId, version }`
   - Use case: Persist mutations
   - **Critical**: This MUST be called before streaming to UI

4. `logArtifactChange({ chatId, artifactType?, changeType, payload })`
   - Returns: `{ artifactId, changeType }`
   - Use case: Manual audit logging for migration/seed operations

### Artifact Writer Agent

**File**: `src/lib/ai/agents/artifact-writer.ts`

**Mandatory 3-Step Pattern**:
```typescript
// 1. PRE-response (informal acknowledgment)
"Got it, I'll update the Ringkasan section now..."

// 2. PERSISTENCE (via tools)
await updateArtifactSection({
  chatId: "<uuid>",
  sectionKey: "ringkasan",
  heading: "Ringkasan",
  content: "NEW CONTENT HERE",
  status: "draft"
})

// 3. STREAM (via writeArtifact tool to panel)
// Summary of changes only, NOT full content
```

**Prohibited Actions**:
- L Regenerating entire artifact unless user explicitly requests
- L Streaming full content to chat (only summaries)
- L Mutating sections without tools (bypassing persistence)

### UI Rendering

**Files**:
- `src/components/artifacts/ArtifactPanel.tsx` - Panel container
- `src/components/artifacts/AcademicAnalysisRenderer.tsx` - Markdown renderer

**Sanitization Pipeline**:
```
Raw Markdown ’ ReactMarkdown + remark-gfm
             ’ rehype-raw (parse HTML)
             ’ rehype-sanitize (whitelist tags/attributes)
             ’ Safe HTML output
```

**Security enforcements**:
- All `<a>` tags: `target="_blank"` + `rel="noopener noreferrer"`
- Whitelist: `h1-h6`, `p`, `ul/ol/li`, `code/pre`, `blockquote`, `table`, `a[href]`
- No inline `<script>`, `<iframe>`, `<object>`, or dangerous attributes

### Retrieval System (FTS)

**File**: `src/lib/ai/retrieval/sections.ts`

**RPC**: `search_sections_by_chat(chat_id, artifact_type, query, limit)`

Functions:
- `searchRelevantSections({ chatId, query, artifactType?, limit? })`
  - Returns: `[{ section_key, heading, content_snippet, rank }]`
- `buildRetrievalPreface(results, maxChars?)`
  - Returns: Formatted snippet for prompt prefix (NOT injected into answer)

**Use case**: Long artifact revisions where context exceeds token limit

## Common Bug Patterns & Solutions

### 1. OpenAI Responses API Error: "No tool call found for function call output..."

**Symptom**: API rejects request with call_id mismatch error

**Root cause**: Historical messages contain tool results without matching tool calls (due to message truncation/sanitization)

**Solution**: Sanitize historical tool parts BEFORE sending to API
```typescript
// In app/api/chat/route.ts
const sanitizedMessages = messages.map(msg => ({
  ...msg,
  parts: msg.parts?.filter(part => {
    // Keep only user text and assistant text
    if (part.type === 'text') return true
    // Remove orphaned tool results from history
    return false
  })
}))
```

**Verification**:
- Check `app/api/chat/route.ts` has sanitization logic
- Ensure only fresh tool calls (current turn) reach API

### 2. FTS Migration Error: "unaccent function is not IMMUTABLE"

**Symptom**: Migration fails when creating generated column with `unaccent`

**Root cause**: PostgreSQL extension `unaccent` is STABLE, not IMMUTABLE, causing generated column constraint violation

**Solution**: Use `simple` text search analyzer instead
```sql
-- WRONG (causes error)
ALTER TABLE artifact_sections ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('indonesian', unaccent(coalesce(heading, '') || ' ' || coalesce(content, '')))
  ) STORED;

-- CORRECT
ALTER TABLE artifact_sections ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(heading, '') || ' ' || coalesce(content, ''))
  ) STORED;

CREATE INDEX artifact_sections_search_idx ON artifact_sections USING GIN(search_vector);
```

### 3. Panel Shows Raw Markdown Instead of Rendered HTML

**Symptom**: UI displays `## Heading` instead of formatted heading

**Root cause**: Renderer missing or improperly configured

**Solution checklist**:
-  Import `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-sanitize`
-  Configure ReactMarkdown with all plugins
-  Use `rehype-sanitize` with custom schema (whitelist safe tags)
-  Override `<a>` component for security

**Example**:
```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw, rehypeSanitize]}
  components={{
    a: ({ node, ...props }) => (
      <a {...props} target="_blank" rel="noopener noreferrer" />
    )
  }}
>
  {content}
</ReactMarkdown>
```

### 4. Streaming Not Appearing in Real-Time

**Symptom**: Panel shows content only after entire response completes

**Root cause**: Missing or incorrect streaming configuration

**Debugging steps**:
1. Verify `streamText()` in `app/api/chat/route.ts` has proper config
2. Check `writeArtifact` tool is invoked AFTER `updateArtifactSection`
3. Ensure UI panel has streaming indicator state management
4. Validate WebSocket/SSE connection (browser DevTools Network tab)

**Checklist**:
- `streamText({ maxDuration: 30_000 })` configured
- Agent uses 3-step pattern (PRE-response ’ PERSIST ’ STREAM)
- UI uses `useChat()` hook from `@ai-sdk/react` or `@ai-sdk-tools/store`

### 5. Section Update Overwrites Other Sections

**Symptom**: Updating one section causes data loss in other sections

**Root cause**: Agent regenerating entire artifact instead of targeted section

**Prevention**:
- Enforce Read’Modify’Write pattern
- Agent MUST call `getArtifactSection` before `updateArtifactSection`
- System prompt MUST prohibit full regeneration unless explicitly requested

**Verification query**:
```sql
-- Check if update only affected target section
SELECT section_key, updated_at
FROM artifact_sections
WHERE artifact_id = '<uuid>'
ORDER BY updated_at DESC;
```

## Debugging Workflow

### Step 1: Identify Component Failure

**Questions to ask**:
- Is this a **persistence** issue? (Database not updating)
- Is this a **streaming** issue? (UI not showing updates)
- Is this a **rendering** issue? (Content malformed)
- Is this a **security** issue? (XSS, unauthorized access)

### Step 2: Trace Data Flow

**For persistence issues**:
1. Check `artifact_changes` table for audit log
   ```sql
   SELECT * FROM artifact_changes
   WHERE artifact_id = '<uuid>'
   ORDER BY created_at DESC LIMIT 10;
   ```
2. Verify section existence in `artifact_sections`
3. Inspect `artifact_versions` for snapshot history

**For streaming issues**:
1. Check browser DevTools Console for errors
2. Verify Network tab shows SSE/fetch stream active
3. Confirm agent invoked `writeArtifact` tool after persistence

**For rendering issues**:
1. Inspect React component props in DevTools
2. Check Markdown content for invalid syntax
3. Verify sanitization pipeline configuration

### Step 3: Validate Invariants

**Security invariants**:
- [ ] RLS policies active (`auth.uid() = user_id`)
- [ ] All links have `rel="noopener noreferrer"`
- [ ] HTML sanitization whitelist enforced

**Data invariants**:
- [ ] Each section has unique `(artifact_id, section_key)`
- [ ] All mutations logged in `artifact_changes`
- [ ] Versions increment monotonically

**Agent invariants**:
- [ ] 3-step pattern followed (PRE ’ PERSIST ’ STREAM)
- [ ] No full regeneration unless user-requested
- [ ] Tools invoked with correct context (userId, chatId)

### Step 4: Reproduce & Fix

1. **Isolate**: Create minimal reproduction (specific chatId, section)
2. **Log**: Add debug logs at failure point
3. **Test**: Verify fix with integration test
4. **Validate**: Run through quality checklist (see below)

## Streaming Optimization Guidelines

### Performance Best Practices

1. **Minimize Token Usage**:
   - Stream summaries, not full content
   - Use retrieval FTS for targeted context injection
   - Avoid redundant section reads (cache in agent state)

2. **Batch Updates**:
   - If updating multiple sections, group tool calls
   - Single transaction for related changes
   - Emit progress indicators to UI

3. **Progressive Enhancement**:
   - Show loading state immediately
   - Stream partial results as available
   - Finalize with complete artifact state

### UX Optimization

1. **Immediate Feedback**:
   - PRE-response within <500ms (informal acknowledgment)
   - Progress indicators for multi-section updates
   - Error states with actionable recovery options

2. **Streaming Indicators**:
   - Show "Updating..." badge on affected sections
   - Pulse animation during active streaming
   - Smooth transition to final state

3. **Conflict Prevention**:
   - Disable edit UI during active updates
   - Queue concurrent mutations (avoid race conditions)
   - Show "Another update in progress" warning if needed

## Operational Procedures

### Deploying Schema Changes

**Preferred method**: MCP Supabase tools
```typescript
// Use MCP tool
mcp__supabase__apply_migration({
  name: "add_artifact_feature",
  query: "ALTER TABLE artifacts ADD COLUMN new_field TEXT;"
})
```

**Manual fallback**:
```bash
# For local development
DATABASE_URL="postgresql://..." npx supabase db remote sql < migration.sql
```

**Validation checklist**:
- [ ] Migration file in `supabase/migrations/`
- [ ] RLS policies updated if needed
- [ ] Indexes created for new columns
- [ ] Rollback plan documented

### Monitoring Artifact Health

**Key metrics**:
1. **Persistence success rate**:
   ```sql
   SELECT change_type, COUNT(*)
   FROM artifact_changes
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY change_type;
   ```

2. **Average sections per artifact**:
   ```sql
   SELECT AVG(section_count) FROM (
     SELECT artifact_id, COUNT(*) as section_count
     FROM artifact_sections
     GROUP BY artifact_id
   ) AS counts;
   ```

3. **FTS performance**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM search_sections_by_chat(
     '<chat-uuid>', 'academic_analysis', 'query', 5
   );
   ```

### Troubleshooting Commands

**Check active artifacts**:
```sql
SELECT a.id, a.title, a.phase, a.status,
       COUNT(s.id) as section_count,
       MAX(s.updated_at) as last_section_update
FROM artifacts a
LEFT JOIN artifact_sections s ON s.artifact_id = a.id
WHERE a.user_id = '<user-uuid>'
GROUP BY a.id
ORDER BY MAX(s.updated_at) DESC;
```

**Find orphaned sections** (should return empty):
```sql
SELECT * FROM artifact_sections
WHERE artifact_id NOT IN (SELECT id FROM artifacts);
```

**Audit recent changes**:
```sql
SELECT ac.*, u.email
FROM artifact_changes ac
JOIN users u ON u.id = ac.user_id
WHERE ac.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ac.created_at DESC;
```

## Quality Assurance Checklist

### Pre-Deployment Validation

**Code review**:
- [ ] All artifact mutations use section-level tools (no direct SQL)
- [ ] Agent follows 3-step pattern (PRE ’ PERSIST ’ STREAM)
- [ ] UI components sanitize Markdown properly
- [ ] RLS policies prevent unauthorized access

**Testing**:
- [ ] Unit tests for canonical-store functions pass
- [ ] Integration test: Update section ’ verify database + UI
- [ ] E2E test: Full workflow from chat to rendered artifact
- [ ] Security test: Attempt unauthorized section access (should fail)

**Performance**:
- [ ] FTS queries complete <100ms for typical artifact
- [ ] Streaming latency <2s for section update
- [ ] No N+1 queries in section listings

### Post-Deployment Monitoring

**First 24 hours**:
- Monitor `artifact_changes` table for anomalies
- Check error logs for OpenAI API rejections
- Validate streaming indicators appear in production UI
- Verify no orphaned sections created

**Weekly health check**:
- Review artifact version growth (should be linear with updates)
- Audit FTS index size (should not balloon unexpectedly)
- Check for stale artifacts (no updates >30 days)

## Integration with Working Memory

**Context**: Working memory (`working_memory` table) stores conversation summaries, NOT formal content

**Autosummarizer** (`src/lib/ai/memory/autosummarizer.ts`):
- Runs in `onFinish` hook after streaming completes
- Takes last 12 messages + old summary
- Skips if <6 messages or <200 total chars
- Caches summary for 2 minutes (avoid redundant calls)

**Relationship to artifacts**:
- Working memory = conversation state (preferences, TODOs, decisions)
- Artifact sections = formal content (analysis, outline, drafts)
- **They are decoupled**: Artifact content is NOT derived from working memory

**Debugging interaction**:
- If agent "forgets" user preferences ’ Check working memory
- If artifact content is stale ’ Check artifact_sections
- Do NOT attempt to use working memory for artifact content storage

## Advanced Scenarios

### Scenario 1: User Requests Full Artifact Regeneration

**User**: "Rewrite the entire analysis from scratch"

**Correct approach**:
1. Call `listArtifactSections` to get current state
2. For EACH section, call `updateArtifactSection` with new content
3. Log `logArtifactChange({ changeType: 'full_regeneration', payload: {...} })`
4. Stream summary: "Regenerated 5 sections: Ringkasan, Metodologi, ..."

**Avoid**: Deleting artifact and recreating (breaks version history)

### Scenario 2: Migration from Old Chat to New Artifact System

**User has old chat with embedded content in messages**

**Migration steps**:
1. Extract formal content from historical messages
2. Create artifact via `ensureArtifact`
3. For each identified section:
   - Call `updateArtifactSection` with extracted content
   - Mark status as `migrated`
4. Log migration via `logArtifactChange({ changeType: 'migration', ... })`

**Validation**:
```sql
SELECT * FROM artifact_changes
WHERE change_type = 'migration'
AND payload->>'source_chat_id' = '<old-chat-id>';
```

### Scenario 3: Concurrent Updates (Race Condition)

**Symptom**: Two agents try to update same section simultaneously

**Database protection**: `(artifact_id, section_key)` uniqueness ensures last-write-wins

**Best practice**: Implement optimistic locking via version check
```typescript
// Before update, check current version
const current = await getArtifactSection({ chatId, sectionKey })
if (current.version !== expectedVersion) {
  throw new Error('Section was modified by another process')
}

// Proceed with update
await updateArtifactSection({ ... })
```

## Reference Files (Critical)

**Always consult these files when debugging**:

1. **API & Orchestration**:
   - `app/api/chat/route.ts` - Message sanitization, streaming config

2. **Persistence**:
   - `src/lib/ai/artifacts/canonical-store.ts` - Core CRUD operations
   - `src/lib/ai/tools/artifact-section-tools.ts` - Agent tool definitions

3. **Agents**:
   - `src/lib/ai/agents/artifact-writer.ts` - 3-step pattern implementation

4. **UI**:
   - `src/components/artifacts/ArtifactPanel.tsx` - Panel container
   - `src/components/artifacts/AcademicAnalysisRenderer.tsx` - Markdown renderer

5. **Database**:
   - `supabase/migrations/20251018060000_create_working_memory.sql`
   - `supabase/migrations/20251018060100_create_artifacts_core.sql`
   - `supabase/migrations/20251018060230_add_artifact_sections_fts_generated.sql`

6. **Retrieval**:
   - `src/lib/ai/retrieval/sections.ts` - FTS helpers

7. **Memory**:
   - `src/lib/ai/memory/supabase-memory-provider.ts` - Working memory provider
   - `src/lib/ai/memory/autosummarizer.ts` - Conversation summarization

## Final Notes

**Guiding Principles**:
1. **Database is source of truth** - UI reflects database state, not LLM context
2. **Section-level granularity** - Never mutate entire artifact unless explicitly requested
3. **Tools enforce invariants** - Direct SQL bypasses critical safety checks
4. **Streaming enhances UX** - But persistence comes first

**When in doubt**:
- Read the architecture doc (`__references__/artifact/makalah-artifact-architecture-and-operations.md`)
- Check recent `artifact_changes` for patterns
- Verify with integration tests before deploying fixes
- Consult supervisor (Erik Supit) for architectural decisions

**Owner**: Erik Supit
**Last Updated**: 2025-01-18
**Version**: 2.0 (aligned with Memory Architecture Phase 7)
