# Semantic Detection Monitoring Checklist

**Document Version**: 1.0
**Created**: 2025-10-10
**Purpose**: Quick reference for monitoring semantic detection rollout

---

## Pre-Deployment Checklist

Before starting rollout, verify:

- [ ] **Knowledge Base Deployed**
  ```bash
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM workflow_knowledge WHERE chunk_type = 'phase_definition';"
  # Expected: 11 (one per phase)
  ```

- [ ] **pgvector Extension Enabled**
  ```bash
  psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
  # Expected: 1 row
  ```

- [ ] **Indexes Created**
  ```bash
  psql $DATABASE_URL -c "\d workflow_knowledge"
  # Expected: idx_workflow_knowledge_embedding (ivfflat)
  ```

- [ ] **Embeddings Generated**
  ```bash
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM workflow_knowledge WHERE embedding IS NOT NULL;"
  # Expected: 26 (all chunks)
  ```

- [ ] **Vercel CLI Authenticated**
  ```bash
  vercel whoami
  # Expected: Your account name
  ```

- [ ] **Deployment Scripts Executable**
  ```bash
  ls -lh scripts/deploy/*.sh
  # Expected: Execute permissions (rwxr-xr-x)
  ```

- [ ] **OpenAI API Key Valid**
  ```bash
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[0].id'
  # Expected: Model ID (e.g., "text-embedding-ada-002")
  ```

- [ ] **Team Notified**
  - On-call engineer aware
  - Product owner informed
  - Support team alerted

---

## Phase 1: Shadow Mode (24 Hours)

**Deployment**:
```bash
./scripts/deploy/rollout-semantic-detection.sh 0 shadow
```

### Hour 1: Immediate Verification

- [ ] **Shadow Mode Active**
  ```bash
  vercel logs --follow | grep "Shadow Mode"
  # Expected: "[Shadow Mode] Running parallel detection..."
  ```

- [ ] **Comparisons Logged**
  ```bash
  vercel logs --output plain | grep "Shadow Mode" | head -10
  # Expected: Comparison objects with regex, semantic, match fields
  ```

- [ ] **No Errors**
  ```bash
  vercel logs --follow | grep -i error
  # Expected: No semantic detection errors
  ```

- [ ] **Regex Still Controlling**
  ```bash
  vercel logs --output plain | grep "CRITICAL: Always use regex"
  # Expected: Confirmation regex result being used
  ```

### Hour 6: Mid-Point Check

- [ ] **Sufficient Sample Size**
  ```bash
  vercel logs --output plain | grep -c "Shadow Mode"
  # Expected: >50 comparisons
  ```

- [ ] **Preliminary Accuracy**
  ```bash
  ./scripts/analysis/analyze-detection-accuracy.sh
  # Expected: Trending toward ≥90%
  ```

- [ ] **Error Rate**
  ```bash
  vercel logs --output plain | grep "Semantic detection error" | wc -l
  # Expected: <5% of total attempts
  ```

### Hour 24: Final Analysis

- [ ] **Run Full Accuracy Report**
  ```bash
  ./scripts/analysis/analyze-detection-accuracy.sh
  # Target: ≥90% accuracy
  ```

- [ ] **Review Mismatches**
  ```bash
  grep '"match":false' shadow-mode.log > mismatches.log
  wc -l mismatches.log
  # Expected: <10% of total comparisons
  ```

- [ ] **Decision: Proceed or Stop**
  - ✅ Accuracy ≥90% → Proceed to A/B Test
  - ⚠️ Accuracy 85-90% → Investigate, tune, retry
  - ❌ Accuracy <85% → Stop, root cause analysis

---

## Phase 2: A/B Test at 10% (4 Hours)

**Deployment**:
```bash
./scripts/deploy/rollout-semantic-detection.sh 10 ab-test
```

### Hour 1: Immediate Verification

- [ ] **A/B Test Active**
  ```bash
  vercel logs --follow | grep "A/B Test"
  # Expected: User cohort assignments
  ```

- [ ] **Traffic Split Correct**
  ```bash
  SEMANTIC=$(vercel logs --output plain | grep "SEMANTIC cohort" | wc -l)
  REGEX=$(vercel logs --output plain | grep "REGEX cohort" | wc -l)
  echo "Semantic %: $(echo "scale=2; $SEMANTIC * 100 / ($SEMANTIC + $REGEX)" | bc)"
  # Expected: ~10%
  ```

- [ ] **Semantic Detection Working**
  ```bash
  vercel logs --follow | grep "Semantic detection success"
  # Expected: Successful detections for semantic cohort
  ```

- [ ] **Fallback Working**
  ```bash
  vercel logs --follow | grep "fallback to regex"
  # Expected: Occasional fallbacks, not every request
  ```

### Hour 2: Metrics Check

- [ ] **Error Rate**
  ```bash
  ATTEMPTS=$(vercel logs --output plain | grep "SEMANTIC cohort" | wc -l)
  FAILURES=$(vercel logs --output plain | grep "Semantic failed" | wc -l)
  echo "Error rate: $(echo "scale=2; $FAILURES * 100 / $ATTEMPTS" | bc)%"
  # Target: <5%
  ```

- [ ] **Latency**
  ```bash
  vercel logs --output plain | grep "Total detection time" | \
    awk '{print $NF}' | sed 's/ms//' | \
    awk '{sum+=$1; count++} END {print "Avg:", sum/count, "ms"}'
  # Target: <150ms average
  ```

- [ ] **User Complaints**
  - Check support channels
  - Expected: 0 complaints

### Hour 4: Final Decision

- [ ] **All Metrics Pass**
  - Error rate <5%: ✅ / ❌
  - Latency <150ms: ✅ / ❌
  - Zero complaints: ✅ / ❌

- [ ] **Decision**
  - ✅ All pass → Proceed to 25%
  - ⚠️ Some concerns → Monitor 2 more hours
  - ❌ Metrics fail → Rollback

---

## Phase 3: Gradual Rollout (8 Hours)

### Stage 1: 25% (2 Hours)

**Deployment**:
```bash
./scripts/deploy/rollout-semantic-detection.sh 25 ab-test
```

**Checklist**:
- [ ] Traffic split ~25/75: ____%
- [ ] Error rate <5%: ____%
- [ ] Latency p95 <150ms: ____ms
- [ ] No user complaints: ✅ / ❌
- [ ] Decision: Proceed to 50% / Rollback to 10%

### Stage 2: 50% (2 Hours)

**Deployment**:
```bash
./scripts/deploy/rollout-semantic-detection.sh 50 ab-test
```

**Checklist**:
- [ ] Traffic split ~50/50: ____%
- [ ] Error rate <5%: ____%
- [ ] Latency p95 <150ms: ____ms
- [ ] Database load stable: ✅ / ❌
- [ ] OpenAI API quota <80%: ____%
- [ ] Decision: Proceed to 75% / Rollback to 25%

### Stage 3: 75% (2 Hours)

**Deployment**:
```bash
./scripts/deploy/rollout-semantic-detection.sh 75 ab-test
```

**Checklist**:
- [ ] Traffic split ~75/25: ____%
- [ ] Error rate <5%: ____%
- [ ] Latency p95 <150ms: ____ms
- [ ] No user complaints: ✅ / ❌
- [ ] System health stable: ✅ / ❌
- [ ] Decision: Proceed to 100% / Rollback to 50%

### Stage 4: 100% (4+ Hours)

**Deployment**:
```bash
./scripts/deploy/rollout-semantic-detection.sh 100 full
```

**Checklist**:
- [ ] 100% semantic traffic: ✅ / ❌
- [ ] Error rate <5%: ____%
- [ ] Latency p95 <150ms: ____ms
- [ ] Zero production incidents: ✅ / ❌
- [ ] Accuracy ≥90%: ____%
- [ ] 4 hours stable operation: ✅ / ❌
- [ ] Decision: Success / Rollback to 75%

---

## Daily Monitoring (Week 1)

For the first week after 100% rollout:

### Daily Checks (10 minutes)

- [ ] **Error Rate Trending**
  ```bash
  vercel logs --since 24h --output plain | grep "Semantic failed" | wc -l
  # Expected: Stable or decreasing
  ```

- [ ] **User Complaints**
  - Check support tickets
  - Expected: 0 semantic-related issues

- [ ] **System Health**
  ```bash
  vercel logs --since 24h --output plain | grep -i "fatal\|critical" | wc -l
  # Expected: 0 critical errors
  ```

- [ ] **Accuracy Spot Check**
  ```bash
  # Sample 50 recent detections
  vercel logs --since 1h --output plain | grep "detection result" | head -50
  # Review: Do detected phases make sense?
  ```

### Weekly Summary (Day 7)

- [ ] **Week 1 Report**
  - Total requests: _______
  - Semantic success rate: _____%
  - Average latency: ____ms
  - User complaints: _____
  - Production incidents: _____

- [ ] **Decision**
  - ✅ All metrics good → Continue 100% semantic
  - ⚠️ Some concerns → Investigate
  - ❌ Issues detected → Consider rollback

---

## Rollback Scenarios

### Immediate Rollback Triggers

Rollback **immediately** if:

- [ ] **Error rate >10%**
  ```bash
  ./scripts/deploy/rollback-semantic-detection.sh "Error rate exceeded 10%"
  ```

- [ ] **Multiple user complaints (≥3)**
  ```bash
  ./scripts/deploy/rollback-semantic-detection.sh "User complaints"
  ```

- [ ] **Database connection failures**
  ```bash
  ./scripts/deploy/rollback-semantic-detection.sh "Database failures"
  ```

- [ ] **Production incident (P0)**
  ```bash
  ./scripts/deploy/rollback-semantic-detection.sh "P0 incident"
  ```

### Gradual Rollback Triggers

Reduce traffic **gradually** if:

- [ ] **Error rate 5-10%**
  ```bash
  ./scripts/deploy/rollout-semantic-detection.sh 25 ab-test
  ```

- [ ] **Latency 150-200ms**
  ```bash
  ./scripts/deploy/rollout-semantic-detection.sh 50 ab-test
  ```

- [ ] **Accuracy drop to 85-90%**
  - Investigate root cause
  - Tune parameters
  - Consider staying at current percentage

---

## Rollback Verification

After executing rollback:

- [ ] **Regex Mode Active**
  ```bash
  vercel logs --follow | grep "Using regex"
  # Expected: All requests using regex
  ```

- [ ] **Environment Variables**
  ```bash
  vercel env ls | grep SEMANTIC
  # Expected: ENABLE_SEMANTIC_DETECTION = false
  ```

- [ ] **Error Rate Stabilized**
  ```bash
  vercel logs --since 1h --output plain | grep -i error | wc -l
  # Expected: Error rate back to baseline
  ```

- [ ] **User Experience Normal**
  - Check support channels
  - Expected: No new complaints

- [ ] **Rollback Logged**
  ```bash
  ls -lh rollback-*.log
  # Expected: Rollback log file created
  ```

---

## Alert Conditions

Set up alerts (manual or automated) for:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error rate | >10% | Immediate rollback |
| Latency p95 | >200ms | Investigate, consider rollback |
| User complaints | ≥3 | Investigate, likely rollback |
| Database CPU | >90% | Check pgvector queries |
| OpenAI API quota | >90% | Request increase |
| Semantic failures | >10/hour | Check API health |

---

## Quick Commands Reference

```bash
# === Deployment ===
./scripts/deploy/rollout-semantic-detection.sh 0 shadow    # Shadow mode
./scripts/deploy/rollout-semantic-detection.sh 10 ab-test  # 10% A/B test
./scripts/deploy/rollout-semantic-detection.sh 25 ab-test  # 25% rollout
./scripts/deploy/rollout-semantic-detection.sh 50 ab-test  # 50% rollout
./scripts/deploy/rollout-semantic-detection.sh 75 ab-test  # 75% rollout
./scripts/deploy/rollout-semantic-detection.sh 100 full    # 100% semantic

# === Rollback ===
./scripts/deploy/rollback-semantic-detection.sh "Reason"   # Emergency rollback

# === Analysis ===
./scripts/analysis/analyze-detection-accuracy.sh           # Accuracy report

# === Monitoring ===
vercel logs --follow                                       # Real-time logs
vercel logs --follow | grep "Shadow Mode"                  # Shadow mode
vercel logs --follow | grep "A/B Test"                     # A/B test
vercel logs --follow | grep -i error                       # Errors

# === Metrics ===
# Error rate
ATTEMPTS=$(vercel logs --output plain | grep "SEMANTIC cohort" | wc -l)
FAILURES=$(vercel logs --output plain | grep "Semantic failed" | wc -l)
echo "scale=2; $FAILURES * 100 / $ATTEMPTS" | bc

# Traffic split
SEMANTIC=$(vercel logs --output plain | grep "SEMANTIC cohort" | wc -l)
REGEX=$(vercel logs --output plain | grep "REGEX cohort" | wc -l)
echo "scale=2; $SEMANTIC * 100 / ($SEMANTIC + $REGEX)" | bc

# Latency
vercel logs --output plain | grep "Total detection time" | \
  awk '{print $NF}' | sed 's/ms//' | \
  awk '{sum+=$1; count++} END {print sum/count}'
```

---

## Completion Criteria

Mark rollout as **COMPLETE** when:

- [x] Phase 1 (Shadow Mode) completed
  - Accuracy ≥90%
  - 24 hours stable
  - Analysis report generated

- [x] Phase 2 (A/B Test 10%) completed
  - Error rate <5%
  - Latency <150ms
  - 4 hours stable

- [x] Phase 3 (Gradual Rollout) completed
  - 25%, 50%, 75% stages stable
  - Each stage monitored for 2 hours
  - No rollbacks required

- [x] Phase 4 (100% Semantic) completed
  - 4+ hours stable at 100%
  - All metrics within targets
  - Zero production incidents

- [x] Week 1 Observation completed
  - Daily monitoring shows stability
  - No user complaints
  - System performance baseline established

- [x] Git commit created
  ```bash
  git commit -m "feat(workflow): complete semantic detection rollout to 100% traffic"
  ```

---

**Checklist Last Updated**: 2025-10-10
**Next Review**: After Week 1 of 100% rollout
