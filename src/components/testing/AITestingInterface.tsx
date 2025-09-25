'use client';

/**
 * AITestingInterface - Interface untuk comprehensive AI functionality testing
 * 
 * PURPOSE:
 * - Enable testing dari all 7-phase academic workflow transitions  
 * - Support testing dari approval gate interactions dan human feedback loops
 * - Provide clear testing feedback untuk AI tool integrations dan responses
 * - Enable rapid iteration testing untuk prompt engineering optimization
 * - Support concurrent testing dari multiple AI configurations
 */

import React, { useState, useCallback } from 'react';
import { AcademicUIMessage } from '../chat/ChatContainer';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  phase: number;
  expectedBehavior: string;
  testData: {
    input: string;
    expectedOutputType: 'artifact' | 'approval' | 'research' | 'error';
    mockResponse?: Partial<AcademicUIMessage>;
  };
}

interface TestResult {
  scenarioId: string;
  success: boolean;
  duration: number;
  timestamp: number;
  response?: AcademicUIMessage;
  error?: string;
  metadata?: Record<string, any>;
}

interface AITestingInterfaceProps {
  onRunTest: (scenario: TestScenario) => Promise<TestResult>;
  onClearResults?: () => void;
  className?: string;
}

// Predefined test scenarios untuk academic workflow validation
const DEFAULT_TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'phase-1-topic-definition',
    name: 'Fase 1: Definisi Topik',
    description: 'Test topic clarification dan initial research direction',
    phase: 1,
    expectedBehavior: 'Should generate topic definition artifact dan trigger approval gate',
    testData: {
      input: 'Saya ingin meneliti tentang dampak AI terhadap pendidikan',
      expectedOutputType: 'artifact',
    },
  },
  {
    id: 'phase-2-research-foundation',
    name: 'Fase 2: Fondasi Penelitian',
    description: 'Test literature search dan theoretical framework building',
    phase: 2,
    expectedBehavior: 'Should search academic sources dan build research foundation',
    testData: {
      input: 'Lanjutkan dengan pencarian literatur untuk topik ini',
      expectedOutputType: 'research',
    },
  },
  {
    id: 'approval-gate-interaction',
    name: 'Approval Gate: User Interaction',
    description: 'Test approval gate presentation dan user feedback handling',
    phase: 1,
    expectedBehavior: 'Should present approval options dan handle user decisions',
    testData: {
      input: 'Approve the topic definition with minor revisions',
      expectedOutputType: 'approval',
    },
  },
  {
    id: 'tool-integration-search',
    name: 'Tool Integration: Web Search',
    description: 'Test web search tool integration dan result processing',
    phase: 2,
    expectedBehavior: 'Should execute web search dan integrate findings',
    testData: {
      input: 'Search for recent papers about AI in education',
      expectedOutputType: 'research',
    },
  },
  {
    id: 'error-handling-invalid-input',
    name: 'Error Handling: Invalid Input',
    description: 'Test system response to invalid atau unclear inputs',
    phase: 1,
    expectedBehavior: 'Should gracefully handle errors dan provide helpful feedback',
    testData: {
      input: 'asdasd random invalid input 12345',
      expectedOutputType: 'error',
    },
  },
];

export const AITestingInterface: React.FC<AITestingInterfaceProps> = ({
  onRunTest,
  onClearResults,
  className = '',
}) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Run single test scenario
  const runSingleTest = useCallback(async (scenario: TestScenario) => {
    setRunningTests(prev => new Set([...prev, scenario.id]));
    
    try {
      const result = await onRunTest(scenario);
      setTestResults(prev => [result, ...prev]);
    } catch (error) {
      const failureResult: TestResult = {
        scenarioId: scenario.id,
        success: false,
        duration: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      setTestResults(prev => [failureResult, ...prev]);
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(scenario.id);
        return newSet;
      });
    }
  }, [onRunTest]);

  // Run multiple selected tests
  const runSelectedTests = useCallback(async () => {
    const scenariosToRun = DEFAULT_TEST_SCENARIOS.filter(scenario => 
      selectedScenarios.has(scenario.id)
    );
    
    for (const scenario of scenariosToRun) {
      await runSingleTest(scenario);
      // Small delay between tests untuk avoid overwhelming system
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, [selectedScenarios, runSingleTest]);

  // Run custom test with user input
  const runCustomTest = useCallback(async () => {
    if (!customInput.trim()) return;
    
    const customScenario: TestScenario = {
      id: `custom-${Date.now()}`,
      name: 'Custom Test',
      description: 'User-defined test scenario',
      phase: 1,
      expectedBehavior: 'User-defined behavior',
      testData: {
        input: customInput.trim(),
        expectedOutputType: 'artifact',
      },
    };
    
    await runSingleTest(customScenario);
    setCustomInput('');
  }, [customInput, runSingleTest]);

  // Toggle scenario selection
  const toggleScenario = (scenarioId: string) => {
    setSelectedScenarios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scenarioId)) {
        newSet.delete(scenarioId);
      } else {
        newSet.add(scenarioId);
      }
      return newSet;
    });
  };

  // Clear all results
  const handleClearResults = () => {
    setTestResults([]);
    if (onClearResults) {
      onClearResults();
    }
  };

  // Get test result statistics
  const getStats = () => {
    const total = testResults.length;
    const passed = testResults.filter(r => r.success).length;
    const failed = total - passed;
    const avgDuration = total > 0 ? 
      testResults.reduce((sum, r) => sum + r.duration, 0) / total : 0;
    
    return { total, passed, failed, avgDuration };
  };

  const stats = getStats();

  return (
    <div className={`ai-testing-interface bg-secondary border border-gray-200 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="testing-header mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          🧪 AI Testing Interface
        </h3>
        <p className="text-gray-600 leading-relaxed">
          Test comprehensive AI functionality, workflow transitions, dan approval gate interactions 
          untuk ensure system reliability dan performance.
        </p>
      </div>

      {/* Quick Stats */}
      {testResults.length > 0 && (
        <div className="test-stats mb-6 grid grid-cols-4 gap-4">
          <div className="stat-card bg-primary p-3 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Tests</div>
          </div>
          <div className="stat-card bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{stats.passed}</div>
            <div className="text-sm text-green-600">Passed</div>
          </div>
          <div className="stat-card bg-red-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
          <div className="stat-card bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{stats.avgDuration.toFixed(0)}ms</div>
            <div className="text-sm text-blue-600">Avg Duration</div>
          </div>
        </div>
      )}

      {/* Test Scenarios */}
      <div className="test-scenarios mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-700">Predefined Test Scenarios</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedScenarios(new Set(DEFAULT_TEST_SCENARIOS.map(s => s.id)))}
              className="btn-secondary text-sm px-3 py-1"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedScenarios(new Set())}
              className="btn-secondary text-sm px-3 py-1"
            >
              Clear Selection
            </button>
          </div>
        </div>

        <div className="scenarios-grid grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_TEST_SCENARIOS.map((scenario) => {
            const isSelected = selectedScenarios.has(scenario.id);
            const isRunning = runningTests.has(scenario.id);
            const lastResult = testResults.find(r => r.scenarioId === scenario.id);
            
            return (
              <div
                key={scenario.id}
                className={`scenario-card border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleScenario(scenario.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="rounded border-gray-300"
                      />
                      <h5 className="font-medium text-gray-800">{scenario.name}</h5>
                      <div className="phase-badge bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                        Fase {scenario.phase}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                    <p className="text-xs text-gray-500 italic">{scenario.expectedBehavior}</p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 ml-3">
                    {lastResult && (
                      <div className={`result-indicator w-3 h-3 rounded-full ${
                        lastResult.success ? 'bg-green-500' : 'bg-red-500'
                      }`} title={lastResult.success ? 'Last test passed' : 'Last test failed'}></div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runSingleTest(scenario);
                      }}
                      disabled={isRunning}
                      className="btn-primary text-xs px-2 py-1 disabled:opacity-50"
                    >
                      {isRunning ? '⏳' : '▶️'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Test Input */}
      <div className="custom-test mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Custom Test Input</h4>
        <div className="flex gap-3">
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Enter custom test input untuk test AI response..."
            className="flex-1 p-3 border border-gray-200 rounded-lg resize-none"
            rows={3}
          />
          <button
            onClick={runCustomTest}
            disabled={!customInput.trim() || runningTests.size > 0}
            className="btn-primary px-4 py-2 disabled:opacity-50"
          >
            🚀 Run Custom Test
          </button>
        </div>
      </div>

      {/* Batch Actions */}
      <div className="batch-actions mb-6 flex gap-3">
        <button
          onClick={runSelectedTests}
          disabled={selectedScenarios.size === 0 || runningTests.size > 0}
          className="btn-primary px-6 py-2 disabled:opacity-50"
        >
          ▶️ Run Selected Tests ({selectedScenarios.size})
        </button>
        
        <button
          onClick={handleClearResults}
          disabled={testResults.length === 0}
          className="btn-secondary px-4 py-2 disabled:opacity-50"
        >
          🗑️ Clear Results
        </button>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn-secondary px-4 py-2"
        >
          ⚙️ Advanced
        </button>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="advanced-settings mb-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium text-gray-700 mb-3">Advanced Test Settings</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Verbose logging</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Include metadata</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Test parallel execution</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span>Stress test mode</span>
            </label>
          </div>
        </div>
      )}

      {/* Running Indicator */}
      {runningTests.size > 0 && (
        <div className="running-indicator mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <div className="animate-spin">⟳</div>
            <span>Running {runningTests.size} test(s)...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITestingInterface;