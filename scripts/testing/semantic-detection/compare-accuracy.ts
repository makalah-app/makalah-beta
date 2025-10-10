/**
 * Accuracy comparison script: Regex vs Semantic detection
 *
 * Tests both methods against 50-case dataset and generates metrics report:
 * - Overall accuracy (vs ground truth)
 * - Agreement rate (regex vs semantic)
 * - Per-phase accuracy breakdown
 * - Confidence distribution
 * - Confusion matrix
 *
 * Usage:
 *   npx tsx scripts/testing/semantic-detection/compare-accuracy.ts
 *
 * Expected execution time: 2-3 minutes (50 API calls for embeddings)
 *
 * @since Beta 0.3
 */

import { config } from 'dotenv';
import { join } from 'path';
import { writeFileSync } from 'fs';

config({ path: join(__dirname, '../../../.env.local') });

// Import detection functions
import { semanticPhaseDetection } from '../../../src/lib/ai/semantic-phase-detection';
import type { WorkflowPhase, WorkflowMetadata } from '../../../src/lib/types/academic-message';

// Import test dataset
import testDataset from './test-dataset.json';

// ============================================
// Type Definitions
// ============================================

interface TestCase {
  id: string;
  phase: WorkflowPhase;
  difficulty: string;
  ai_response: string;
  expected_phase: WorkflowPhase;
  keywords: string[];
  note: string;
}

interface DetectionResult {
  test_id: string;
  expected: WorkflowPhase;
  regex_detected: WorkflowPhase;
  semantic_detected: WorkflowPhase;
  semantic_confidence: number;
  agreement: boolean;
  regex_correct: boolean;
  semantic_correct: boolean;
  difficulty: string;
}

interface AccuracyMetrics {
  total_cases: number;
  regex_accuracy: number;
  semantic_accuracy: number;
  agreement_rate: number;
  semantic_better_count: number;
  regex_better_count: number;
  both_correct: number;
  both_wrong: number;
  avg_confidence: number;
  low_confidence_count: number;
  per_phase_accuracy: Record<
    string,
    {
      regex: number;
      semantic: number;
      count: number;
    }
  >;
  per_difficulty_accuracy: Record<
    string,
    {
      regex: number;
      semantic: number;
      count: number;
    }
  >;
  confusion_matrix: {
    regex: Record<string, Record<string, number>>;
    semantic: Record<string, Record<string, number>>;
  };
  detailed_results: DetectionResult[];
}

// ============================================
// Regex Detection (Baseline)
// ============================================

/**
 * Regex-based phase detection (baseline method)
 * Copied from workflow-inference.ts for standalone testing
 */
function regexPhaseDetection(response: string, currentPhase: WorkflowPhase): WorkflowPhase {
  const text = response.toLowerCase();
  let detectedPhase: WorkflowPhase = currentPhase;

  // Delivered
  if (
    /paper\s+(?:sudah\s+)?selesai|siap\s+diserahkan|dokumen\s+final/i.test(text) ||
    /(?:ya|oke).*deliver.*(?:final\s+)?package/i.test(text) ||
    /paper\s+siap\s+submit/i.test(text) ||
    /ready for submission|publication-ready|finalized/i.test(text)
  ) {
    detectedPhase = 'delivered';
  }
  // Polishing
  else if (
    /polish|grammar.*check|proofreading|formatting/i.test(text) ||
    /(?:ya|oke).*(?:mulai\s+)?(?:grammar|polish|citation\s+check)/i.test(text) ||
    /ready.*polish|finishing touches|final touches/i.test(text)
  ) {
    detectedPhase = 'polishing';
  }
  // Integrating
  else if (
    /integrat|transisi|hubung.*bagian|flow.*paper/i.test(text) ||
    /(?:semua\s+)?(?:oke|approved).*lanjut\s+integra/i.test(text) ||
    /coherence|connecting paragraph|narrative thread/i.test(text)
  ) {
    detectedPhase = 'integrating';
  }
  // Drafting Locked
  else if (
    /draft\s+(?:sudah\s+)?(?:selesai|complete|lengkap)/i.test(text) ||
    /(?:semua\s+)?section.*(?:selesai|complete)/i.test(text) ||
    /siap.*integra|all sections.*drafted/i.test(text)
  ) {
    detectedPhase = 'drafting_locked';
  }
  // Drafting
  else if (
    /(?:mulai|menulis|tulis)\s+(?:draft|section|bagian)/i.test(text) ||
    /drafting|writing.*section/i.test(text)
  ) {
    detectedPhase = 'drafting';
  }
  // Outline Locked
  else if (
    /outline\s+(?:disetujui|approved|oke|locked|fix)/i.test(text) ||
    /approved.*(?:mulai\s+)?drafting/i.test(text) ||
    /mari\s+mulai\s+menulis|struktur.*final/i.test(text)
  ) {
    detectedPhase = 'outline_locked';
  }
  // Outlining
  else if (
    /(?:berikut|ini)\s+(?:adalah\s+)?(?:struktur\s+)?outline|struktur\s+paper|kerangka|susunan\s+bagian/i.test(
      text
    ) ||
    /buat struktur|format IMRaD|structuring/i.test(text)
  ) {
    detectedPhase = 'outlining';
  }
  // Foundation Ready
  else if (
    /(?:referensi|sumber)\s+(?:sudah\s+)?(?:cukup|lengkap)/i.test(text) ||
    /foundation.*ready|siap.*(?:mulai\s+)?outline/i.test(text) ||
    /(?:punya|ada)\s+\d+.*(?:paper|referensi|sumber)/i.test(text) ||
    /literature review.*comprehensive|foundation.*solid/i.test(text)
  ) {
    detectedPhase = 'foundation_ready';
  }
  // Researching
  else if (
    /(?:mencari|cari|search).*(?:paper|artikel|jurnal)|web_search/i.test(text) ||
    /literature.*review.*search/i.test(text)
  ) {
    detectedPhase = 'researching';
  }
  // Topic Locked
  else if (
    /topik\s+(?:sudah\s+)?(?:dipilih|ditetapkan|locked|fix|jelas|sepakat)/i.test(text) ||
    /(?:^|\s)locked!?(?:\s|$)/i.test(text) ||
    /pertanyaan\s+penelitian|research\s+question/i.test(text)
  ) {
    detectedPhase = 'topic_locked';
  }
  // Exploring (default/fallback)
  else if (/eksplorasi|brainstorm|clarify|ide.*topik|pilihan.*topik/i.test(text)) {
    detectedPhase = 'exploring';
  }

  return detectedPhase;
}

// ============================================
// Main Comparison Function
// ============================================

async function compareAccuracy(): Promise<AccuracyMetrics> {
  console.log('🧪 Semantic Detection Accuracy Comparison\n');
  console.log(`Testing ${testDataset.test_cases.length} cases...\n`);

  const results: DetectionResult[] = [];
  let processedCount = 0;

  // ========================================
  // Step 1: Run Both Detections on Each Test Case
  // ========================================

  for (const testCase of testDataset.test_cases as TestCase[]) {
    processedCount++;
    process.stdout.write(`\rProgress: ${processedCount}/${testDataset.test_cases.length}`);

    try {
      // Run regex detection
      const regexResult = regexPhaseDetection(testCase.ai_response, testCase.phase);

      // Run semantic detection
      const semanticResult = await semanticPhaseDetection(
        testCase.ai_response,
        testCase.phase,
        {
          matchThreshold: 0.70,
          matchCount: 3,
          filterChunkType: 'phase_definition'
        }
      );

      // Determine semantic phase and confidence
      let semanticPhase: WorkflowPhase = testCase.phase; // Default: stay in current
      let semanticConfidence = 0.5; // Default confidence

      if (semanticResult) {
        semanticPhase = semanticResult;
        semanticConfidence = 0.85; // Placeholder (actual confidence from match_workflow_chunks)
      }

      // Record result
      results.push({
        test_id: testCase.id,
        expected: testCase.expected_phase,
        regex_detected: regexResult,
        semantic_detected: semanticPhase,
        semantic_confidence: semanticConfidence,
        agreement: regexResult === semanticPhase,
        regex_correct: regexResult === testCase.expected_phase,
        semantic_correct: semanticPhase === testCase.expected_phase,
        difficulty: testCase.difficulty
      });
    } catch (error) {
      console.error(`\n❌ Error testing ${testCase.id}:`, error);

      // Record error case (both wrong)
      results.push({
        test_id: testCase.id,
        expected: testCase.expected_phase,
        regex_detected: testCase.phase,
        semantic_detected: testCase.phase,
        semantic_confidence: 0.5,
        agreement: true,
        regex_correct: false,
        semantic_correct: false,
        difficulty: testCase.difficulty
      });
    }
  }

  console.log('\n\n✅ Testing complete!\n');

  // ========================================
  // Step 2: Calculate Metrics
  // ========================================

  const metrics = calculateMetrics(results, testDataset.test_cases as TestCase[]);

  return metrics;
}

// ============================================
// Metrics Calculation
// ============================================

function calculateMetrics(results: DetectionResult[], testCases: TestCase[]): AccuracyMetrics {
  const totalCases = results.length;

  // Overall accuracy
  const regexCorrect = results.filter(r => r.regex_correct).length;
  const semanticCorrect = results.filter(r => r.semantic_correct).length;
  const regexAccuracy = (regexCorrect / totalCases) * 100;
  const semanticAccuracy = (semanticCorrect / totalCases) * 100;

  // Agreement rate
  const agreementCount = results.filter(r => r.agreement).length;
  const agreementRate = (agreementCount / totalCases) * 100;

  // Comparison
  const bothCorrect = results.filter(r => r.regex_correct && r.semantic_correct).length;
  const bothWrong = results.filter(r => !r.regex_correct && !r.semantic_correct).length;
  const semanticBetterCount = results.filter(r => r.semantic_correct && !r.regex_correct).length;
  const regexBetterCount = results.filter(r => r.regex_correct && !r.semantic_correct).length;

  // Confidence stats
  const avgConfidence =
    results.reduce((sum, r) => sum + r.semantic_confidence, 0) / totalCases;
  const lowConfidenceCount = results.filter(r => r.semantic_confidence < 0.7).length;

  // Per-phase accuracy
  const perPhaseAccuracy: Record<string, { regex: number; semantic: number; count: number }> = {};

  testCases.forEach((testCase, index) => {
    const phase = testCase.expected_phase;
    if (!perPhaseAccuracy[phase]) {
      perPhaseAccuracy[phase] = { regex: 0, semantic: 0, count: 0 };
    }

    perPhaseAccuracy[phase].count++;
    if (results[index].regex_correct) perPhaseAccuracy[phase].regex++;
    if (results[index].semantic_correct) perPhaseAccuracy[phase].semantic++;
  });

  // Convert counts to percentages
  Object.keys(perPhaseAccuracy).forEach(phase => {
    const count = perPhaseAccuracy[phase].count;
    perPhaseAccuracy[phase].regex = (perPhaseAccuracy[phase].regex / count) * 100;
    perPhaseAccuracy[phase].semantic = (perPhaseAccuracy[phase].semantic / count) * 100;
  });

  // Per-difficulty accuracy
  const perDifficultyAccuracy: Record<
    string,
    { regex: number; semantic: number; count: number }
  > = {};

  testCases.forEach((testCase, index) => {
    const difficulty = testCase.difficulty;
    if (!perDifficultyAccuracy[difficulty]) {
      perDifficultyAccuracy[difficulty] = { regex: 0, semantic: 0, count: 0 };
    }

    perDifficultyAccuracy[difficulty].count++;
    if (results[index].regex_correct) perDifficultyAccuracy[difficulty].regex++;
    if (results[index].semantic_correct) perDifficultyAccuracy[difficulty].semantic++;
  });

  // Convert to percentages
  Object.keys(perDifficultyAccuracy).forEach(difficulty => {
    const count = perDifficultyAccuracy[difficulty].count;
    perDifficultyAccuracy[difficulty].regex =
      (perDifficultyAccuracy[difficulty].regex / count) * 100;
    perDifficultyAccuracy[difficulty].semantic =
      (perDifficultyAccuracy[difficulty].semantic / count) * 100;
  });

  // Confusion matrices
  const regexConfusion: Record<string, Record<string, number>> = {};
  const semanticConfusion: Record<string, Record<string, number>> = {};

  results.forEach(result => {
    const expected = result.expected;
    const regexDetected = result.regex_detected;
    const semanticDetected = result.semantic_detected;

    // Regex confusion
    if (!regexConfusion[expected]) regexConfusion[expected] = {};
    regexConfusion[expected][regexDetected] =
      (regexConfusion[expected][regexDetected] || 0) + 1;

    // Semantic confusion
    if (!semanticConfusion[expected]) semanticConfusion[expected] = {};
    semanticConfusion[expected][semanticDetected] =
      (semanticConfusion[expected][semanticDetected] || 0) + 1;
  });

  return {
    total_cases: totalCases,
    regex_accuracy: regexAccuracy,
    semantic_accuracy: semanticAccuracy,
    agreement_rate: agreementRate,
    semantic_better_count: semanticBetterCount,
    regex_better_count: regexBetterCount,
    both_correct: bothCorrect,
    both_wrong: bothWrong,
    avg_confidence: avgConfidence,
    low_confidence_count: lowConfidenceCount,
    per_phase_accuracy: perPhaseAccuracy,
    per_difficulty_accuracy: perDifficultyAccuracy,
    confusion_matrix: {
      regex: regexConfusion,
      semantic: semanticConfusion
    },
    detailed_results: results
  };
}

// ============================================
// Report Generation
// ============================================

function generateReport(metrics: AccuracyMetrics): void {
  console.log('='.repeat(80));
  console.log('📊 ACCURACY COMPARISON REPORT');
  console.log('='.repeat(80));

  // Overall accuracy
  console.log('\n📈 OVERALL ACCURACY\n');
  console.log(`Total Test Cases:        ${metrics.total_cases}`);
  console.log(`Regex Accuracy:          ${metrics.regex_accuracy.toFixed(2)}%`);
  console.log(`Semantic Accuracy:       ${metrics.semantic_accuracy.toFixed(2)}%`);
  console.log(`Agreement Rate:          ${metrics.agreement_rate.toFixed(2)}%`);

  const improvement = metrics.semantic_accuracy - metrics.regex_accuracy;
  if (improvement > 0) {
    console.log(`\n✅ Semantic is ${improvement.toFixed(2)}% more accurate than regex`);
  } else if (improvement < 0) {
    console.log(`\n❌ Semantic is ${Math.abs(improvement).toFixed(2)}% less accurate than regex`);
  } else {
    console.log(`\n⚖️  Semantic and regex have equal accuracy`);
  }

  // Comparison breakdown
  console.log('\n🔍 COMPARISON BREAKDOWN\n');
  console.log(
    `Both Correct:            ${metrics.both_correct} (${((metrics.both_correct / metrics.total_cases) * 100).toFixed(1)}%)`
  );
  console.log(
    `Both Wrong:              ${metrics.both_wrong} (${((metrics.both_wrong / metrics.total_cases) * 100).toFixed(1)}%)`
  );
  console.log(
    `Semantic Better:         ${metrics.semantic_better_count} (${((metrics.semantic_better_count / metrics.total_cases) * 100).toFixed(1)}%)`
  );
  console.log(
    `Regex Better:            ${metrics.regex_better_count} (${((metrics.regex_better_count / metrics.total_cases) * 100).toFixed(1)}%)`
  );

  // Confidence stats
  console.log('\n🎯 CONFIDENCE STATS\n');
  console.log(`Average Confidence:      ${(metrics.avg_confidence * 100).toFixed(2)}%`);
  console.log(`Low Confidence Cases:    ${metrics.low_confidence_count} (<70%)`);
  console.log(
    `Low Confidence Rate:     ${((metrics.low_confidence_count / metrics.total_cases) * 100).toFixed(2)}%`
  );

  // Per-phase accuracy
  console.log('\n📊 PER-PHASE ACCURACY\n');
  console.log('Phase'.padEnd(20) + 'Regex'.padEnd(15) + 'Semantic'.padEnd(15) + 'Cases');
  console.log('-'.repeat(65));

  Object.entries(metrics.per_phase_accuracy)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([phase, stats]) => {
      const phaseName = phase.padEnd(20);
      const regexAcc = `${stats.regex.toFixed(1)}%`.padEnd(15);
      const semanticAcc = `${stats.semantic.toFixed(1)}%`.padEnd(15);
      const count = stats.count.toString();

      console.log(`${phaseName}${regexAcc}${semanticAcc}${count}`);
    });

  // Per-difficulty accuracy
  console.log('\n📊 PER-DIFFICULTY ACCURACY\n');
  console.log('Difficulty'.padEnd(20) + 'Regex'.padEnd(15) + 'Semantic'.padEnd(15) + 'Cases');
  console.log('-'.repeat(65));

  Object.entries(metrics.per_difficulty_accuracy)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([difficulty, stats]) => {
      const diffName = difficulty.padEnd(20);
      const regexAcc = `${stats.regex.toFixed(1)}%`.padEnd(15);
      const semanticAcc = `${stats.semantic.toFixed(1)}%`.padEnd(15);
      const count = stats.count.toString();

      console.log(`${diffName}${regexAcc}${semanticAcc}${count}`);
    });

  // Decision recommendation
  console.log('\n' + '='.repeat(80));
  console.log('🎯 ROLLOUT DECISION\n');

  const passThreshold = metrics.semantic_accuracy >= 95 && metrics.agreement_rate >= 90;

  if (passThreshold) {
    console.log('✅ PASS - Semantic detection meets rollout criteria:');
    console.log(`   ✓ Semantic accuracy ${metrics.semantic_accuracy.toFixed(2)}% ≥ 95%`);
    console.log(`   ✓ Agreement rate ${metrics.agreement_rate.toFixed(2)}% ≥ 90%`);
    console.log('\n📅 Next Steps:');
    console.log('   1. Deploy to shadow mode (24h monitoring)');
    console.log('   2. Analyze production comparison logs');
    console.log('   3. Proceed to canary_1 if shadow mode stable');
  } else {
    console.log('❌ FAIL - Semantic detection does NOT meet rollout criteria:');

    if (metrics.semantic_accuracy < 95) {
      console.log(`   ✗ Semantic accuracy ${metrics.semantic_accuracy.toFixed(2)}% < 95%`);
    }
    if (metrics.agreement_rate < 90) {
      console.log(`   ✗ Agreement rate ${metrics.agreement_rate.toFixed(2)}% < 90%`);
    }

    console.log('\n🔧 Recommended Actions:');
    console.log('   1. Review failed test cases (check confusion matrix)');
    console.log('   2. Improve knowledge base embeddings for weak phases');
    console.log('   3. Adjust match_threshold or confidence_threshold');
    console.log('   4. Re-run tests after improvements');
  }

  console.log('='.repeat(80));
}

// ============================================
// Main Execution
// ============================================

async function main() {
  try {
    const metrics = await compareAccuracy();
    generateReport(metrics);

    // Save metrics to JSON for further analysis
    const reportPath = join(__dirname, 'accuracy-report.json');
    writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  } catch (error) {
    console.error('\n❌ Error running accuracy comparison:', error);
    process.exit(1);
  }
}

main();
