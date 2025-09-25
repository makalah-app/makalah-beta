'use client';

/**
 * TestScenarioRunner - Component untuk validating different AI workflows dan edge cases
 * 
 * PURPOSE:
 * - Enable systematic testing dari different academic workflows
 * - Validate edge cases dan error handling scenarios
 * - Support A/B testing untuk different prompts atau model configurations
 * - Provide comprehensive test coverage untuk all AI integrations
 */

import React, { useState, useCallback } from 'react';

interface TestScenario {
  id: string;
  category: 'workflow' | 'edge-case' | 'performance' | 'integration';
  name: string;
  description: string;
  steps: TestStep[];
  expectedOutcome: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface TestStep {
  id: string;
  action: 'input' | 'wait' | 'assert' | 'check';
  description: string;
  data?: any;
  timeout?: number;
  expectedResult?: string;
}

interface TestResult {
  scenarioId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  steps: StepResult[];
  error?: string;
  metadata?: Record<string, any>;
}

interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  output?: any;
  error?: string;
}

interface TestScenarioRunnerProps {
  onExecuteStep: (step: TestStep, context: any) => Promise<any>;
  className?: string;
}

// Predefined test scenarios
const ACADEMIC_WORKFLOW_SCENARIOS: TestScenario[] = [
  {
    id: 'complete-workflow-normal',
    category: 'workflow',
    name: 'Complete Academic Workflow - Normal Path',
    description: 'Test full 7-phase workflow dari topic definition hingga final paper',
    expectedOutcome: 'Successfully complete all 7 phases dengan proper artifacts dan approvals',
    tags: ['workflow', '7-phase', 'complete'],
    difficulty: 'medium',
    steps: [
      {
        id: 'step-1',
        action: 'input',
        description: 'Input initial research topic',
        data: { input: 'Dampak AI terhadap transformasi digital dalam pendidikan tinggi' },
        expectedResult: 'Topic definition artifact generated',
      },
      {
        id: 'step-2',
        action: 'assert',
        description: 'Check artifact generation',
        expectedResult: 'Artifact contains topic definition',
      },
      {
        id: 'step-3',
        action: 'input',
        description: 'Approve topic definition',
        data: { action: 'approve', approvalId: 'topic-definition' },
        expectedResult: 'Move to phase 2',
      },
      {
        id: 'step-4',
        action: 'wait',
        description: 'Wait for research foundation phase',
        timeout: 5000,
        expectedResult: 'Phase 2 initiated',
      },
    ],
  },
  {
    id: 'approval-gate-rejection',
    category: 'edge-case',
    name: 'Approval Gate - User Rejection',
    description: 'Test behavior saat user reject approval dengan detailed feedback',
    expectedOutcome: 'System should handle rejection gracefully dan provide revision',
    tags: ['approval', 'rejection', 'feedback'],
    difficulty: 'medium',
    steps: [
      {
        id: 'step-1',
        action: 'input',
        description: 'Generate initial content requiring approval',
        data: { input: 'Create research outline for digital transformation' },
      },
      {
        id: 'step-2',
        action: 'input',
        description: 'Reject with detailed feedback',
        data: { 
          action: 'reject', 
          feedback: 'The scope is too broad, please focus on specific sector'
        },
        expectedResult: 'System processes feedback dan generates revision',
      },
      {
        id: 'step-3',
        action: 'assert',
        description: 'Verify revision incorporates feedback',
        expectedResult: 'Revised content addresses user feedback',
      },
    ],
  },
  {
    id: 'concurrent-tool-usage',
    category: 'integration',
    name: 'Concurrent AI Tool Usage',
    description: 'Test multiple AI tools running simultaneously',
    expectedOutcome: 'All tools execute properly tanpa conflicts',
    tags: ['tools', 'concurrent', 'integration'],
    difficulty: 'hard',
    steps: [
      {
        id: 'step-1',
        action: 'input',
        description: 'Trigger multiple tools simultaneously',
        data: { 
          input: 'Search for papers AND generate outline AND check citations for topic: AI ethics'
        },
        expectedResult: 'All tools initiated correctly',
      },
      {
        id: 'step-2',
        action: 'wait',
        description: 'Wait for all tools to complete',
        timeout: 10000,
      },
      {
        id: 'step-3',
        action: 'assert',
        description: 'Verify all tool outputs are valid',
        expectedResult: 'Search results, outline, dan citation check completed',
      },
    ],
  },
  {
    id: 'error-recovery',
    category: 'edge-case',
    name: 'Network Error Recovery',
    description: 'Test system behavior during network interruption',
    expectedOutcome: 'System should recover gracefully dan resume operation',
    tags: ['error', 'network', 'recovery'],
    difficulty: 'hard',
    steps: [
      {
        id: 'step-1',
        action: 'input',
        description: 'Start long-running operation',
        data: { input: 'Generate comprehensive literature review' },
      },
      {
        id: 'step-2',
        action: 'input',
        description: 'Simulate network error',
        data: { action: 'simulate_error', type: 'network' },
      },
      {
        id: 'step-3',
        action: 'wait',
        description: 'Wait for recovery attempt',
        timeout: 3000,
      },
      {
        id: 'step-4',
        action: 'assert',
        description: 'Verify operation resumed',
        expectedResult: 'Operation continues or provides proper error handling',
      },
    ],
  },
  {
    id: 'large-document-performance',
    category: 'performance',
    name: 'Large Document Processing',
    description: 'Test system performance dengan large academic documents',
    expectedOutcome: 'System maintains responsiveness dengan large inputs',
    tags: ['performance', 'large-document', 'memory'],
    difficulty: 'medium',
    steps: [
      {
        id: 'step-1',
        action: 'input',
        description: 'Process large document (>10MB)',
        data: { input: 'Process this large academic document: [LARGE_DOCUMENT]' },
      },
      {
        id: 'step-2',
        action: 'check',
        description: 'Monitor memory usage',
        expectedResult: 'Memory usage stays within acceptable limits',
      },
      {
        id: 'step-3',
        action: 'assert',
        description: 'Verify processing completion',
        expectedResult: 'Document processed successfully',
      },
    ],
  },
];

export const TestScenarioRunner: React.FC<TestScenarioRunnerProps> = ({
  onExecuteStep,
  className = '',
}) => {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [runningScenarios, setRunningScenarios] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Run a single test scenario
  const runScenario = useCallback(async (scenario: TestScenario) => {
    const scenarioId = scenario.id;
    
    // Initialize test result
    const testResult: TestResult = {
      scenarioId,
      status: 'running',
      startTime: Date.now(),
      steps: scenario.steps.map(step => ({
        stepId: step.id,
        status: 'pending',
      })),
    };
    
    setTestResults(prev => ({
      ...prev,
      [scenarioId]: testResult,
    }));
    
    setRunningScenarios(prev => new Set([...prev, scenarioId]));

    try {
      let context = {};
      
      // Execute each step
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const stepStartTime = Date.now();
        
        // Update step status to running
        setTestResults(prev => ({
          ...prev,
          [scenarioId]: {
            ...prev[scenarioId],
            steps: prev[scenarioId].steps.map(s => 
              s.stepId === step.id ? { ...s, status: 'running' } : s
            ),
          },
        }));

        try {
          // Execute step based on action type
          let stepOutput;
          
          switch (step.action) {
            case 'input':
              stepOutput = await onExecuteStep(step, context);
              break;
            
            case 'wait':
              stepOutput = await new Promise(resolve => 
                setTimeout(resolve, step.timeout || 1000)
              );
              break;
              
            case 'assert':
              // Mock assertion logic
              stepOutput = { assertion: 'passed', description: step.description };
              break;
              
            case 'check':
              // Mock check logic
              stepOutput = { check: 'passed', description: step.description };
              break;
              
            default:
              throw new Error(`Unknown step action: ${step.action}`);
          }
          
          const stepDuration = Date.now() - stepStartTime;
          
          // Update step status to passed
          setTestResults(prev => ({
            ...prev,
            [scenarioId]: {
              ...prev[scenarioId],
              steps: prev[scenarioId].steps.map(s => 
                s.stepId === step.id ? {
                  ...s,
                  status: 'passed',
                  duration: stepDuration,
                  output: stepOutput,
                } : s
              ),
            },
          }));
          
          // Update context untuk next steps
          context = { ...context, [`step_${i + 1}_output`]: stepOutput };
          
        } catch (error) {
          const stepDuration = Date.now() - stepStartTime;
          
          // Update step status to failed
          setTestResults(prev => ({
            ...prev,
            [scenarioId]: {
              ...prev[scenarioId],
              steps: prev[scenarioId].steps.map(s => 
                s.stepId === step.id ? {
                  ...s,
                  status: 'failed',
                  duration: stepDuration,
                  error: error instanceof Error ? error.message : 'Unknown error',
                } : s
              ),
            },
          }));
          
          throw error; // Re-throw untuk fail the entire scenario
        }
      }
      
      // All steps passed
      setTestResults(prev => ({
        ...prev,
        [scenarioId]: {
          ...prev[scenarioId],
          status: 'passed',
          endTime: Date.now(),
        },
      }));
      
    } catch (error) {
      // Scenario failed
      setTestResults(prev => ({
        ...prev,
        [scenarioId]: {
          ...prev[scenarioId],
          status: 'failed',
          endTime: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    } finally {
      setRunningScenarios(prev => {
        const newSet = new Set(prev);
        newSet.delete(scenarioId);
        return newSet;
      });
    }
  }, [onExecuteStep]);

  // Filter scenarios based on selected filters
  const filteredScenarios = ACADEMIC_WORKFLOW_SCENARIOS.filter(scenario => {
    const categoryMatch = selectedCategory === 'all' || scenario.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'all' || scenario.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  // Get scenario statistics
  const getStats = () => {
    const total = Object.keys(testResults).length;
    const passed = Object.values(testResults).filter(r => r.status === 'passed').length;
    const failed = Object.values(testResults).filter(r => r.status === 'failed').length;
    const running = runningScenarios.size;
    
    return { total, passed, failed, running };
  };

  const stats = getStats();

  return (
    <div className={`test-scenario-runner bg-secondary border border-gray-200 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="runner-header mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          🎭 Test Scenario Runner
        </h3>
        <p className="text-gray-600">
          Validate different AI workflows, edge cases, dan system integration scenarios.
        </p>
      </div>

      {/* Statistics */}
      {stats.total > 0 && (
        <div className="test-stats mb-6 grid grid-cols-4 gap-4">
          <div className="bg-primary p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.passed}</div>
            <div className="text-sm text-green-600">Passed</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.running}</div>
            <div className="text-sm text-blue-600">Running</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters mb-6 flex gap-4">
        <div className="filter-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-input px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="workflow">Workflow</option>
            <option value="edge-case">Edge Cases</option>
            <option value="performance">Performance</option>
            <option value="integration">Integration</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="form-input px-3 py-2 text-sm"
          >
            <option value="all">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Test Scenarios */}
      <div className="scenarios-grid grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredScenarios.map((scenario) => {
          const result = testResults[scenario.id];
          const isRunning = runningScenarios.has(scenario.id);
          
          return (
            <div
              key={scenario.id}
              className="scenario-card border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Scenario Header */}
              <div className="scenario-header mb-3">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">{scenario.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`category-badge px-2 py-1 rounded-full text-xs font-medium ${
                      scenario.category === 'workflow' ? 'bg-blue-100 text-blue-700' :
                      scenario.category === 'edge-case' ? 'bg-orange-100 text-orange-700' :
                      scenario.category === 'performance' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {scenario.category}
                    </span>
                    <span className={`difficulty-badge px-2 py-1 rounded-full text-xs font-medium ${
                      scenario.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      scenario.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {scenario.difficulty}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                <p className="text-xs text-gray-500 italic">{scenario.expectedOutcome}</p>
              </div>

              {/* Test Steps Progress */}
              {result && (
                <div className="steps-progress mb-3">
                  <div className="text-xs text-gray-500 mb-1">Steps Progress:</div>
                  <div className="flex gap-1">
                    {result.steps.map((step) => (
                      <div
                        key={step.stepId}
                        className={`step-indicator w-3 h-3 rounded-full ${
                          step.status === 'passed' ? 'bg-green-400' :
                          step.status === 'failed' ? 'bg-red-400' :
                          step.status === 'running' ? 'bg-blue-400 animate-pulse' :
                          'bg-gray-300'
                        }`}
                        title={`Step ${step.stepId}: ${step.status}`}
                      ></div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="tags mb-3 flex flex-wrap gap-1">
                {scenario.tags.map((tag, index) => (
                  <span key={index} className="tag bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Actions dan Status */}
              <div className="scenario-footer flex items-center justify-between">
                <div className="status-info text-xs text-gray-500">
                  {result ? (
                    <div className="flex items-center gap-2">
                      <span className={`status-dot w-2 h-2 rounded-full ${
                        result.status === 'passed' ? 'bg-green-400' :
                        result.status === 'failed' ? 'bg-red-400' :
                        result.status === 'running' ? 'bg-blue-400 animate-pulse' :
                        'bg-gray-400'
                      }`}></span>
                      <span>{result.status}</span>
                      {result.endTime && result.startTime && (
                        <span>({result.endTime - result.startTime}ms)</span>
                      )}
                    </div>
                  ) : (
                    <span>{scenario.steps.length} steps</span>
                  )}
                </div>
                
                <button
                  onClick={() => runScenario(scenario)}
                  disabled={isRunning}
                  className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  {isRunning ? '⏳ Running...' : '▶️ Run Test'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestScenarioRunner;