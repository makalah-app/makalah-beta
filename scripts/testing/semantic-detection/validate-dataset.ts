/**
 * Validate test dataset quality
 *
 * Checks:
 * - Total case count (≥50)
 * - Phase coverage (all 11 phases)
 * - Difficulty distribution (balanced)
 * - Unique IDs
 * - Required fields present
 * - Response lengths reasonable
 *
 * Usage:
 *   npx tsx scripts/testing/semantic-detection/validate-dataset.ts
 *
 * @since Beta 0.3
 */

import testDataset from './test-dataset.json';

// ============================================
// Types
// ============================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total_cases: number;
    phases_covered: number;
    difficulty_distribution: Record<string, number>;
    phase_distribution: Record<string, number>;
  };
}

// ============================================
// Constants
// ============================================

const REQUIRED_PHASES = [
  'exploring',
  'topic_locked',
  'researching',
  'foundation_ready',
  'outlining',
  'outline_locked',
  'drafting',
  'drafting_locked',
  'integrating',
  'polishing',
  'delivered'
];

const REQUIRED_FIELDS = ['id', 'phase', 'difficulty', 'ai_response', 'expected_phase', 'keywords', 'note'];

// ============================================
// Validation Function
// ============================================

function validateTestDataset(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const stats = {
    total_cases: testDataset.test_cases.length,
    phases_covered: 0,
    difficulty_distribution: {} as Record<string, number>,
    phase_distribution: {} as Record<string, number>
  };

  // ========================================
  // Check 1: Total Cases
  // ========================================

  if (stats.total_cases < 50) {
    errors.push(`Only ${stats.total_cases} test cases (minimum 50 required)`);
  }

  // ========================================
  // Check 2: Collect Phase and Difficulty Stats
  // ========================================

  const phaseSet = new Set<string>();
  const idSet = new Set<string>();

  testDataset.test_cases.forEach((testCase, index) => {
    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!(field in testCase)) {
        errors.push(`Test case ${index} (${testCase.id || 'unknown'}) missing field: ${field}`);
      }
    });

    // Check unique IDs
    if (idSet.has(testCase.id)) {
      errors.push(`Duplicate ID: ${testCase.id}`);
    }
    idSet.add(testCase.id);

    // Count phases
    phaseSet.add(testCase.expected_phase);
    stats.phase_distribution[testCase.expected_phase] =
      (stats.phase_distribution[testCase.expected_phase] || 0) + 1;

    // Count difficulties
    stats.difficulty_distribution[testCase.difficulty] =
      (stats.difficulty_distribution[testCase.difficulty] || 0) + 1;

    // Check response length
    if (testCase.ai_response.length < 20) {
      warnings.push(
        `Test case ${testCase.id} has very short response (${testCase.ai_response.length} chars)`
      );
    }

    // Check expected_phase matches phase field
    if (testCase.expected_phase !== testCase.phase) {
      warnings.push(
        `Test case ${testCase.id}: expected_phase (${testCase.expected_phase}) differs from phase (${testCase.phase})`
      );
    }

    // Check keywords is non-empty array
    if (!Array.isArray(testCase.keywords) || testCase.keywords.length === 0) {
      warnings.push(`Test case ${testCase.id} has no keywords`);
    }
  });

  stats.phases_covered = phaseSet.size;

  // ========================================
  // Check 3: Phase Coverage
  // ========================================

  if (stats.phases_covered < 11) {
    const missingPhases = REQUIRED_PHASES.filter(p => !phaseSet.has(p));
    errors.push(
      `Only ${stats.phases_covered}/11 phases covered. Missing: ${missingPhases.join(', ')}`
    );
  }

  // Check each phase has ≥3 cases
  REQUIRED_PHASES.forEach(phase => {
    const count = stats.phase_distribution[phase] || 0;
    if (count < 3) {
      warnings.push(`Phase "${phase}" has only ${count} test cases (recommend ≥3)`);
    }
  });

  // ========================================
  // Check 4: Difficulty Distribution
  // ========================================

  const easyCount = stats.difficulty_distribution['easy'] || 0;
  const mediumCount = stats.difficulty_distribution['medium'] || 0;
  const hardCount = stats.difficulty_distribution['hard'] || 0;
  const edgeCaseCount = stats.difficulty_distribution['edge_case'] || 0;

  // Target: 15 easy, 20 medium, 10 hard, 5 edge_case
  if (easyCount < 10) {
    warnings.push(`Only ${easyCount} easy cases (recommend ≥10)`);
  }
  if (mediumCount < 15) {
    warnings.push(`Only ${mediumCount} medium cases (recommend ≥15)`);
  }
  if (hardCount < 8) {
    warnings.push(`Only ${hardCount} hard cases (recommend ≥8)`);
  }
  if (edgeCaseCount < 3) {
    warnings.push(`Only ${edgeCaseCount} edge_case cases (recommend ≥3)`);
  }

  // ========================================
  // Return Result
  // ========================================

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

// ============================================
// Main Execution
// ============================================

const result = validateTestDataset();

console.log('📊 Test Dataset Validation\n');
console.log('Stats:');
console.log(`  Total cases: ${result.stats.total_cases}`);
console.log(`  Phases covered: ${result.stats.phases_covered}/11`);
console.log(`  Difficulty distribution:`, result.stats.difficulty_distribution);
console.log('\n  Phase distribution:');

// Sort phases by workflow order
const phaseOrder = [
  'exploring',
  'topic_locked',
  'researching',
  'foundation_ready',
  'outlining',
  'outline_locked',
  'drafting',
  'drafting_locked',
  'integrating',
  'polishing',
  'delivered'
];

phaseOrder.forEach(phase => {
  const count = result.stats.phase_distribution[phase] || 0;
  console.log(`    ${phase.padEnd(20)}: ${count} cases`);
});

if (result.errors.length > 0) {
  console.log('\n❌ Errors:');
  result.errors.forEach(err => console.log(`  - ${err}`));
}

if (result.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  result.warnings.forEach(warn => console.log(`  - ${warn}`));
}

if (result.valid) {
  console.log('\n✅ Dataset validation passed!');
  process.exit(0);
} else {
  console.log('\n❌ Dataset validation failed - fix errors before proceeding');
  process.exit(1);
}
