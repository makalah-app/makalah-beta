'use client';

/**
 * ResponseComparison - Interface untuk A/B testing different prompts atau model configurations
 *
 * PURPOSE:
 * - Support A/B testing untuk different prompts atau model configurations
 * - Compare AI responses side-by-side untuk quality assessment
 * - Enable prompt engineering optimization dengan visual comparison
 * - Track performance metrics across different configurations
 *
 * ENHANCEMENT: Now uses dynamic configuration dari admin panel instead of hardcoded values
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AcademicUIMessage } from '../chat/ChatContainer';
import { useDynamicConfig, getModelConfig, type ModelConfig } from '@/hooks/useDynamicConfig';

interface ComparisonConfig {
  id: string;
  name: string;
  description: string;
  settings: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    persona?: string;
    tools?: string[];
  };
}

interface ComparisonTest {
  id: string;
  input: string;
  timestamp: number;
  configs: ComparisonConfig[];
  results: ComparisonResult[];
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface ComparisonResult {
  configId: string;
  response?: AcademicUIMessage;
  metrics: {
    duration: number;
    tokenCount?: number;
    cost?: number;
    quality?: number; // 1-10 score
  };
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface ResponseComparisonProps {
  onExecuteTest: (input: string, config: ComparisonConfig) => Promise<{
    response: AcademicUIMessage;
    metrics: ComparisonResult['metrics'];
  }>;
  className?: string;
}

/**
 * Generate dynamic comparison configurations based on admin panel settings
 * ✅ FIXED: All hardcoded values (temperature, maxTokens, model names) now dynamic dari admin panel
 */
function generateDynamicConfigs(primaryModel: ModelConfig, fallbackModel: ModelConfig): ComparisonConfig[] {
  return [
    {
      id: 'primary-balanced',
      name: `${primaryModel.provider === 'openai' ? 'OpenAI' : 'OpenRouter'} ${primaryModel.model} - Balanced`,
      description: 'Primary model dengan balanced configuration dari admin panel',
      settings: {
        model: primaryModel.model, // ✅ Dynamic from admin panel
        temperature: primaryModel.temperature, // ✅ Dynamic from admin panel
        maxTokens: primaryModel.maxTokens, // ✅ Dynamic from admin panel
        persona: 'academic-researcher',
      },
    },
    {
      id: 'primary-conservative',
      name: `${primaryModel.provider === 'openai' ? 'OpenAI' : 'OpenRouter'} ${primaryModel.model} - Conservative`,
      description: 'Primary model dengan lower temperature untuk factual responses',
      settings: {
        model: primaryModel.model, // ✅ Dynamic from admin panel
        temperature: Math.max(primaryModel.temperature * 0.5, 0.05), // ✅ Dynamic base * 0.5 (minimum 0.05)
        maxTokens: primaryModel.maxTokens, // ✅ Dynamic from admin panel
        persona: 'academic-researcher',
      },
    },
    {
      id: 'primary-creative',
      name: `${primaryModel.provider === 'openai' ? 'OpenAI' : 'OpenRouter'} ${primaryModel.model} - Creative`,
      description: 'Primary model dengan higher temperature untuk creative responses',
      settings: {
        model: primaryModel.model, // ✅ Dynamic from admin panel
        temperature: Math.min(primaryModel.temperature * 1.5, 0.9), // ✅ Dynamic base * 1.5 (maximum 0.9)
        maxTokens: primaryModel.maxTokens, // ✅ Dynamic from admin panel
        persona: 'academic-researcher',
      },
    },
    {
      id: 'fallback-comparison',
      name: `${fallbackModel.provider === 'openai' ? 'OpenAI' : 'OpenRouter'} ${fallbackModel.model} - Fallback`,
      description: 'Fallback model configuration dari admin panel',
      settings: {
        model: fallbackModel.model, // ✅ Dynamic from admin panel
        temperature: fallbackModel.temperature, // ✅ Dynamic from admin panel
        maxTokens: fallbackModel.maxTokens, // ✅ Dynamic from admin panel
        persona: 'academic-researcher',
      },
    },
  ];
}

// Predefined test prompts
const TEST_PROMPTS = [
  'Jelaskan dampak teknologi blockchain terhadap sistem keuangan tradisional',
  'Analisis faktor-faktor yang mempengaruhi adopsi AI dalam sektor pendidikan',
  'Buatkan outline penelitian tentang sustainable development dalam ekonomi digital',
  'Evaluasi metode penelitian kualitatif vs kuantitatif untuk studi sosial media',
];

export const ResponseComparison: React.FC<ResponseComparisonProps> = ({
  onExecuteTest,
  className = '',
}) => {
  // ✅ ENHANCEMENT: Use dynamic configuration from admin panel
  const { config: dynamicConfig, loading: configLoading, error: configError } = useDynamicConfig();

  const [comparisonTests, setComparisonTests] = useState<ComparisonTest[]>([]);
  const [dynamicConfigs, setDynamicConfigs] = useState<ComparisonConfig[]>([]);
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState('');
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'duration' | 'tokens' | 'quality'>('duration');

  // Generate dynamic configurations when config loads
  useEffect(() => {
    if (dynamicConfig && !configLoading) {
      const primaryModel = getModelConfig(dynamicConfig, 'primary');
      const fallbackModel = getModelConfig(dynamicConfig, 'fallback');

      const newConfigs = generateDynamicConfigs(primaryModel, fallbackModel);
      setDynamicConfigs(newConfigs);

      // Set default selections (first two configs)
      if (newConfigs.length >= 2 && selectedConfigs.size === 0) {
        setSelectedConfigs(new Set([newConfigs[0].id, newConfigs[1].id]));
      }

      console.log('✅ Dynamic comparison configs generated:', {
        primaryProvider: primaryModel.provider,
        primaryModel: primaryModel.model,
        fallbackProvider: fallbackModel.provider,
        fallbackModel: fallbackModel.model,
        configsCount: newConfigs.length
      });
    }
  }, [dynamicConfig, configLoading, selectedConfigs.size]);

  // Start comparison test
  const startComparison = useCallback(async (input: string) => {
    const configs = dynamicConfigs.filter(config => selectedConfigs.has(config.id));
    
    if (configs.length < 2) {
      alert('Please select at least 2 configurations untuk comparison');
      return;
    }

    const testId = `test-${Date.now()}`;
    const newTest: ComparisonTest = {
      id: testId,
      input,
      timestamp: Date.now(),
      configs,
      results: configs.map(config => ({
        configId: config.id,
        status: 'pending',
        metrics: {
          duration: 0,
        },
      })),
      status: 'running',
    };

    setComparisonTests(prev => [newTest, ...prev]);
    setActiveTest(testId);

    // Execute tests untuk each configuration
    const promises = configs.map(async (config, index) => {
      try {
        // Update status to running
        setComparisonTests(prev => prev.map(test => 
          test.id === testId ? {
            ...test,
            results: test.results.map(result => 
              result.configId === config.id 
                ? { ...result, status: 'running' }
                : result
            ),
          } : test
        ));

        const startTime = Date.now();
        const result = await onExecuteTest(input, config);
        const duration = Date.now() - startTime;

        // Update dengan successful result
        setComparisonTests(prev => prev.map(test => 
          test.id === testId ? {
            ...test,
            results: test.results.map(testResult => 
              testResult.configId === config.id 
                ? {
                    ...testResult,
                    status: 'completed',
                    response: result.response,
                    metrics: {
                      ...result.metrics,
                      duration,
                    },
                  }
                : testResult
            ),
          } : test
        ));

      } catch (error) {
        // Update dengan error
        setComparisonTests(prev => prev.map(test => 
          test.id === testId ? {
            ...test,
            results: test.results.map(result => 
              result.configId === config.id 
                ? {
                    ...result,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    metrics: { duration: 0 },
                  }
                : result
            ),
          } : test
        ));
      }
    });

    // Wait untuk all tests to complete
    await Promise.allSettled(promises);

    // Mark test as completed
    setComparisonTests(prev => prev.map(test => 
      test.id === testId 
        ? { ...test, status: 'completed' }
        : test
    ));

    setActiveTest(null);
  }, [selectedConfigs, onExecuteTest, dynamicConfigs]);

  // Handle config selection
  const toggleConfig = (configId: string) => {
    setSelectedConfigs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(configId)) {
        if (newSet.size > 1) { // Keep at least one selected
          newSet.delete(configId);
        }
      } else {
        newSet.add(configId);
      }
      return newSet;
    });
  };

  // Get comparison statistics
  const getConfigStats = (configId: string) => {
    const configResults = comparisonTests.flatMap(test => 
      test.results.filter(result => result.configId === configId && result.status === 'completed')
    );
    
    if (configResults.length === 0) return null;

    const avgDuration = configResults.reduce((sum, r) => sum + r.metrics.duration, 0) / configResults.length;
    const avgTokens = configResults.reduce((sum, r) => sum + (r.metrics.tokenCount || 0), 0) / configResults.length;
    const avgQuality = configResults.reduce((sum, r) => sum + (r.metrics.quality || 0), 0) / configResults.length;

    return {
      tests: configResults.length,
      avgDuration: Math.round(avgDuration),
      avgTokens: Math.round(avgTokens),
      avgQuality: avgQuality.toFixed(1),
    };
  };

  return (
    <div className={`response-comparison bg-secondary border border-gray-200 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="comparison-header mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          🔄 Response Comparison
        </h3>
        <p className="text-gray-600">
          A/B test different AI configurations dan compare response quality, speed, dan consistency.
        </p>

        {/* Loading/Error States */}
        {configLoading && (
          <div className="mt-2 text-sm text-blue-600">
            ⏳ Loading dynamic configurations from admin panel...
          </div>
        )}

        {configError && (
          <div className="mt-2 text-sm text-orange-600">
            ⚠️ Using fallback configuration. Error: {configError}
          </div>
        )}

        {dynamicConfig && !configLoading && (
          <div className="mt-2 text-sm text-green-600">
            ✅ Using dynamic configurations from admin panel
          </div>
        )}
      </div>

      {/* Configuration Selection */}
      <div className="config-selection mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Select Configurations to Compare</h4>
        <div className="configs-grid grid grid-cols-1 md:grid-cols-2 gap-3">
          {dynamicConfigs.map((config) => {
            const isSelected = selectedConfigs.has(config.id);
            const stats = getConfigStats(config.id);
            
            return (
              <div
                key={config.id}
                className={`config-card border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleConfig(config.id)}
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
                      <h5 className="font-medium text-gray-800">{config.name}</h5>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                    
                    {/* Config Settings */}
                    <div className="config-settings text-xs text-gray-500">
                      <div>Model: {config.settings.model}</div>
                      <div>Temperature: {config.settings.temperature}</div>
                      <div>Max Tokens: {config.settings.maxTokens}</div>
                    </div>
                    
                    {/* Statistics */}
                    {stats && (
                      <div className="config-stats mt-2 text-xs text-gray-600">
                        <div className="grid grid-cols-2 gap-2">
                          <span>Tests: {stats.tests}</span>
                          <span>Avg: {stats.avgDuration}ms</span>
                          <span>Tokens: {stats.avgTokens}</span>
                          <span>Quality: {stats.avgQuality}/10</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Test Input */}
      <div className="test-input mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-gray-700">Test Input</h4>
          <div className="quick-prompts flex gap-2">
            {TEST_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setCustomInput(prompt)}
                className="btn-secondary text-xs px-2 py-1 hover:bg-gray-100"
                title={prompt}
              >
                Prompt {index + 1}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex gap-3">
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Enter test prompt untuk compare AI responses..."
            className="flex-1 p-3 border border-gray-200 rounded-lg resize-none"
            rows={3}
          />
          <button
            onClick={() => startComparison(customInput)}
            disabled={
              configLoading ||
              !customInput.trim() ||
              selectedConfigs.size < 2 ||
              activeTest !== null ||
              dynamicConfigs.length === 0
            }
            className="btn-primary px-6 py-2 disabled:opacity-50"
          >
            {configLoading ? '⏳ Loading Config...' :
             activeTest ? '⏳ Running...' :
             '🚀 Start Comparison'}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonTests.length > 0 && (
        <div className="comparison-results">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-700">Comparison Results</h4>
            <div className="sorting flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="form-input text-sm px-2 py-1"
              >
                <option value="duration">Duration</option>
                <option value="tokens">Token Count</option>
                <option value="quality">Quality Score</option>
              </select>
            </div>
          </div>

          <div className="results-list space-y-6">
            {comparisonTests.map((test) => (
              <div key={test.id} className="test-result border border-gray-200 rounded-lg p-4">
                {/* Test Header */}
                <div className="test-header mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-800 mb-1">Test Results</h5>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded italic">
                        &quot;{test.input}&quot;
                      </p>
                    </div>
                    <div className="test-meta text-xs text-gray-500">
                      <div>{new Date(test.timestamp).toLocaleString()}</div>
                      <div className={`status ${
                        test.status === 'completed' ? 'text-green-600' :
                        test.status === 'running' ? 'text-blue-600' :
                        test.status === 'failed' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {test.status}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results Grid */}
                <div className="results-grid grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {test.results.map((result) => {
                    const config = dynamicConfigs.find(c => c.id === result.configId);
                    if (!config) return null;

                    return (
                      <div key={result.configId} className="result-card border border-gray-200 rounded-lg p-4">
                        {/* Result Header */}
                        <div className="result-header mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-medium text-gray-800">{config.name}</h6>
                            <div className={`status-indicator w-2 h-2 rounded-full ${
                              result.status === 'completed' ? 'bg-green-400' :
                              result.status === 'running' ? 'bg-blue-400 animate-pulse' :
                              result.status === 'failed' ? 'bg-red-400' :
                              'bg-gray-400'
                            }`}></div>
                          </div>
                          
                          {/* Metrics */}
                          <div className="metrics grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <span>Duration: {result.metrics.duration}ms</span>
                            <span>Tokens: {result.metrics.tokenCount || 'N/A'}</span>
                            <span>Cost: ${result.metrics.cost?.toFixed(4) || 'N/A'}</span>
                            <span>Quality: {result.metrics.quality || 'N/A'}/10</span>
                          </div>
                        </div>

                        {/* Response Preview */}
                        {result.response && (
                          <div className="response-preview">
                            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                              {result.response.parts
                                .filter(part => part.type === 'text')
                                .map((part, index) => (
                                  <div key={index}>{part.text?.substring(0, 200)}...</div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Error Display */}
                        {result.error && (
                          <div className="error-display text-sm text-red-600 bg-red-50 p-2 rounded">
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseComparison;