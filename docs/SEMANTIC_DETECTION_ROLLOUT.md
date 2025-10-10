# Semantic Detection Rollout Guide

**Document Version**: 1.0
**Created**: 2025-10-10
**Owner**: Engineering Team
**Status**: Production Deployment Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Rollout Phases](#rollout-phases)
4. [Phase 1: Shadow Mode](#phase-1-shadow-mode)
5. [Phase 2: A/B Test](#phase-2-ab-test)
6. [Phase 3: Gradual Rollout](#phase-3-gradual-rollout)
7. [Phase 4: Cleanup](#phase-4-cleanup)
8. [Monitoring & Metrics](#monitoring--metrics)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions for deploying **semantic phase detection** to production, replacing the current regex-based detection system.

**Goal**: Safely migrate from 0% → 100% semantic detection with continuous monitoring and rollback capability.

**Timeline**: 3 days (Days 12-14)

**Key Principles**:
- **Safety First**: Each phase includes monitoring before proceeding
- **Data-Driven**: Proceed based on metrics, not time
- **Rollback Ready**: Feature flags enable instant rollback
- **Zero User Impact**: Shadow mode validates accuracy without affecting users

---

## Prerequisites

### Technical Requirements

- [ ] **Knowledge Base Deployed**: `workflow_knowledge` table populated with embeddings
- [ ] **Database Migration**: pgvector extension enabled, indexes created
- [ ] **Code Deployed**: `semantic-phase-detection.ts` implemented and tested
- [ ] **Environment Access**: Vercel CLI authenticated with production access
- [ ] **Monitoring Access**: Ability to view Vercel logs in real-time

### Validation Commands

```bash
# Check knowledge base
psql $DATABASE_URL -c "SELECT COUNT(*) FROM workflow_knowledge WHERE chunk_type = 'phase_definition';"
# Expected: 11 rows (one per phase)

# Check pgvector extension
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
# Expected: 1 row

# Check indexes
psql $DATABASE_URL -c "\d workflow_knowledge"
# Expected: idx_workflow_knowledge_embedding (ivfflat index)

# Verify Vercel CLI
vercel whoami
# Expected: Your authenticated account

# Check deployment scripts
ls -lh scripts/deploy/
# Expected: rollout-semantic-detection.sh, rollback-semantic-detection.sh
```

### Team Requirements

- **On-Call Engineer**: Available for rollback if needed
- **Product Owner**: Informed of deployment schedule
- **Support Team**: Alerted to watch for user complaints

---

## Rollout Phases

| Phase | Duration | Traffic | Purpose | Success Criteria |
|-------|----------|---------|---------|------------------|
| **Phase 1: Shadow Mode** | 24 hours | 0% semantic | Validate accuracy | Accuracy ≥90% |
| **Phase 2: A/B Test** | 4 hours | 10% semantic | Monitor metrics | Error rate <5%, Latency OK |
| **Phase 3: Gradual Rollout** | 8 hours | 25% → 50% → 75% → 100% | Progressive increase | Stability at each stage |
| **Phase 4: Cleanup** | 2 weeks | 100% semantic | Observe stability | Zero incidents |

---

## Phase 1: Shadow Mode

**Objective**: Run semantic detection in parallel with regex WITHOUT using semantic results. Compare outputs to validate accuracy.

**Duration**: 24 hours
**Traffic**: 0% semantic (logging only)

### Step 1: Enable Shadow Mode

```bash
cd /Users/eriksupit/Desktop/makalah-deploy/makalahApp
./scripts/deploy/rollout-semantic-detection.sh 0 shadow
```

**What This Does**:
- Sets `SHADOW_MODE_ENABLED=true`
- Sets `ENABLE_SEMANTIC_DETECTION=true`
- Deploys to production
- System runs BOTH methods, uses regex result, logs comparison

### Step 2: Monitor for 24 Hours

**Check Logs Immediately** (verify shadow mode active):

```bash
vercel logs --follow | grep "Shadow Mode"
```

**Expected Output**:
```
[Shadow Mode] Running parallel detection...
[Shadow Mode] Comparison: { regex: 'researching', semantic: 'researching', match: true }
[Shadow Mode] Comparison: { regex: 'outlining', semantic: 'outlining', match: true }
```

**What to Watch**:
- [ ] Shadow mode logs appearing
- [ ] No errors in semantic detection
- [ ] Comparisons logged with match status
- [ ] Regex results still controlling production (no user impact)

### Step 3: Analyze Accuracy After 24 Hours

```bash
./scripts/analysis/analyze-detection-accuracy.sh
```

**Expected Output**:
```
==============================================================================
Semantic Detection Accuracy Report
==============================================================================

Results:
  Total Comparisons: 1247
  Matches (✓):       1145
  Mismatches (✗):    102
  Accuracy:          91.82%

  Target Accuracy:   ≥90%

==============================================================================
✅ PASS - Accuracy meets target (91.82% ≥ 90%)

Recommendation: Proceed to A/B test with 10% traffic

  ./scripts/deploy/rollout-semantic-detection.sh 10 ab-test
==============================================================================
```

### Step 4: Decision Tree

**If Accuracy ≥90%**:
- ✅ **PROCEED** to Phase 2 (A/B Test)

**If Accuracy 85-90%**:
- ⚠️ **PAUSE**: Review mismatches
- Extract mismatch patterns: `grep '"match":false' shadow-mode.log > mismatches.log`
- Analyze which phases have most errors
- Consider tuning `match_threshold` or updating knowledge base
- Re-run shadow mode after tuning

**If Accuracy <85%**:
- ❌ **STOP**: Semantic detection not ready
- Perform root cause analysis:
  - Are phase definitions in knowledge base correct?
  - Are embeddings generated properly?
  - Is similarity threshold too high/low?
- Fix issues, re-deploy, re-run shadow mode

---

## Phase 2: A/B Test

**Objective**: Route 10% of traffic to semantic detection, 90% to regex. Monitor metrics to ensure no degradation.

**Duration**: 4 hours minimum
**Traffic**: 10% semantic, 90% regex

### Step 1: Enable A/B Test

```bash
./scripts/deploy/rollout-semantic-detection.sh 10 ab-test
```

**What This Does**:
- Sets `AB_TEST_ENABLED=true`
- Sets `SEMANTIC_PERCENTAGE=10`
- Users deterministically assigned to cohort based on user ID hash
- Same user always gets same detection method (consistency)

### Step 2: Monitor Metrics (4 Hours)

**Key Metrics to Track**:

| Metric | Semantic Cohort (10%) | Regex Cohort (90%) | Alert Threshold |
|--------|----------------------|-------------------|-----------------|
| **Error Rate** | <5% | <1% | >5% semantic |
| **Latency p95** | <150ms | <50ms | >200ms semantic |
| **User Complaints** | 0 | 0 | >0 complaints |
| **Detection Accuracy** | ≥90% | baseline | <90% semantic |

**Monitoring Commands**:

```bash
# Watch logs in real-time
vercel logs --follow

# Filter for A/B test assignments
vercel logs --follow | grep "A/B Test"

# Check for errors
vercel logs --follow | grep -i error

# Monitor semantic failures
vercel logs --follow | grep "Semantic failed, fallback to regex"
```

**Sample Output**:
```
[A/B Test] User in SEMANTIC cohort (10%)
[Workflow] Semantic detection result: researching
[A/B Test] User in REGEX cohort (90%)
[Workflow] Using regex fallback
```

### Step 3: Calculate Metrics

**Error Rate** (manual calculation):

```bash
# Count semantic attempts
SEMANTIC_ATTEMPTS=$(vercel logs --output plain | grep "User in SEMANTIC cohort" | wc -l)

# Count semantic failures
SEMANTIC_FAILURES=$(vercel logs --output plain | grep "Semantic failed, fallback to regex" | wc -l)

# Calculate error rate
echo "scale=2; $SEMANTIC_FAILURES * 100 / $SEMANTIC_ATTEMPTS" | bc
# Target: <5%
```

**Latency** (observe in logs):

```bash
vercel logs --output plain | grep "Total detection time" | awk '{print $NF}'
# Target: <150ms for semantic
```

### Step 4: Decision Tree

**If Metrics Pass** (Error <5%, Latency <150ms, No complaints):
- ✅ **PROCEED** to Phase 3 (25% rollout)

**If Metrics Borderline** (Error 5-10%, Latency 150-200ms):
- ⚠️ **PAUSE**: Monitor for 2 more hours
- Investigate elevated error rate
- Check if specific phases causing issues
- Consider staying at 10% longer

**If Metrics Fail** (Error >10%, Latency >200ms, Complaints):
- ❌ **ROLLBACK** immediately:
  ```bash
  ./scripts/deploy/rollback-semantic-detection.sh "High error rate in A/B test"
  ```

---

## Phase 3: Gradual Rollout

**Objective**: Progressively increase semantic traffic while monitoring stability.

**Duration**: 8 hours (2 hours per stage)
**Traffic**: 25% → 50% → 75% → 100%

### Rollout Schedule

| Time | Percentage | Duration | Monitoring Focus | Rollback Target |
|------|-----------|----------|------------------|-----------------|
| 09:00 | 25% | 2 hours | Error rate, latency | Rollback to 10% |
| 11:00 | 50% | 2 hours | Database load, API quota | Rollback to 25% |
| 13:00 | 75% | 2 hours | User experience, complaints | Rollback to 50% |
| 15:00 | 100% | 4+ hours | Full production stability | Rollback to 75% |

### Step 1: Increase to 25%

```bash
./scripts/deploy/rollout-semantic-detection.sh 25 ab-test
```

**Monitor for 2 Hours**:

```bash
# Watch error rate
vercel logs --follow | grep -i error | wc -l

# Check cohort distribution
vercel logs --output plain | grep "A/B Test" | grep "SEMANTIC cohort" | wc -l
vercel logs --output plain | grep "A/B Test" | grep "REGEX cohort" | wc -l
# Expected: ~1:3 ratio (25% semantic, 75% regex)
```

**Decision**:
- ✅ Stable → Proceed to 50%
- ⚠️ Unstable → Rollback to 10%, investigate

### Step 2: Increase to 50%

```bash
./scripts/deploy/rollout-semantic-detection.sh 50 ab-test
```

**Monitor for 2 Hours**:

Focus on:
- Database connection pool usage (pgvector queries)
- OpenAI API quota (embedding API calls)
- Response time distribution

**Decision**:
- ✅ Stable → Proceed to 75%
- ⚠️ Unstable → Rollback to 25%, investigate

### Step 3: Increase to 75%

```bash
./scripts/deploy/rollout-semantic-detection.sh 75 ab-test
```

**Monitor for 2 Hours**:

Focus on:
- User complaints (check support channels)
- Edge cases (new users, specific phases)
- Overall system health

**Decision**:
- ✅ Stable → Proceed to 100%
- ⚠️ Unstable → Rollback to 50%, investigate

### Step 4: Full Rollout (100%)

```bash
./scripts/deploy/rollout-semantic-detection.sh 100 full
```

**What This Does**:
- Disables A/B testing
- Sets `ENABLE_SEMANTIC_DETECTION=true`
- 100% traffic uses semantic detection
- Regex still available as automatic fallback

**Monitor for 4 Hours Minimum**:

**Validation Checklist**:
- [ ] Error rate <5%
- [ ] Latency p95 <150ms
- [ ] Zero production incidents
- [ ] No user complaints
- [ ] Phase detection accuracy ≥90%
- [ ] Database performance stable
- [ ] OpenAI API quota not exceeded

**If All Checks Pass**:
- ✅ **SUCCESS**: Semantic detection fully deployed
- Monitor for 2 weeks before considering code cleanup

**If Any Check Fails**:
- ❌ Rollback to 75% or previous stable state
- Investigate root cause
- Fix issues before re-attempting 100%

---

## Phase 4: Cleanup

**Objective**: Observe 100% semantic stability before removing regex code.

**Duration**: 2 weeks minimum
**Traffic**: 100% semantic

### Step 1: Observation Period (2 Weeks)

**Why Wait**:
- Validate stability across diverse usage patterns
- Ensure no edge cases slip through
- Confirm fallback mechanism works
- Build confidence before removing safety net

**What to Monitor**:
- [ ] Daily error rate trending
- [ ] Weekly accuracy reports
- [ ] User feedback (no complaints)
- [ ] System performance (no degradation)

### Step 2: Consider Regex Cleanup (After 2 Weeks)

**Recommendation**: KEEP regex code as fallback indefinitely

**Rationale**:
- Automatic fallback on semantic failures (OpenAI API outage, pgvector issue)
- Minimal code maintenance burden
- Insurance against edge cases
- Enables instant rollback without code deployment

**If You Must Remove Regex** (not recommended):

1. Verify 100% semantic success rate for 2 weeks
2. Create git branch with regex code (for easy restoration)
3. Remove `regexPhaseDetection()` function from `workflow-inference.ts`
4. Remove regex patterns
5. Simplify `inferStateFromResponse()` to semantic-only
6. Deploy with extra monitoring
7. Keep rollback script updated

---

## Monitoring & Metrics

### Real-Time Monitoring

**Logs**:
```bash
# General monitoring
vercel logs --follow

# Shadow mode (Phase 1)
vercel logs --follow | grep "Shadow Mode"

# A/B test (Phase 2-3)
vercel logs --follow | grep "A/B Test"

# Errors
vercel logs --follow | grep -i error

# Detection method
vercel logs --follow | grep "detection result"
```

**Environment Variables** (check current state):
```bash
vercel env ls
```

### Key Metrics Dashboard

Create a simple monitoring checklist:

| Metric | Target | Critical Threshold | Alert Action |
|--------|--------|-------------------|--------------|
| **Accuracy** | ≥90% | <85% | Stop rollout |
| **Error Rate** | <5% | >10% | Immediate rollback |
| **Latency p95** | <150ms | >200ms | Pause rollout |
| **User Complaints** | 0 | ≥3 | Investigate |
| **API Quota** | <80% | >90% | Request increase |

### Accuracy Calculation (Shadow Mode)

```bash
./scripts/analysis/analyze-detection-accuracy.sh
```

### Error Rate Calculation (A/B Test)

```bash
# Semantic attempts
ATTEMPTS=$(vercel logs --output plain | grep "SEMANTIC cohort" | wc -l)

# Semantic failures
FAILURES=$(vercel logs --output plain | grep "Semantic failed" | wc -l)

# Error rate
echo "scale=2; $FAILURES * 100 / $ATTEMPTS" | bc
```

### Latency Analysis

```bash
# Extract detection times
vercel logs --output plain | grep "Total detection time" | \
  awk '{print $NF}' | sed 's/ms//' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'
```

---

## Rollback Procedures

### When to Rollback

**Immediate Rollback Triggers**:
- Error rate >10%
- Multiple user complaints (≥3)
- Database connection failures
- OpenAI API rate limit exceeded
- Production incident (P0)

**Planned Rollback Triggers**:
- Error rate 5-10% (not emergency, but concerning)
- Latency p95 150-200ms (degrading performance)
- Accuracy drop below target

### Emergency Rollback (Immediate)

```bash
./scripts/deploy/rollback-semantic-detection.sh "Production incident - high error rate"
```

**What This Does**:
1. Disables all semantic detection modes
2. Reverts to 100% regex detection
3. Redeploys to production immediately
4. Logs rollback event

**Verification**:
```bash
# Check logs for regex-only mode
vercel logs --follow | grep "Using regex"

# Verify environment variables
vercel env ls | grep SEMANTIC
# Expected: ENABLE_SEMANTIC_DETECTION = false
```

### Planned Rollback (Gradual)

Reduce semantic percentage step-by-step:

```bash
# From 50% → 25%
./scripts/deploy/rollout-semantic-detection.sh 25 ab-test

# From 25% → 10%
./scripts/deploy/rollout-semantic-detection.sh 10 ab-test

# From 10% → 0% (shadow mode)
./scripts/deploy/rollout-semantic-detection.sh 0 shadow
```

### Post-Rollback Actions

1. **Root Cause Analysis**:
   - Review error logs
   - Identify failure patterns
   - Check database health
   - Verify API quotas

2. **Fix Issues**:
   - Update knowledge base if accuracy issue
   - Optimize queries if latency issue
   - Request quota increase if rate limited

3. **Re-Test in Staging**:
   - Validate fixes work
   - Run shadow mode again
   - Ensure metrics meet targets

4. **Retry Rollout**:
   - Start from shadow mode
   - Follow same gradual process
   - Monitor more closely

---

## Troubleshooting

### Issue: Shadow Mode Shows 0 Comparisons

**Symptoms**: `analyze-detection-accuracy.sh` reports no shadow mode logs

**Causes**:
- Shadow mode not enabled
- No chat traffic
- Logs rotated/expired

**Solutions**:
```bash
# Check environment variables
vercel env ls | grep SHADOW_MODE
# Expected: SHADOW_MODE_ENABLED = true

# Verify deployment
vercel list

# Check if any logs exist
vercel logs --output plain | head -50

# Re-deploy shadow mode
./scripts/deploy/rollout-semantic-detection.sh 0 shadow

# Wait 1 hour for traffic, then re-analyze
```

### Issue: High Error Rate (>10%)

**Symptoms**: Semantic detection frequently failing

**Causes**:
- OpenAI API issues
- Database connection problems
- Invalid embeddings
- Knowledge base missing data

**Solutions**:
```bash
# Check OpenAI API health
curl https://status.openai.com/api/v2/status.json

# Check database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM workflow_knowledge;"

# Verify embeddings exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM workflow_knowledge WHERE embedding IS NOT NULL;"
# Expected: 26 (all chunks have embeddings)

# Check for specific error patterns
vercel logs --output plain | grep "Semantic detection error" | head -20
```

### Issue: Latency >200ms

**Symptoms**: Semantic detection slow

**Causes**:
- pgvector index not used
- Slow embedding API
- Database under load

**Solutions**:
```bash
# Check index usage
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM workflow_knowledge ORDER BY embedding <=> '[0,0,...]'::vector LIMIT 3;"
# Should show "Index Scan using idx_workflow_knowledge_embedding"

# Monitor OpenAI API latency
vercel logs --output plain | grep "Embedding generated in"

# Check database CPU/memory
# (Use your database monitoring dashboard)
```

### Issue: A/B Test Not Splitting Traffic

**Symptoms**: All users in one cohort

**Causes**:
- `AB_TEST_ENABLED` not set
- `SEMANTIC_PERCENTAGE` wrong value
- User ID not being passed

**Solutions**:
```bash
# Check environment variables
vercel env ls | grep AB_TEST
vercel env ls | grep SEMANTIC_PERCENTAGE

# Verify user IDs in logs
vercel logs --output plain | grep "userId"

# Check cohort assignments
vercel logs --output plain | grep "cohort" | tail -50
```

### Issue: Semantic Returns Wrong Phase

**Symptoms**: Accuracy below target, specific phases always wrong

**Causes**:
- Knowledge base content incorrect
- Similarity threshold too low
- Phase transitions not detected

**Solutions**:
```bash
# Review knowledge base content
psql $DATABASE_URL -c "SELECT phase, title FROM workflow_knowledge WHERE chunk_type = 'phase_definition' ORDER BY phase;"

# Check similarity scores in logs
vercel logs --output plain | grep "Top match" | grep "similarity"

# Analyze mismatch patterns
./scripts/analysis/analyze-detection-accuracy.sh

# Consider tuning threshold
# Edit workflow-inference.ts: matchThreshold: 0.70 → 0.75
```

---

## Success Criteria Summary

### Phase 1: Shadow Mode
- ✅ Accuracy ≥90%
- ✅ No semantic detection errors
- ✅ 24 hours of stable operation

### Phase 2: A/B Test (10%)
- ✅ Error rate <5%
- ✅ Latency p95 <150ms
- ✅ No user complaints
- ✅ 4 hours of stable operation

### Phase 3: Gradual Rollout
- ✅ Each stage (25%, 50%, 75%) stable for 2 hours
- ✅ No rollbacks required
- ✅ Metrics within targets at each stage

### Phase 4: Full Deployment (100%)
- ✅ Error rate <5%
- ✅ Latency p95 <150ms
- ✅ Zero production incidents
- ✅ 4 hours minimum stable operation
- ✅ Accuracy ≥90%

### Overall Rollout
- ✅ Completed without incidents
- ✅ Regex fallback tested and working
- ✅ Rollback procedures validated
- ✅ No TypeScript errors
- ✅ Git commit: `feat(workflow): complete semantic detection rollout to 100% traffic`

---

## Appendix: Command Reference

### Deployment Commands

```bash
# Shadow mode (0% semantic)
./scripts/deploy/rollout-semantic-detection.sh 0 shadow

# A/B test at 10%
./scripts/deploy/rollout-semantic-detection.sh 10 ab-test

# A/B test at 25%
./scripts/deploy/rollout-semantic-detection.sh 25 ab-test

# A/B test at 50%
./scripts/deploy/rollout-semantic-detection.sh 50 ab-test

# A/B test at 75%
./scripts/deploy/rollout-semantic-detection.sh 75 ab-test

# Full semantic (100%)
./scripts/deploy/rollout-semantic-detection.sh 100 full

# Emergency rollback
./scripts/deploy/rollback-semantic-detection.sh "Reason here"
```

### Analysis Commands

```bash
# Analyze shadow mode accuracy
./scripts/analysis/analyze-detection-accuracy.sh

# Analyze specific log file
./scripts/analysis/analyze-detection-accuracy.sh vercel-2025-10-10.log

# Calculate error rate
ATTEMPTS=$(vercel logs --output plain | grep "SEMANTIC cohort" | wc -l)
FAILURES=$(vercel logs --output plain | grep "Semantic failed" | wc -l)
echo "scale=2; $FAILURES * 100 / $ATTEMPTS" | bc
```

### Monitoring Commands

```bash
# Real-time logs
vercel logs --follow

# Shadow mode logs
vercel logs --follow | grep "Shadow Mode"

# A/B test logs
vercel logs --follow | grep "A/B Test"

# Error logs
vercel logs --follow | grep -i error

# Environment variables
vercel env ls
```

---

## Contact & Support

**On-Call Engineer**: [Contact info]
**Deployment Lead**: [Contact info]
**Rollback Authority**: [Contact info]

**Emergency Escalation**: If rollback script fails or production is down, contact on-call immediately.

---

**Document End**
