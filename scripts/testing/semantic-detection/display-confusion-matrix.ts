/**
 * Display confusion matrix for detailed error analysis
 *
 * Reads accuracy-report.json and displays confusion matrices
 * for both regex and semantic detection methods.
 *
 * Usage:
 *   npx tsx scripts/testing/semantic-detection/display-confusion-matrix.ts
 *
 * @since Beta 0.3
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ============================================
// Types
// ============================================

interface AccuracyReport {
  confusion_matrix: {
    regex: Record<string, Record<string, number>>;
    semantic: Record<string, Record<string, number>>;
  };
  total_cases: number;
  regex_accuracy: number;
  semantic_accuracy: number;
}

// ============================================
// Display Function
// ============================================

function displayConfusionMatrix(
  matrix: Record<string, Record<string, number>>,
  title: string
): void {
  console.log(`\n${title}\n`);

  const phases = Object.keys(matrix).sort();

  if (phases.length === 0) {
    console.log('No data available');
    return;
  }

  // Header row
  const header =
    'Expected'.padEnd(18) +
    phases
      .map(p => p.substring(0, 5).padEnd(7))
      .join('');
  console.log(header);
  console.log('-'.repeat(header.length));

  // Data rows
  phases.forEach(expectedPhase => {
    const row = expectedPhase.padEnd(18);
    const cells = phases.map(detectedPhase => {
      const count = matrix[expectedPhase]?.[detectedPhase] || 0;
      return count.toString().padEnd(7);
    });

    console.log(row + cells.join(''));
  });

  // Diagonal accuracy (correct predictions)
  console.log('\nDiagonal (correct predictions):');
  let totalCorrect = 0;
  phases.forEach(phase => {
    const correct = matrix[phase]?.[phase] || 0;
    totalCorrect += correct;
    if (correct > 0) {
      console.log(`  ${phase}: ${correct} cases`);
    }
  });
}

// ============================================
// Main Execution
// ============================================

const reportPath = join(__dirname, 'accuracy-report.json');

if (!existsSync(reportPath)) {
  console.error('❌ Error: accuracy-report.json not found');
  console.error('Please run compare-accuracy.ts first to generate the report');
  process.exit(1);
}

try {
  const reportContent = readFileSync(reportPath, 'utf-8');
  const accuracyReport: AccuracyReport = JSON.parse(reportContent);

  console.log('='.repeat(80));
  console.log('📊 CONFUSION MATRICES');
  console.log('='.repeat(80));

  console.log(`\nTotal Test Cases: ${accuracyReport.total_cases}`);
  console.log(`Regex Accuracy: ${accuracyReport.regex_accuracy.toFixed(2)}%`);
  console.log(`Semantic Accuracy: ${accuracyReport.semantic_accuracy.toFixed(2)}%`);

  displayConfusionMatrix(
    accuracyReport.confusion_matrix.regex,
    '🔤 REGEX CONFUSION MATRIX'
  );

  displayConfusionMatrix(
    accuracyReport.confusion_matrix.semantic,
    '🧠 SEMANTIC CONFUSION MATRIX'
  );

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 How to read confusion matrices:');
  console.log('   - Rows: Expected (ground truth) phase');
  console.log('   - Columns: Detected phase');
  console.log('   - Diagonal: Correct predictions');
  console.log('   - Off-diagonal: Misclassifications');
  console.log('='.repeat(80));
} catch (error) {
  console.error('❌ Error reading accuracy report:', error);
  process.exit(1);
}
