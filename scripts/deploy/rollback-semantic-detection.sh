#!/bin/bash
# =============================================================================
# Emergency Rollback Script - Semantic Detection
# =============================================================================
# Purpose: Immediately disable semantic detection and revert to regex-only
# Usage: ./rollback-semantic-detection.sh [reason]
#
# Arguments:
#   reason - Optional reason for rollback (for logging)
#
# Examples:
#   ./rollback-semantic-detection.sh "High error rate detected"
#   ./rollback-semantic-detection.sh "User complaints"
#   ./rollback-semantic-detection.sh  # No reason specified
#
# This script:
#   1. Disables all semantic detection modes
#   2. Redeploys to production immediately
#   3. Logs rollback event
#   4. Provides post-rollback verification steps
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# =============================================================================
# Configuration
# =============================================================================

REASON=${1:-"Manual rollback (no reason specified)"}
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# =============================================================================
# Warning and Confirmation
# =============================================================================

echo ""
echo -e "${RED}⚠️  EMERGENCY ROLLBACK WARNING ⚠️${NC}"
echo -e "${RED}==============================================================================${NC}"
echo ""
echo -e "${YELLOW}This will immediately disable semantic detection and revert to regex-only.${NC}"
echo ""
echo -e "  Rollback Reason: ${RED}${REASON}${NC}"
echo -e "  Timestamp:       ${TIMESTAMP}"
echo ""
echo -e "${YELLOW}Impact:${NC}"
echo "  - All semantic detection disabled"
echo "  - 100% traffic reverts to regex-based detection"
echo "  - Immediate production deployment"
echo ""
echo -e "${RED}==============================================================================${NC}"
echo ""

# Skip confirmation for automated rollback
if [ "$CI" != "true" ]; then
  read -p "Confirm rollback? (yes/no): " CONFIRM

  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${GREEN}Rollback cancelled${NC}"
    exit 0
  fi
fi

# =============================================================================
# Disable Semantic Detection
# =============================================================================

echo ""
echo -e "${YELLOW}Step 1: Disabling semantic detection...${NC}"
echo ""

# Disable all semantic detection modes
vercel env add SHADOW_MODE_ENABLED production <<< "false"
vercel env add AB_TEST_ENABLED production <<< "false"
vercel env add ENABLE_SEMANTIC_DETECTION production <<< "false"
vercel env add SEMANTIC_PERCENTAGE production <<< "0"

echo -e "${GREEN}✓ Environment variables updated${NC}"

# =============================================================================
# Deploy to Production
# =============================================================================

echo ""
echo -e "${YELLOW}Step 2: Deploying to production...${NC}"
echo ""

vercel --prod

echo ""
echo -e "${GREEN}✓ Production deployment complete${NC}"

# =============================================================================
# Verify Rollback
# =============================================================================

echo ""
echo -e "${YELLOW}Step 3: Verifying rollback...${NC}"
echo ""

sleep 5  # Wait for deployment to propagate

echo "Checking logs for regex-only detection..."
echo ""

# Check recent logs for regex usage (non-blocking)
vercel logs --output plain 2>&1 | tail -50 | grep -i "using regex" || echo "  (Verification logs not immediately available)"

echo ""
echo -e "${GREEN}✓ Rollback verification initiated${NC}"

# =============================================================================
# Log Rollback Event
# =============================================================================

echo ""
echo -e "${YELLOW}Step 4: Logging rollback event...${NC}"
echo ""

# Create rollback log
ROLLBACK_LOG="rollback-$(date +%Y%m%d-%H%M%S).log"

cat > "$ROLLBACK_LOG" <<EOF
=============================================================================
SEMANTIC DETECTION ROLLBACK EVENT
=============================================================================

Timestamp:       ${TIMESTAMP}
Reason:          ${REASON}
Executed By:     ${USER}
Environment:     production

Actions Taken:
  1. SHADOW_MODE_ENABLED = false
  2. AB_TEST_ENABLED = false
  3. ENABLE_SEMANTIC_DETECTION = false
  4. SEMANTIC_PERCENTAGE = 0
  5. Deployed to production

Result:
  - Semantic detection disabled
  - System reverted to regex-only detection
  - 100% traffic using regex patterns

Next Steps:
  - Investigate root cause
  - Review error logs
  - Fix issues before re-enabling semantic detection

=============================================================================
EOF

echo -e "${GREEN}✓ Rollback event logged to: ${ROLLBACK_LOG}${NC}"

# =============================================================================
# Post-Rollback Summary
# =============================================================================

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}✅ ROLLBACK COMPLETE${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "  - Semantic detection disabled"
echo "  - System using regex-only detection"
echo "  - Production deployment successful"
echo ""
echo -e "${YELLOW}Verification Steps:${NC}"
echo ""
echo "1. Monitor error rate (should stabilize):"
echo "   vercel logs --follow | grep -i error"
echo ""
echo "2. Confirm regex detection in use:"
echo "   vercel logs --follow | grep 'Using regex'"
echo ""
echo "3. Check for user complaints (should decrease)"
echo ""
echo -e "${YELLOW}Investigation Steps:${NC}"
echo ""
echo "1. Review error logs before rollback:"
echo "   vercel logs --since 1h"
echo ""
echo "2. Analyze what caused the rollback:"
echo "   - High error rate?"
echo "   - Latency issues?"
echo "   - User complaints?"
echo "   - Database failures?"
echo ""
echo "3. Root Cause Analysis:"
echo "   - Review semantic detection logs"
echo "   - Check pgvector index health"
echo "   - Verify knowledge base embeddings"
echo "   - Check OpenAI API quota/rate limits"
echo ""
echo -e "${YELLOW}Before Re-enabling:${NC}"
echo ""
echo "1. Fix root cause"
echo "2. Test in staging environment"
echo "3. Re-run shadow mode to validate accuracy"
echo "4. Start with 10% A/B test, not full rollout"
echo ""
echo -e "${YELLOW}Re-enable Command (after fixes):${NC}"
echo "  ./scripts/deploy/rollout-semantic-detection.sh 0 shadow"
echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo ""

# =============================================================================
# Send Alert (Optional - Slack/Email/PagerDuty)
# =============================================================================

# Uncomment to send alerts
# if [ -n "$SLACK_WEBHOOK_URL" ]; then
#   curl -X POST "$SLACK_WEBHOOK_URL" \
#     -H 'Content-Type: application/json' \
#     -d "{\"text\":\"🚨 Semantic Detection Rollback: ${REASON}\"}"
# fi

# =============================================================================
# Exit Code
# =============================================================================

exit 0
