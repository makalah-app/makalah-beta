#!/bin/bash
# =============================================================================
# Semantic Detection Rollout Script
# =============================================================================
# Purpose: Deploy semantic detection to specified traffic percentage
# Usage: ./rollout-semantic-detection.sh <percentage> [mode]
#
# Arguments:
#   percentage - Traffic percentage for semantic detection (0-100)
#   mode       - Deployment mode: shadow | ab-test | full (default: ab-test)
#
# Examples:
#   ./rollout-semantic-detection.sh 0 shadow      # Shadow mode (0% traffic)
#   ./rollout-semantic-detection.sh 10 ab-test    # A/B test at 10%
#   ./rollout-semantic-detection.sh 100 full      # Full semantic (100%)
#
# Environment Variables Set:
#   SHADOW_MODE_ENABLED       - Enable shadow mode logging
#   AB_TEST_ENABLED           - Enable A/B testing
#   SEMANTIC_PERCENTAGE       - Traffic percentage for semantic cohort
#   ENABLE_SEMANTIC_DETECTION - Global enable/disable semantic detection
# =============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Parse Arguments
# =============================================================================

PERCENTAGE=$1
MODE=${2:-ab-test}

if [ -z "$PERCENTAGE" ]; then
  echo -e "${RED}Error: Missing percentage argument${NC}"
  echo "Usage: $0 <percentage> [mode]"
  echo "Example: $0 10 ab-test"
  exit 1
fi

# Validate percentage range
if [ "$PERCENTAGE" -lt 0 ] || [ "$PERCENTAGE" -gt 100 ]; then
  echo -e "${RED}Error: Percentage must be between 0 and 100${NC}"
  exit 1
fi

# Validate mode
if [[ ! "$MODE" =~ ^(shadow|ab-test|full)$ ]]; then
  echo -e "${RED}Error: Invalid mode. Must be: shadow, ab-test, or full${NC}"
  exit 1
fi

# =============================================================================
# Confirmation
# =============================================================================

echo -e "${YELLOW}==============================================================================${NC}"
echo -e "${YELLOW}Semantic Detection Rollout Configuration${NC}"
echo -e "${YELLOW}==============================================================================${NC}"
echo ""
echo -e "  Traffic Percentage: ${GREEN}${PERCENTAGE}%${NC}"
echo -e "  Deployment Mode:    ${GREEN}${MODE}${NC}"
echo ""

# Explain mode
case $MODE in
  shadow)
    echo -e "  ${YELLOW}Shadow Mode:${NC} Run semantic + regex in parallel, use regex results"
    echo -e "  ${YELLOW}Purpose:${NC} Validate accuracy without affecting users"
    echo -e "  ${YELLOW}Traffic:${NC} 0% semantic (logging only)"
    ;;
  ab-test)
    echo -e "  ${YELLOW}A/B Test Mode:${NC} Split traffic based on user hash"
    echo -e "  ${YELLOW}Purpose:${NC} Monitor metrics with limited exposure"
    echo -e "  ${YELLOW}Traffic:${NC} ${PERCENTAGE}% semantic, $((100 - PERCENTAGE))% regex"
    ;;
  full)
    echo -e "  ${YELLOW}Full Semantic Mode:${NC} 100% semantic with regex fallback"
    echo -e "  ${YELLOW}Purpose:${NC} Production deployment"
    echo -e "  ${YELLOW}Traffic:${NC} 100% semantic"
    ;;
esac

echo ""
echo -e "${YELLOW}==============================================================================${NC}"
echo ""
read -p "Proceed with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Deployment cancelled${NC}"
  exit 0
fi

# =============================================================================
# Set Environment Variables
# =============================================================================

echo ""
echo -e "${GREEN}Setting environment variables...${NC}"

case $MODE in
  shadow)
    # Shadow mode: Run both, use regex
    vercel env add SHADOW_MODE_ENABLED production <<< "true"
    vercel env add AB_TEST_ENABLED production <<< "false"
    vercel env add ENABLE_SEMANTIC_DETECTION production <<< "true"
    vercel env add SEMANTIC_PERCENTAGE production <<< "$PERCENTAGE"
    ;;

  ab-test)
    # A/B test mode: Split traffic
    vercel env add SHADOW_MODE_ENABLED production <<< "false"
    vercel env add AB_TEST_ENABLED production <<< "true"
    vercel env add ENABLE_SEMANTIC_DETECTION production <<< "true"
    vercel env add SEMANTIC_PERCENTAGE production <<< "$PERCENTAGE"
    ;;

  full)
    # Full semantic mode
    vercel env add SHADOW_MODE_ENABLED production <<< "false"
    vercel env add AB_TEST_ENABLED production <<< "false"
    vercel env add ENABLE_SEMANTIC_DETECTION production <<< "true"
    vercel env add SEMANTIC_PERCENTAGE production <<< "100"
    ;;
esac

echo -e "${GREEN}Environment variables set successfully${NC}"

# =============================================================================
# Deploy to Production
# =============================================================================

echo ""
echo -e "${GREEN}Deploying to production...${NC}"
echo ""

vercel --prod

# =============================================================================
# Post-Deployment Instructions
# =============================================================================

echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""

case $MODE in
  shadow)
    echo "1. Monitor logs for 24 hours:"
    echo "   vercel logs --follow | grep 'Shadow Mode'"
    echo ""
    echo "2. Analyze accuracy after 24 hours:"
    echo "   ./scripts/analysis/analyze-detection-accuracy.sh"
    echo ""
    echo "3. If accuracy ≥90%, proceed to A/B test:"
    echo "   ./scripts/deploy/rollout-semantic-detection.sh 10 ab-test"
    ;;

  ab-test)
    if [ "$PERCENTAGE" -eq 10 ]; then
      echo "1. Monitor metrics for 4 hours:"
      echo "   - Error rate <5%"
      echo "   - Latency p95 <150ms"
      echo "   - No user complaints"
      echo ""
      echo "2. If stable, increase to 25%:"
      echo "   ./scripts/deploy/rollout-semantic-detection.sh 25 ab-test"
    elif [ "$PERCENTAGE" -eq 25 ]; then
      echo "1. Monitor metrics for 2 hours"
      echo "2. If stable, increase to 50%:"
      echo "   ./scripts/deploy/rollout-semantic-detection.sh 50 ab-test"
    elif [ "$PERCENTAGE" -eq 50 ]; then
      echo "1. Monitor metrics for 2 hours"
      echo "2. If stable, increase to 75%:"
      echo "   ./scripts/deploy/rollout-semantic-detection.sh 75 ab-test"
    elif [ "$PERCENTAGE" -eq 75 ]; then
      echo "1. Monitor metrics for 2 hours"
      echo "2. If stable, deploy to 100%:"
      echo "   ./scripts/deploy/rollout-semantic-detection.sh 100 full"
    else
      echo "1. Monitor metrics for 2 hours"
      echo "2. Check error rate, latency, user feedback"
    fi
    ;;

  full)
    echo "1. Monitor production for 4 hours minimum"
    echo "2. Validate:"
    echo "   - Error rate <5%"
    echo "   - Latency p95 <150ms"
    echo "   - No production incidents"
    echo ""
    echo "3. After 2 weeks of stable operation:"
    echo "   - Consider removing regex fallback code"
    echo "   - Update documentation to reflect semantic-only mode"
    ;;
esac

echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo "  vercel logs --follow"
echo ""
echo -e "${YELLOW}Rollback (if needed):${NC}"
echo "  ./scripts/deploy/rollback-semantic-detection.sh"
echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo ""
