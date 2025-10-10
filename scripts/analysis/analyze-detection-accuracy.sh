#!/bin/bash
# =============================================================================
# Semantic Detection Accuracy Analysis Script
# =============================================================================
# Purpose: Analyze shadow mode logs to calculate semantic detection accuracy
# Usage: ./analyze-detection-accuracy.sh [logfile]
#
# Arguments:
#   logfile - Path to log file (optional, defaults to fetching from Vercel)
#
# Examples:
#   ./analyze-detection-accuracy.sh                  # Fetch latest logs
#   ./analyze-detection-accuracy.sh vercel.log       # Analyze local file
#
# Output:
#   - Total comparisons
#   - Match count
#   - Accuracy percentage
#   - Pass/Fail recommendation (target: ≥90%)
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# =============================================================================
# Configuration
# =============================================================================

LOGFILE=$1
TARGET_ACCURACY=90

# =============================================================================
# Fetch Logs (if no file provided)
# =============================================================================

if [ -z "$LOGFILE" ]; then
  echo -e "${YELLOW}Fetching logs from Vercel...${NC}"
  LOGFILE="shadow-mode-$(date +%Y%m%d-%H%M%S).log"

  vercel logs --output plain > "$LOGFILE" 2>&1 || {
    echo -e "${RED}Error: Failed to fetch logs from Vercel${NC}"
    echo "Make sure you're authenticated: vercel login"
    exit 1
  }

  echo -e "${GREEN}Logs saved to: ${LOGFILE}${NC}"
  echo ""
fi

# Validate log file exists
if [ ! -f "$LOGFILE" ]; then
  echo -e "${RED}Error: Log file not found: ${LOGFILE}${NC}"
  exit 1
fi

# =============================================================================
# Analysis
# =============================================================================

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Semantic Detection Accuracy Report${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "Log File: ${GREEN}${LOGFILE}${NC}"
echo ""

# Count total shadow mode comparisons
TOTAL=$(grep -c "\[Shadow Mode\] Comparison:" "$LOGFILE" 2>/dev/null || echo "0")

if [ "$TOTAL" -eq 0 ]; then
  echo -e "${RED}Error: No shadow mode comparisons found in log file${NC}"
  echo ""
  echo "Possible reasons:"
  echo "  1. Shadow mode not enabled (check SHADOW_MODE_ENABLED=true)"
  echo "  2. No chat requests processed yet"
  echo "  3. Log file too old (logs may have rotated)"
  echo ""
  echo "How to fix:"
  echo "  1. Enable shadow mode:"
  echo "     ./scripts/deploy/rollout-semantic-detection.sh 0 shadow"
  echo "  2. Wait 1 hour for traffic"
  echo "  3. Re-run this script"
  exit 1
fi

# Count matches (regex == semantic)
MATCHES=$(grep "\[Shadow Mode\] Comparison:" "$LOGFILE" | grep -c '"match":true' 2>/dev/null || echo "0")

# Count mismatches
MISMATCHES=$((TOTAL - MATCHES))

# Calculate accuracy percentage
ACCURACY=$(echo "scale=2; $MATCHES * 100 / $TOTAL" | bc)

# =============================================================================
# Display Results
# =============================================================================

echo -e "${YELLOW}Results:${NC}"
echo -e "  Total Comparisons: ${GREEN}${TOTAL}${NC}"
echo -e "  Matches (✓):       ${GREEN}${MATCHES}${NC}"
echo -e "  Mismatches (✗):    ${RED}${MISMATCHES}${NC}"
echo -e "  Accuracy:          ${GREEN}${ACCURACY}%${NC}"
echo ""
echo -e "  Target Accuracy:   ${BLUE}≥${TARGET_ACCURACY}%${NC}"
echo ""

# =============================================================================
# Pass/Fail Recommendation
# =============================================================================

echo -e "${BLUE}==============================================================================${NC}"

# Compare accuracy to target (handle decimal comparison)
if (( $(echo "$ACCURACY >= $TARGET_ACCURACY" | bc -l) )); then
  echo -e "${GREEN}✅ PASS - Accuracy meets target (${ACCURACY}% ≥ ${TARGET_ACCURACY}%)${NC}"
  echo ""
  echo -e "${YELLOW}Recommendation:${NC} Proceed to A/B test with 10% traffic"
  echo ""
  echo "  ./scripts/deploy/rollout-semantic-detection.sh 10 ab-test"
  echo ""
else
  echo -e "${RED}❌ FAIL - Accuracy below target (${ACCURACY}% < ${TARGET_ACCURACY}%)${NC}"
  echo ""
  echo -e "${YELLOW}Recommendation:${NC} Review mismatches and tune semantic detection"
  echo ""
  echo "Next steps:"
  echo "  1. Extract mismatches:"
  echo "     grep '\"match\":false' ${LOGFILE} > mismatches.log"
  echo ""
  echo "  2. Review patterns causing failures"
  echo ""
  echo "  3. Tune parameters:"
  echo "     - Adjust match_threshold (current: 0.70)"
  echo "     - Review knowledge base content"
  echo "     - Check for missing phase definitions"
  echo ""
  echo "  4. Re-run shadow mode after tuning"
fi

echo -e "${BLUE}==============================================================================${NC}"
echo ""

# =============================================================================
# Mismatch Analysis (if mismatches exist)
# =============================================================================

if [ "$MISMATCHES" -gt 0 ]; then
  echo -e "${YELLOW}Mismatch Breakdown:${NC}"
  echo ""

  # Extract mismatches to temporary file
  MISMATCH_FILE="mismatches-$(date +%Y%m%d-%H%M%S).log"
  grep "\[Shadow Mode\] Comparison:" "$LOGFILE" | grep '"match":false' > "$MISMATCH_FILE" 2>/dev/null || true

  if [ -s "$MISMATCH_FILE" ]; then
    echo "  Mismatches saved to: ${MISMATCH_FILE}"
    echo ""

    # Show first 5 mismatches
    echo "  Sample Mismatches (first 5):"
    echo ""
    head -5 "$MISMATCH_FILE" | while IFS= read -r line; do
      echo "    ${line}"
    done
    echo ""

    # Phase-level analysis
    echo -e "${YELLOW}Phase-Level Analysis:${NC}"
    echo ""

    # Count regex phases in mismatches
    echo "  Regex phases in mismatches:"
    grep -o '"regex":"[^"]*"' "$MISMATCH_FILE" | cut -d'"' -f4 | sort | uniq -c | sort -rn | head -10
    echo ""

    # Count semantic phases in mismatches
    echo "  Semantic phases in mismatches:"
    grep -o '"semantic":"[^"]*"' "$MISMATCH_FILE" | cut -d'"' -f4 | sort | uniq -c | sort -rn | head -10
    echo ""
  else
    echo "  (Unable to extract mismatch details)"
  fi
fi

# =============================================================================
# Summary Statistics
# =============================================================================

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${YELLOW}Summary Statistics:${NC}"
echo ""

# Time range of logs
FIRST_LOG=$(head -1 "$LOGFILE" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' || echo "Unknown")
LAST_LOG=$(tail -1 "$LOGFILE" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' || echo "Unknown")

echo "  Log Time Range:"
echo "    First: ${FIRST_LOG}"
echo "    Last:  ${LAST_LOG}"
echo ""

# Count by phase
echo "  Comparisons by Current Phase:"
grep "\[Workflow\] Current phase:" "$LOGFILE" | awk '{print $NF}' | sort | uniq -c | sort -rn || echo "  (Data not available)"
echo ""

echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Return exit code based on accuracy
if (( $(echo "$ACCURACY >= $TARGET_ACCURACY" | bc -l) )); then
  exit 0  # Success
else
  exit 1  # Failure
fi
