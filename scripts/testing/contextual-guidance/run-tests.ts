/**
 * Automated Testing Suite for Contextual Guidance
 *
 * Validates detection accuracy, retrieval quality, and token usage
 *
 * Part of: Task 4.3 - Testing & Tuning for Contextual Guidance
 * Run: tsx scripts/testing/contextual-guidance/run-tests.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { detectConfusionOrStuck } from '../../../src/lib/ai/contextual-guidance/detection';
import { getContextualGuidance } from '../../../src/lib/ai/contextual-guidance/retrieval';
import type { WorkflowPhase } from '../../../src/lib/types/academic-message';

// ===================================================================
// Load Test Dataset
// ===================================================================

interface TestCase {
  id: string;
  user_message: string;
  phase: WorkflowPhase;
  expected_trigger: boolean;
  expected_type: string | null;
  description: string;
}

interface TestDataset {
  metadata: {
    version: string;
    created: string;
    description: string;
    total_cases: number;
  };
  test_cases: TestCase[];
  summary: {
    total: number;
    expected_triggers: number;
    expected_no_triggers: number;
    trigger_rate: number;
  };
}

const datasetPath = resolve(__dirname, './test-dataset.json');
const testDataset: TestDataset = JSON.parse(
  readFileSync(datasetPath, 'utf-8')
);

// ===================================================================
// Test Metrics
// ===================================================================

interface TestResults {
  totalTests: number;
  detectionAccuracy: number;
  falsePositives: number;
  falseNegatives: number;
  avgRetrievalTime: number;
  avgTokenCount: number;
  triggerFrequency: number;
  passingTests: number;
  failingTests: TestCase[];
  retrievalAttempts: number;
  successfulRetrievals: number;
}

// ===================================================================
// Run Detection Tests
// ===================================================================

async function runDetectionTests(): Promise<TestResults> {
  const results: TestResults = {
    totalTests: 0,
    detectionAccuracy: 0,
    falsePositives: 0,
    falseNegatives: 0,
    avgRetrievalTime: 0,
    avgTokenCount: 0,
    triggerFrequency: 0,
    passingTests: 0,
    failingTests: [],
    retrievalAttempts: 0,
    successfulRetrievals: 0
  };

  let totalRetrievalTime = 0;
  let totalTokens = 0;
  let triggeredCount = 0;

  console.log('='.repeat(70));
  console.log('CONTEXTUAL GUIDANCE TEST SUITE');
  console.log('='.repeat(70));
  console.log(`Dataset: ${testDataset.metadata.description}`);
  console.log(`Version: ${testDataset.metadata.version}`);
  console.log(`Total test cases: ${testDataset.test_cases.length}`);
  console.log(`Expected triggers: ${testDataset.summary.expected_triggers}`);
  console.log('='.repeat(70));
  console.log('');

  for (const testCase of testDataset.test_cases) {
    results.totalTests++;

    // Run detection
    const detectionResult = await detectConfusionOrStuck(
      testCase.user_message,
      [],  // Empty history for isolated tests
      testCase.phase
    );

    // Validate detection
    const detected = detectionResult.needsGuidance;
    const expected = testCase.expected_trigger;

    const passed = detected === expected &&
      (detected ? detectionResult.triggerType === testCase.expected_type : true);

    if (passed) {
      results.passingTests++;
      console.log(`✓ [${testCase.id}] PASS`);
      console.log(`  ${testCase.description}`);
      console.log(`  Phase: ${testCase.phase}`);
      if (detected) {
        console.log(`  Trigger: ${detectionResult.triggerType} (confidence: ${detectionResult.confidence.toFixed(2)})`);
      }
    } else {
      results.failingTests.push(testCase);
      console.log(`✗ [${testCase.id}] FAIL`);
      console.log(`  ${testCase.description}`);
      console.log(`  Expected: trigger=${expected}, type=${testCase.expected_type}`);
      console.log(`  Got: trigger=${detected}, type=${detectionResult.triggerType}`);

      if (detected && !expected) {
        results.falsePositives++;
        console.log(`  → FALSE POSITIVE`);
      }
      if (!detected && expected) {
        results.falseNegatives++;
        console.log(`  → FALSE NEGATIVE`);
      }
    }

    // If triggered, test retrieval
    if (detected) {
      triggeredCount++;
      results.retrievalAttempts++;

      const startTime = Date.now();

      try {
        const guidanceResult = await getContextualGuidance(
          testCase.user_message,
          testCase.phase
        );

        const retrievalTime = Date.now() - startTime;
        totalRetrievalTime += retrievalTime;

        if (guidanceResult) {
          results.successfulRetrievals++;
          totalTokens += guidanceResult.totalTokens;
          console.log(`  → Retrieved ${guidanceResult.chunks.length} chunks (${guidanceResult.totalTokens} tokens, ${retrievalTime}ms)`);

          // Show chunk titles for verification
          guidanceResult.chunks.forEach((chunk, i) => {
            console.log(`     ${i + 1}. [${chunk.chunk_type}] ${chunk.title} (similarity: ${chunk.similarity.toFixed(3)})`);
          });
        } else {
          console.log(`  → No guidance retrieved (detection triggered but retrieval returned null)`);
        }
      } catch (error) {
        console.log(`  → Retrieval error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('');
  }

  // Calculate metrics
  results.detectionAccuracy = (results.passingTests / results.totalTests) * 100;
  results.triggerFrequency = (triggeredCount / results.totalTests) * 100;
  results.avgRetrievalTime = results.successfulRetrievals > 0
    ? totalRetrievalTime / results.successfulRetrievals
    : 0;
  results.avgTokenCount = results.successfulRetrievals > 0
    ? totalTokens / results.successfulRetrievals
    : 0;

  return results;
}

// ===================================================================
// Print Results
// ===================================================================

function printResults(results: TestResults) {
  console.log('='.repeat(70));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  // Detection Metrics
  console.log('DETECTION METRICS:');
  console.log(`  Total Tests: ${results.totalTests}`);
  console.log(`  Passing: ${results.passingTests} (${results.detectionAccuracy.toFixed(1)}%)`);
  console.log(`  Failing: ${results.failingTests.length}`);
  console.log(`  False Positives: ${results.falsePositives} (${(results.falsePositives / results.totalTests * 100).toFixed(1)}%)`);
  console.log(`  False Negatives: ${results.falseNegatives} (${(results.falseNegatives / results.totalTests * 100).toFixed(1)}%)`);
  console.log('');

  // Trigger Frequency
  console.log('TRIGGER FREQUENCY:');
  console.log(`  Trigger Rate: ${results.triggerFrequency.toFixed(1)}%`);
  console.log(`  Note: Test dataset has 52% trigger rate (higher than production 10% target)`);
  console.log('');

  // Retrieval Metrics
  console.log('RETRIEVAL METRICS:');
  console.log(`  Retrieval Attempts: ${results.retrievalAttempts}`);
  console.log(`  Successful Retrievals: ${results.successfulRetrievals}`);
  console.log(`  Avg Retrieval Time: ${results.avgRetrievalTime.toFixed(0)}ms`);
  console.log(`  Avg Token Count: ${results.avgTokenCount.toFixed(0)} tokens`);
  console.log('');

  // Target Validation
  console.log('='.repeat(70));
  console.log('TARGET VALIDATION');
  console.log('='.repeat(70));

  const targetsMet = {
    accuracy: results.detectionAccuracy >= 90,
    falsePositiveRate: (results.falsePositives / results.totalTests * 100) < 10,
    falseNegativeRate: (results.falseNegatives / results.totalTests * 100) < 10,
    retrievalTime: results.avgRetrievalTime < 200,
    tokenCount: results.avgTokenCount < 350
  };

  console.log(`${targetsMet.accuracy ? '✓' : '✗'} Detection Accuracy ≥90%: ${results.detectionAccuracy.toFixed(1)}% ${targetsMet.accuracy ? 'PASS' : 'FAIL'}`);
  console.log(`${targetsMet.falsePositiveRate ? '✓' : '✗'} False Positive Rate <10%: ${(results.falsePositives / results.totalTests * 100).toFixed(1)}% ${targetsMet.falsePositiveRate ? 'PASS' : 'FAIL'}`);
  console.log(`${targetsMet.falseNegativeRate ? '✓' : '✗'} False Negative Rate <10%: ${(results.falseNegatives / results.totalTests * 100).toFixed(1)}% ${targetsMet.falseNegativeRate ? 'PASS' : 'FAIL'}`);
  console.log(`${targetsMet.retrievalTime ? '✓' : '✗'} Avg Retrieval Time <200ms: ${results.avgRetrievalTime.toFixed(0)}ms ${targetsMet.retrievalTime ? 'PASS' : 'FAIL'}`);
  console.log(`${targetsMet.tokenCount ? '✓' : '✗'} Avg Token Count <350: ${results.avgTokenCount.toFixed(0)} tokens ${targetsMet.tokenCount ? 'PASS' : 'FAIL'}`);
  console.log('');

  // Failing Tests Detail
  if (results.failingTests.length > 0) {
    console.log('='.repeat(70));
    console.log('FAILING TESTS DETAIL');
    console.log('='.repeat(70));
    results.failingTests.forEach(test => {
      console.log(`- [${test.id}] ${test.description}`);
      console.log(`  User message: "${test.user_message}"`);
      console.log(`  Phase: ${test.phase}`);
      console.log(`  Expected: trigger=${test.expected_trigger}, type=${test.expected_type}`);
      console.log('');
    });
  }

  console.log('='.repeat(70));

  // Overall Pass/Fail
  const allTargetsMet = Object.values(targetsMet).every(v => v);
  if (allTargetsMet) {
    console.log('✓ ALL TARGETS MET - TEST SUITE PASSED');
  } else {
    console.log('✗ SOME TARGETS NOT MET - TEST SUITE FAILED');
  }
  console.log('='.repeat(70));

  return allTargetsMet;
}

// ===================================================================
// Main
// ===================================================================

async function main() {
  try {
    console.log('Starting test suite...\n');

    const results = await runDetectionTests();
    const allTargetsMet = printResults(results);

    // Exit with error if targets not met
    process.exit(allTargetsMet ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

main();
