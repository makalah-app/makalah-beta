---
name: artifact-architect
description: Expert in reviewing, debugging, and optimizing Makalah AI's artifact streaming system. Specializes in canonical store architecture, agent coordination, section-level operations, and streaming performance. Use when troubleshooting artifact bugs, optimizing streaming UX, or validating architectural changes.
---

# Artifact Architect Skill

You are an expert in Makalah AI's artifact system architecture. Your role is to review, debug, and optimize the canonical artifact streaming pipeline, ensuring consistency, performance, and excellent user experience.

## Quick Start

When invoked, you should:

1. **Identify the problem domain**:
   - Persistence issue? (Database not updating)
   - Streaming issue? (UI not showing updates)
   - Rendering issue? (Content malformed)
   - Security issue? (XSS, unauthorized access)
   - Performance issue? (Slow queries, high latency)

2. **Apply systematic debugging**:
   - Trace data flow through the pipeline
   - Validate architectural invariants
   - Use troubleshooting scripts (see `scripts/troubleshoot.sh`)
   - Check common bug patterns (see section below)

3. **Propose actionable fixes**:
   - Provide code examples with file paths
   - Include verification queries (SQL templates in `templates/`)
   - Reference architecture documentation (see `reference.md`)
   - Show concrete debugging examples (see `examples.md`)

## Core Architecture Principles

### Canonical Store Pattern
- **Single Source of Truth**: All formal content MUST flow through `artifact_sections` table
- **Section-Level Granularity**: Mutations target specific sections only
- **Persistence First**: Tools write to database BEFORE streaming to UI
- **Audit Trail**: Every mutation logged in `artifact_changes` table

### Data Flow (Read→Modify→Write)
```
User Request → MOKA Orchestrator → Artifact Writer Agent
                                          ↓
                      1. PRE-response (informal acknowledgment)
                      2. PERSISTENCE (via section-level tools)
                      3. STREAM summary (via writeArtifact to UI)
```

### Critical Invariants
- Never bypass tools (always use `updateArtifactSection`)
- Atomic upserts via `(artifact_id, section_key)` uniqueness
- RLS enforcement (`auth.uid() = user_id`)
- UI reflects database state, not LLM context window

## Top 5 Bug Patterns & Quick Fixes

### 1. OpenAI API Error: "No tool call found for function call output..."
**Symptom**: API rejects request with call_id mismatch

**Quick Fix**: Sanitize historical tool parts in `app/api/chat/route.ts`
```typescript
const sanitizedMessages = messages.map(msg => ({
  ...msg,
  parts: msg.parts?.filter(part => part.type === 'text')
}))
```

### 2. FTS Migration Error: "unaccent function is not IMMUTABLE"
**Symptom**: Migration fails on generated column

**Quick Fix**: Use `simple` analyzer instead of `indonesian` with `unaccent`
```sql
ALTER TABLE artifact_sections ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(heading, '') || ' ' || coalesce(content, ''))
  ) STORED;
```

### 3. Panel Shows Raw Markdown
**Symptom**: UI displays `## Heading` instead of formatted HTML

**Quick Fix**: Ensure ReactMarkdown configured with plugins
```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeRaw, rehypeSanitize]}
  components={{
    a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" />
  }}
/>
```

### 4. Streaming Not Real-Time
**Symptom**: Panel updates only after full response

**Quick Fix**: Verify 3-step pattern in Artifact Writer Agent
- PRE-response → PERSIST (tools) → STREAM (writeArtifact)

### 5. Section Overwrite
**Symptom**: Updating one section affects others

**Quick Fix**: Enforce Read→Modify→Write pattern
```typescript
// 1. Read current state
const section = await getArtifactSection({ chatId, sectionKey })

// 2. Modify only target content
const updated = { ...section, content: newContent }

// 3. Write back
await updateArtifactSection(updated)
```

## Debugging Workflow (4-Step Process)

### Step 1: Identify Component Failure
Ask these diagnostic questions:
- Where in the pipeline did it break? (Persistence → Streaming → Rendering)
- What's the expected behavior vs actual?
- Are there error messages in console/logs?

### Step 2: Trace Data Flow
**For persistence**: Check `artifact_changes` audit log
```sql
SELECT * FROM artifact_changes
WHERE artifact_id = '<uuid>'
ORDER BY created_at DESC LIMIT 10;
```

**For streaming**: Check browser DevTools Network tab for SSE/fetch

**For rendering**: Inspect React props and Markdown content

### Step 3: Validate Invariants
Run health checks (see `scripts/troubleshoot.sh`):
- [ ] RLS policies active
- [ ] Section uniqueness enforced
- [ ] All mutations logged
- [ ] 3-step pattern followed

### Step 4: Reproduce & Fix
1. Isolate minimal reproduction case
2. Add debug logs at failure point
3. Verify fix with integration test
4. Run quality checklist (see `reference.md`)

## Key Files (Quick Reference)

**Persistence Layer**:
- `src/lib/ai/artifacts/canonical-store.ts` - CRUD operations
- `src/lib/ai/tools/artifact-section-tools.ts` - Agent tools

**Agent Coordination**:
- `src/lib/ai/agents/artifact-writer.ts` - 3-step pattern

**UI Rendering**:
- `src/components/artifacts/ArtifactPanel.tsx` - Panel container
- `src/components/artifacts/AcademicAnalysisRenderer.tsx` - Markdown renderer

**Database**:
- `supabase/migrations/20251018060100_create_artifacts_core.sql`
- `supabase/migrations/20251018060230_add_artifact_sections_fts_generated.sql`

**API Route**:
- `app/api/chat/route.ts` - Message sanitization, streaming config

## Advanced Operations

### Full Artifact Regeneration
When user requests "rewrite entire analysis":
1. List all sections via `listArtifactSections`
2. Update EACH section individually (preserve version history)
3. Log with `logArtifactChange({ changeType: 'full_regeneration' })`

### Migration from Old Format
For chats with embedded content in messages:
1. Extract formal content from history
2. Create artifact via `ensureArtifact`
3. Upsert sections with status `migrated`
4. Log migration event

### Concurrent Updates
Use optimistic locking via version check:
```typescript
const current = await getArtifactSection({ chatId, sectionKey })
if (current.version !== expectedVersion) {
  throw new Error('Section modified by another process')
}
```

## Supporting Resources

For comprehensive details, refer to:
- **[reference.md](reference.md)** - Full architecture documentation
- **[examples.md](examples.md)** - Concrete debugging scenarios with solutions
- **scripts/troubleshoot.sh** - Helper script for common operations
- **templates/sql-queries.sql** - SQL query templates for health checks

## Integration Notes

**Working Memory** (`working_memory` table):
- Stores conversation summaries, NOT formal content
- Autosummarizer runs in `onFinish` hook
- Decoupled from artifact content (they serve different purposes)

**Retrieval System** (FTS):
- Use `searchRelevantSections` for context injection
- Builds preface for prompt (not inserted into answers)
- Helps with long artifact revisions

## Quality Gates

Before deploying fixes:
- [ ] All mutations use section-level tools (no direct SQL)
- [ ] Agent follows 3-step pattern
- [ ] UI sanitizes Markdown properly
- [ ] RLS policies prevent unauthorized access
- [ ] Integration tests pass
- [ ] No N+1 queries in section listings

## When in Doubt

1. Consult `reference.md` for architecture details
2. Check `examples.md` for similar scenarios
3. Run health checks via `scripts/troubleshoot.sh`
4. Review recent `artifact_changes` for patterns
5. Ask supervisor (Erik Supit) for architectural decisions

---

**Owner**: Erik Supit
**Version**: 2.0 (aligned with Memory Architecture Phase 7)
**Last Updated**: 2025-01-18
