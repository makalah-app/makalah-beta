#!/bin/bash
# =============================================================================
# Contextual Guidance Rollback Script (Emergency Disable)
# =============================================================================
# Purpose: Immediately disable contextual guidance in case of production issues
# Usage: ./rollback-contextual-guidance.sh
#
# This script:
#   1. Sets rollout_stage to 'disabled' (0% traffic)
#   2. Verifies the change was applied
#   3. Provides monitoring instructions
#
# Execution time: <1 minute
#
# Use Cases:
#   - Token cost exceeds budget (+12%)
#   - High error rate (>5%)
#   - User complaints spike
#   - Retrieval latency too high (>300ms p95)
#   - False positive rate too high (>15%)
#
# Part of: Task 4.4 - Rollout for Contextual Guidance
# Reference: workflow_infrastructure/workflow_task/phase_04/task_4-4_rollout.md
# =============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Confirmation
# =============================================================================

echo -e "${RED}==============================================================================${NC}"
echo -e "${RED}EMERGENCY ROLLBACK: Contextual Guidance${NC}"
echo -e "${RED}==============================================================================${NC}"
echo ""
echo -e "${YELLOW}This will immediately disable contextual guidance for ALL users.${NC}"
echo ""
echo -e "Current behavior:"
echo "  - Detection will continue to run (for monitoring)"
echo "  - Guidance will NOT be injected"
echo "  - Users return to baseline experience"
echo ""
echo -e "${YELLOW}Are you sure you want to proceed?${NC}"
echo ""

# Database connection check
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
  echo "Please set DATABASE_URL with your Supabase connection string"
  exit 1
fi

read -p "Type 'ROLLBACK' to confirm: " CONFIRM

if [ "$CONFIRM" != "ROLLBACK" ]; then
  echo -e "${RED}Rollback cancelled${NC}"
  exit 0
fi

# =============================================================================
# Disable Feature Flag
# =============================================================================

echo ""
echo -e "${GREEN}Disabling contextual guidance...${NC}"
echo ""

psql "$DATABASE_URL" <<EOF
-- Disable feature flag
UPDATE feature_flags
SET rollout_stage = 'disabled',
    updated_at = NOW()
WHERE flag_name = 'contextual_guidance';

-- Verify current configuration
SELECT
  flag_name,
  rollout_stage AS stage,
  updated_at
FROM feature_flags
WHERE flag_name = 'contextual_guidance';
EOF

ROLLBACK_EXIT_CODE=$?

if [ $ROLLBACK_EXIT_CODE -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ Contextual guidance disabled successfully${NC}"
  echo ""
else
  echo ""
  echo -e "${RED}✗ Rollback failed (exit code: $ROLLBACK_EXIT_CODE)${NC}"
  echo ""
  echo "Manual rollback command:"
  echo "  psql \$DATABASE_URL -c \"UPDATE feature_flags SET rollout_stage = 'disabled', updated_at = NOW() WHERE flag_name = 'contextual_guidance';\""
  exit 1
fi

# =============================================================================
# Verification
# =============================================================================

echo -e "${YELLOW}==============================================================================${NC}"
echo -e "${YELLOW}Verifying Rollback${NC}"
echo -e "${YELLOW}==============================================================================${NC}"
echo ""
echo "1. Check feature flag status:"
echo ""

psql "$DATABASE_URL" -c "SELECT flag_name, rollout_stage, updated_at FROM feature_flags WHERE flag_name = 'contextual_guidance';"

echo ""
echo "2. Expected result:"
echo "   flag_name            | rollout_stage | updated_at"
echo "   ---------------------+---------------+-------------------------"
echo "   contextual_guidance  | disabled      | [current timestamp]"
echo ""

# =============================================================================
# Post-Rollback Instructions
# =============================================================================

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Rollback Complete${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Verify metrics return to baseline within 10 minutes:"
echo "   - Token cost decrease (guidance no longer injected)"
echo "   - Error rate should normalize"
echo "   - Latency should improve"
echo ""
echo "2. Monitor logs for confirmation:"
echo "   vercel logs --follow | grep 'Contextual Guidance'"
echo "   # Should see: 'Feature flag check: { stage: disabled, enabled: false }'"
echo ""
echo "3. Investigate root cause:"
echo "   # Check recent metrics"
echo "   psql \$DATABASE_URL -c \""
echo "   SELECT"
echo "     COUNT(*) AS total_messages,"
echo "     COUNT(*) FILTER (WHERE metadata->'guidance'->>'triggered' = 'true') AS guided,"
echo "     ROUND(AVG(COALESCE((metadata->'tokens'->>'total')::int, 0))) AS avg_tokens,"
echo "     MAX(COALESCE((metadata->'guidance'->>'retrieval_time')::int, 0)) AS max_retrieval_ms"
echo "   FROM chat_messages"
echo "   WHERE created_at >= NOW() - INTERVAL '1 hour';"
echo "   \""
echo ""
echo "4. Determine next action:"
echo "   a) If token cost too high:"
echo "      - Reduce match_count in retrieval.ts"
echo "      - Tighten detection patterns"
echo "   "
echo "   b) If error rate too high:"
echo "      - Check Supabase logs for database errors"
echo "      - Check OpenAI API logs for embedding errors"
echo "   "
echo "   c) If latency too high:"
echo "      - Reduce embedding timeout"
echo "      - Check pgvector index performance"
echo "   "
echo "   d) If false positive rate too high:"
echo "      - Tighten detection patterns"
echo "      - Increase confidence thresholds"
echo ""
echo "5. After fixing issues, restart from shadow mode:"
echo "   ./scripts/deploy/rollout-contextual-guidance.sh shadow"
echo ""
echo -e "${YELLOW}==============================================================================${NC}"
echo -e "${YELLOW}Emergency Contacts${NC}"
echo -e "${YELLOW}==============================================================================${NC}"
echo ""
echo "If rollback does not resolve the issue:"
echo "  1. Check Vercel deployment status"
echo "  2. Check Supabase database connectivity"
echo "  3. Contact supervisor: erik.supit@gmail.com"
echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo ""
