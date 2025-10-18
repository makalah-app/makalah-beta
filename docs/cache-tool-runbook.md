## Cache Tool Runbook

This runbook describes how to operate, monitor, and troubleshoot the new cache layer built on top of `@ai-sdk-tools/cache`. It complements the implementation tracked in `__references__/cache_tool/cache-tool-implementation-plan.md` and must remain compliant with the global policy (`__references__/global_policy.xml`) and AISDK specifications.

---

### 1. Usage Guidelines

- **Import helper**  
  Use `cachedTool` from `@/lib/ai/cache` when wiring AI SDK tools. Example:
  ```ts
  import { tool } from 'ai';
  import { cachedTool } from '@/lib/ai/cache';

  const expensiveTool = cachedTool(tool({ /* ... */ }), {
    scope: 'smart-title', // smart-title | artifact | search | default
    metricsId: 'tool.smart-title',
  });
  ```
- **Backend selection**  
  Production/staging automatically use Upstash Redis through `RedisManager`. Local development falls back to an in-memory `MemoryCacheStore` limited to 500 entries.
- **TTL conventions**
  - `smart-title`: 6 hours
  - `artifact`: 24 hours (aligned with session TTL)
  - `search`: 10 minutes
  - default: 5 minutes  
  Override via the `ttl` option only when necessary, keeping retention under 24h unless explicitly authorised.
- **Key generation**  
  Default key generator prefixes hashes with the selected scope (`scope:hash`). Custom `keyGenerator` functions should include user or chat identifiers to prevent accidental data leaks.
- **Streaming tools**  
  Caching honours AISDK streaming semantics. When a cache hit occurs, cached chunks are replayed through the `writer` so the UI receives identical artefact events.

---

### 2. Operational Commands

| Task | Command / Action |
|------|------------------|
| Run targeted tests | `npx jest src/__tests__/cache-helper.test.ts --runInBand` |
| Flush entire cache (Redis) | `node scripts/mcp-with-crypto.mjs cache:flush --prefix makalah:tool:` |
| Inspect performance metrics | Use `performanceMonitorManager.getRealTimeMetrics()` inside a temporary script or via admin dashboard once exposed |
| Clear a specific key | `cacheInvalidationManager.invalidatePattern('makalah:tool:artifact:*')` (via Node REPL or scripted task) |
| Toggle debug logging | Set `DEBUG_CACHE=1` in `.env.local` (honoured by helper when present) |

---

### 3. Troubleshooting

| Symptom | Checks | Resolution |
|---------|--------|------------|
| Stale smart titles after conversation rename | Confirm `cacheInvalidationManager` hook fired; verify `smart-title` TTL (6h). | Manually clear key via invalidation command; ensure rename workflow forwards updated prompts. |
| Artefact replay missing chunks | Confirm `writeArtifactTool` still receives `writer` context (watch server logs). | Restart worker; if context missing, reseat artifact agent context (`setContext`) before invoking tool. |
| Redis unavailable / health check failing | Inspect `redisManager.performHealthCheck()` result; verify Upstash credentials. | App auto-falls back to memory store. Restore credentials and restart to regain global cache. |
| Cache hit rate unexpectedly low | Review performance dashboard metrics (`tool.smart-title`, `tool.write-artifact`). | Adjust TTL or `shouldCache` predicate; audit key generator input for overly granular parameters. |
| Excess memory usage in dev | Memory store limited to 500 entries; flush with `cachedTool` API `clearCache()` during dev iterations. | Increase `MEMORY_MAX_SIZE` constant temporarily if needed, but reset before commit. |

---

### 4. Rollout Checklist

1. ✅ Ensure `.env` contains valid OpenAI/OpenRouter/Upstash credentials.  
2. ✅ Run `npx jest src/__tests__/cache-helper.test.ts --runInBand`.  
3. ✅ Deploy with `npm run build` to confirm type-check and lint pass.  
4. ✅ Verify metrics ingestion by checking `tool.smart-title` hit/miss counters post-deploy.  
5. ✅ Communicate manual QA scenarios (duplicate artefact, repeated title generation, TTL expiry) to ops team.  
6. ✅ Prepare rollback plan: set `CACHE_BACKEND=memory` env flag (if introduced) or disable cached helper via feature flag (see below).  

*Feature flag note:* toggling `process.env.CACHE_DISABLED` (read inside `cachedTool`) can force direct tool execution if emergency bypass is required.

---

### 5. Troubleshooting & Support Escalation

- **Primary owners:** AI Platform squad (Erik Supit as sponsor).  
- **Escalation contacts:**  
  1. Platform engineering (Redis/infra)  
  2. AI agents team (tool behaviour)  
  3. Compliance (if cache retention needs legal review)
- **Incident playbook:**  
  1. Capture `performanceMonitorManager.generateReport('1h')`.  
  2. Flush affected prefixes.  
  3. Notify stakeholders via Slack `#makalah-ai-platform`.  
  4. Document findings in the ops journal.

---

### 6. Stakeholder Review Schedule

- **Pre-merge demo:** Share cached behaviour walkthrough with Erik Supit and the research tooling guild.  
- **Post-deploy checkpoint:** 24 hours after release, review cache hit rates and Redis health; confirm no privacy escalations.  
- **Quarterly audit:** Reconcile TTL policies with `global_policy.xml` and update if retention requirements change.

---

Keep this runbook in sync with future tooling updates. Any deviation from AISDK compliance or the global policy must be approved before rollout.
