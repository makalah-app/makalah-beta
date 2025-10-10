#!/bin/bash
# =============================================================================
# Contextual Guidance Rollout Script
# =============================================================================
# Purpose: Update rollout stage for contextual guidance feature flag
# Usage: ./rollout-contextual-guidance.sh <stage>
#
# Arguments:
#   stage - Rollout stage to deploy
#
# Rollout Stages (8 stages):
#   shadow       - 0% (Detection runs but no injection, logging only)
#   canary       - 1% (Internal testing)
#   beta         - 10% (A/B test group)
#   gradual_25   - 25% (Gradual rollout)
#   gradual_50   - 50% (Half of users)
#   gradual_75   - 75% (Majority of users)
#   enabled      - 100% (Full rollout)
#   disabled     - 0% (Feature completely off)
#
# Examples:
#   ./rollout-contextual-guidance.sh shadow      # Day 1: Shadow mode (24h monitoring)
#   ./rollout-contextual-guidance.sh canary      # Day 2-3: Canary (1%, 48h monitoring)
#   ./rollout-contextual-guidance.sh beta        # Week 2: Beta (10%, 7 days)
#   ./rollout-contextual-guidance.sh gradual_25  # Week 3: 25%
#   ./rollout-contextual-guidance.sh gradual_50  # Week 3.5: 50%
#   ./rollout-contextual-guidance.sh gradual_75  # Week 4: 75%
#   ./rollout-contextual-guidance.sh enabled     # Week 4.5: 100%
#
# Part of: Task 4.4 - Rollout for Contextual Guidance
# Reference: workflow_infrastructure/workflow_task/phase_04/task_4-4_rollout.md
# =============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Parse Arguments
# =============================================================================

STAGE="$1"

if [ -z "$STAGE" ]; then
  echo -e "${RED}Error: Missing stage argument${NC}"
  echo ""
  echo "Usage: $0 <stage>"
  echo ""
  echo "Available stages:"
  echo "  shadow       - 0% (Detection runs but no injection, logging only)"
  echo "  canary       - 1% (Internal testing)"
  echo "  beta         - 10% (A/B test group)"
  echo "  gradual_25   - 25% (Gradual rollout)"
  echo "  gradual_50   - 50% (Half of users)"
  echo "  gradual_75   - 75% (Majority of users)"
  echo "  enabled      - 100% (Full rollout)"
  echo "  disabled     - 0% (Feature completely off)"
  echo ""
  echo "Example: $0 shadow"
  exit 1
fi

# Validate stage
case $STAGE in
  shadow|canary|beta|gradual_25|gradual_50|gradual_75|enabled|disabled)
    # Valid stage
    ;;
  *)
    echo -e "${RED}Error: Invalid stage '${STAGE}'${NC}"
    echo ""
    echo "Valid stages: shadow, canary, beta, gradual_25, gradual_50, gradual_75, enabled, disabled"
    exit 1
    ;;
esac

# =============================================================================
# Stage Configuration
# =============================================================================

declare -A STAGE_PERCENTAGES
STAGE_PERCENTAGES=(
  ["disabled"]=0
  ["shadow"]=0
  ["canary"]=1
  ["beta"]=10
  ["gradual_25"]=25
  ["gradual_50"]=50
  ["gradual_75"]=75
  ["enabled"]=100
)

PERCENTAGE=${STAGE_PERCENTAGES[$STAGE]}

# =============================================================================
# Confirmation
# =============================================================================

echo -e "${YELLOW}==============================================================================${NC}"
echo -e "${YELLOW}Contextual Guidance Rollout Configuration${NC}"
echo -e "${YELLOW}==============================================================================${NC}"
echo ""
echo -e "  Rollout Stage:      ${GREEN}${STAGE}${NC}"
echo -e "  Traffic Percentage: ${GREEN}${PERCENTAGE}%${NC}"
echo ""

# Explain stage
case $STAGE in
  disabled)
    echo -e "  ${YELLOW}Disabled:${NC} Feature completely off"
    echo -e "  ${YELLOW}Purpose:${NC} Emergency rollback or maintenance"
    echo -e "  ${YELLOW}Behavior:${NC} No detection, no injection"
    ;;
  shadow)
    echo -e "  ${YELLOW}Shadow Mode:${NC} Detection runs but no injection"
    echo -e "  ${YELLOW}Purpose:${NC} Validate detection accuracy without affecting users"
    echo -e "  ${YELLOW}Behavior:${NC} Logs trigger frequency, no guidance injected"
    echo -e "  ${YELLOW}Duration:${NC} 24 hours minimum"
    ;;
  canary)
    echo -e "  ${YELLOW}Canary Mode:${NC} 1% of users get guidance"
    echo -e "  ${YELLOW}Purpose:${NC} Internal testing with minimal user exposure"
    echo -e "  ${YELLOW}Behavior:${NC} Hash-based user assignment (deterministic)"
    echo -e "  ${YELLOW}Duration:${NC} 48 hours minimum"
    ;;
  beta)
    echo -e "  ${YELLOW}Beta Mode:${NC} 10% A/B test group"
    echo -e "  ${YELLOW}Purpose:${NC} Monitor metrics and gather user feedback"
    echo -e "  ${YELLOW}Behavior:${NC} 10% users get guidance, 90% control group"
    echo -e "  ${YELLOW}Duration:${NC} 7 days minimum"
    echo -e "  ${YELLOW}Target Metrics:${NC}"
    echo -e "    - Trigger frequency: 8-12%"
    echo -e "    - Token cost increase: ≤10%"
    echo -e "    - User satisfaction: +10-20%"
    ;;
  gradual_25)
    echo -e "  ${YELLOW}Gradual 25%:${NC} Quarter of users"
    echo -e "  ${YELLOW}Purpose:${NC} Scale up safely"
    echo -e "  ${YELLOW}Duration:${NC} 48 hours minimum"
    ;;
  gradual_50)
    echo -e "  ${YELLOW}Gradual 50%:${NC} Half of users"
    echo -e "  ${YELLOW}Purpose:${NC} Continue gradual rollout"
    echo -e "  ${YELLOW}Duration:${NC} 48 hours minimum"
    ;;
  gradual_75)
    echo -e "  ${YELLOW}Gradual 75%:${NC} Majority of users"
    echo -e "  ${YELLOW}Purpose:${NC} Final validation before full rollout"
    echo -e "  ${YELLOW}Duration:${NC} 48 hours minimum"
    ;;
  enabled)
    echo -e "  ${YELLOW}Full Rollout:${NC} 100% of users"
    echo -e "  ${YELLOW}Purpose:${NC} Production deployment complete"
    echo -e "  ${YELLOW}Behavior:${NC} All users get contextual guidance"
    ;;
esac

echo ""
echo -e "${YELLOW}==============================================================================${NC}"
echo ""

# Database connection check
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
  echo "Please set DATABASE_URL with your Supabase connection string"
  exit 1
fi

read -p "Proceed with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Deployment cancelled${NC}"
  exit 0
fi

# =============================================================================
# Update Feature Flag in Database
# =============================================================================

echo ""
echo -e "${GREEN}Updating feature flag in database...${NC}"
echo ""

psql "$DATABASE_URL" <<EOF
-- Update rollout stage
UPDATE feature_flags
SET rollout_stage = '$STAGE',
    updated_at = NOW()
WHERE flag_name = 'contextual_guidance';

-- Display current configuration
SELECT
  flag_name,
  rollout_stage,
  array_length(enabled_for_users, 1) AS enabled_users_count,
  array_length(disabled_for_users, 1) AS disabled_users_count,
  updated_at
FROM feature_flags
WHERE flag_name = 'contextual_guidance';
EOF

echo ""
echo -e "${GREEN}✓ Rollout stage updated to: ${STAGE} (${PERCENTAGE}%)${NC}"
echo ""

# =============================================================================
# Post-Deployment Instructions
# =============================================================================

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""

case $STAGE in
  shadow)
    echo "1. Monitor logs for 24 hours:"
    echo "   - Detection should trigger ~10% of messages"
    echo "   - NO guidance should be injected (check logs for 'Shadow mode')"
    echo ""
    echo "2. Check detection metrics:"
    echo "   psql \$DATABASE_URL -c \""
    echo "   SELECT"
    echo "     COUNT(*) AS total_messages,"
    echo "     COUNT(*) FILTER (WHERE metadata->'guidance'->>'triggered' = 'true') AS detected,"
    echo "     ROUND(COUNT(*) FILTER (WHERE metadata->'guidance'->>'triggered' = 'true')::numeric /"
    echo "           COUNT(*)::numeric * 100, 2) AS detection_percentage"
    echo "   FROM chat_messages"
    echo "   WHERE created_at >= NOW() - INTERVAL '24 hours';"
    echo "   \""
    echo ""
    echo "3. If detection frequency is 8-15%, proceed to canary:"
    echo "   ./scripts/deploy/rollout-contextual-guidance.sh canary"
    echo ""
    echo "4. If detection frequency is outside 8-15%, tune thresholds first:"
    echo "   - Too high (>15%): Tighten detection patterns"
    echo "   - Too low (<8%): Loosen detection patterns"
    ;;

  canary)
    echo "1. Add internal test users to enabled list:"
    echo "   psql \$DATABASE_URL -c \""
    echo "   SELECT add_user_to_flag("
    echo "     'contextual_guidance',"
    echo "     '<user-uuid-here>',"
    echo "     'enabled_for_users'"
    echo "   );"
    echo "   \""
    echo ""
    echo "2. Monitor for 48 hours:"
    echo "   - No errors in logs"
    echo "   - Token cost increase <2% (1% traffic × ~300 tokens)"
    echo "   - Qualitative feedback from internal users"
    echo ""
    echo "3. If stable and feedback positive, proceed to beta:"
    echo "   ./scripts/deploy/rollout-contextual-guidance.sh beta"
    ;;

  beta)
    echo "1. Monitor metrics for 7 days:"
    echo "   - Trigger frequency: 8-12% (target)"
    echo "   - Token cost increase: ≤10% (target)"
    echo "   - User satisfaction: Track feedback"
    echo ""
    echo "2. Run metrics query:"
    echo "   psql \$DATABASE_URL -c \""
    echo "   SELECT"
    echo "     COUNT(*) AS total_messages,"
    echo "     COUNT(*) FILTER (WHERE metadata->'guidance'->>'triggered' = 'true') AS guided,"
    echo "     ROUND(COUNT(*) FILTER (WHERE metadata->'guidance'->>'triggered' = 'true')::numeric /"
    echo "           COUNT(*)::numeric * 100, 2) AS trigger_percentage,"
    echo "     ROUND(AVG(COALESCE((metadata->'tokens'->>'total')::int, 0))) AS avg_tokens_all,"
    echo "     ROUND(AVG(COALESCE((metadata->'tokens'->>'total')::int, 0))"
    echo "           FILTER (WHERE metadata->'guidance'->>'triggered' = 'true')) AS avg_tokens_guided"
    echo "   FROM chat_messages"
    echo "   WHERE created_at >= NOW() - INTERVAL '7 days';"
    echo "   \""
    echo ""
    echo "3. If metrics meet targets, proceed to gradual rollout:"
    echo "   ./scripts/deploy/rollout-contextual-guidance.sh gradual_25"
    ;;

  gradual_25|gradual_50|gradual_75)
    NEXT_STAGE=""
    case $STAGE in
      gradual_25) NEXT_STAGE="gradual_50" ;;
      gradual_50) NEXT_STAGE="gradual_75" ;;
      gradual_75) NEXT_STAGE="enabled" ;;
    esac

    echo "1. Monitor metrics for 48 hours:"
    echo "   - Error rate <5%"
    echo "   - No regressions in user experience"
    echo ""
    echo "2. If stable, proceed to next stage:"
    echo "   ./scripts/deploy/rollout-contextual-guidance.sh $NEXT_STAGE"
    ;;

  enabled)
    echo "1. Monitor production for 4 hours minimum"
    echo "2. Validate:"
    echo "   - Error rate <5%"
    echo "   - Trigger frequency 8-12%"
    echo "   - No production incidents"
    echo ""
    echo "3. After 2 weeks of stable operation:"
    echo "   - Mark Task 4.4 as complete"
    echo "   - Update documentation to reflect full rollout"
    echo "   - Consider A/B test deprecation"
    ;;

  disabled)
    echo "Feature completely disabled."
    echo "To re-enable, start from shadow mode:"
    echo "  ./scripts/deploy/rollout-contextual-guidance.sh shadow"
    ;;
esac

echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo "  # Real-time logs"
echo "  vercel logs --follow | grep 'Contextual Guidance'"
echo ""
echo "  # Check current configuration"
echo "  psql \$DATABASE_URL -c 'SELECT * FROM feature_flags WHERE flag_name = \"contextual_guidance\"'"
echo ""
echo -e "${YELLOW}Rollback (if needed):${NC}"
echo "  ./scripts/deploy/rollback-contextual-guidance.sh"
echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo ""
