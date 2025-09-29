'use client';

/**
 * ConfigurationPanel - Panel untuk testing different AI models, parameters, dan settings
 *
 * PURPOSE:
 * - Enable testing different AI models, parameters, dan settings
 * - Provide interface untuk configuring AI behavior dan system parameters
 * - Support quick switching between different configurations
 * - Save dan load configuration presets untuk efficient testing
 *
 * ENHANCEMENT: Now uses dynamic configuration dari admin panel instead of hardcoded values
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useStatePersistence } from './StatePersistence';
import { useDynamicConfig, getModelConfig, type ModelConfig } from '@/hooks/useDynamicConfig';

interface AIModelConfig {
  provider: 'openrouter' | 'openai';
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

interface WorkflowConfig {
  enableApprovalGates: boolean;
  autoAdvancePhases: boolean;
  requireHumanFeedback: boolean;
  enableToolCalls: boolean;
  maxPhaseRetries: number;
  approvalTimeout: number;
}

interface SystemConfig {
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableMetrics: boolean;
  enableCaching: boolean;
  rateLimitEnabled: boolean;
  maxConcurrentRequests: number;
}

interface ConfigurationState {
  aiModel: AIModelConfig;
  workflow: WorkflowConfig;
  system: SystemConfig;
  persona: string;
  systemPrompt: string;
}

interface ConfigurationPanelProps {
  currentConfig: ConfigurationState;
  onConfigChange: (config: ConfigurationState) => void;
  className?: string;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
}

/**
 * Generate dynamic configuration presets based on admin panel settings
 * ✅ FIXED: All hardcoded values (temperature, maxTokens, model names) now dynamic dari admin panel
 */
function generateDynamicConfigs(primaryModel: ModelConfig, fallbackModel: ModelConfig, systemPrompt: string): Record<string, ConfigurationState> {
  return {
    'balanced': {
      aiModel: {
        provider: primaryModel.provider === 'openai' ? 'openai' : 'openrouter',
        model: primaryModel.model, // ✅ Dynamic from admin panel
        temperature: primaryModel.temperature, // ✅ Dynamic from admin panel
        maxTokens: primaryModel.maxTokens, // ✅ Dynamic from admin panel
      },
      workflow: {
        enableApprovalGates: true,
        autoAdvancePhases: false,
        requireHumanFeedback: true,
        enableToolCalls: true,
        maxPhaseRetries: 3,
        approvalTimeout: 300000, // 5 minutes
      },
      system: {
        debugMode: false,
        logLevel: 'info',
        enableMetrics: true,
        enableCaching: true,
        rateLimitEnabled: true,
        maxConcurrentRequests: 5,
      },
      persona: 'academic-researcher',
      systemPrompt: systemPrompt || 'You are an expert academic researcher helping with scholarly paper writing.',
    },
    'creative': {
      aiModel: {
        provider: primaryModel.provider === 'openai' ? 'openai' : 'openrouter',
        model: primaryModel.model, // ✅ Dynamic from admin panel
        temperature: Math.min(primaryModel.temperature * 3, 0.9), // ✅ Dynamic base * 3 (maximum 0.9)
        maxTokens: Math.round(primaryModel.maxTokens * 0.37), // ✅ Dynamic proportional (37% of base)
      },
      workflow: {
        enableApprovalGates: true,
        autoAdvancePhases: false,
        requireHumanFeedback: true,
        enableToolCalls: true,
        maxPhaseRetries: 2,
        approvalTimeout: 600000, // 10 minutes
      },
      system: {
        debugMode: false,
        logLevel: 'info',
        enableMetrics: true,
        enableCaching: true,
        rateLimitEnabled: true,
        maxConcurrentRequests: 3,
      },
      persona: 'creative-academic',
      systemPrompt: systemPrompt ?
        `${systemPrompt}\n\nFocus on creative and innovative approaches while maintaining academic rigor.` :
        'You are a creative academic researcher who thinks outside the box while maintaining scholarly rigor.',
    },
    'conservative': {
      aiModel: {
        provider: primaryModel.provider === 'openai' ? 'openai' : 'openrouter',
        model: primaryModel.model, // ✅ Dynamic from admin panel
        temperature: Math.max(primaryModel.temperature * 0.8, 0.05), // ✅ Dynamic base * 0.8 (minimum 0.05)
        maxTokens: Math.round(primaryModel.maxTokens * 0.18), // ✅ Dynamic proportional (18% of base)
      },
      workflow: {
        enableApprovalGates: true,
        autoAdvancePhases: false,
        requireHumanFeedback: true,
        enableToolCalls: true,
        maxPhaseRetries: 5,
        approvalTimeout: 180000, // 3 minutes
      },
      system: {
        debugMode: false,
        logLevel: 'warn',
        enableMetrics: true,
        enableCaching: true,
        rateLimitEnabled: true,
        maxConcurrentRequests: 2,
      },
      persona: 'conservative-academic',
      systemPrompt: systemPrompt ?
        `${systemPrompt}\n\nPrioritize accuracy, precision, and proven methods.` :
        'You are a methodical academic researcher who prioritizes accuracy and proven methods.',
    },
    'development': {
      aiModel: {
        provider: fallbackModel.provider === 'openai' ? 'openai' : 'openrouter',
        model: fallbackModel.model, // ✅ Dynamic fallback model from admin panel
        temperature: fallbackModel.temperature, // ✅ Dynamic from admin panel
        maxTokens: fallbackModel.maxTokens, // ✅ Dynamic from admin panel
      },
      workflow: {
        enableApprovalGates: false,
        autoAdvancePhases: true,
        requireHumanFeedback: false,
        enableToolCalls: true,
        maxPhaseRetries: 1,
        approvalTimeout: 60000, // 1 minute
      },
      system: {
        debugMode: true,
        logLevel: 'debug',
        enableMetrics: true,
        enableCaching: false,
        rateLimitEnabled: false,
        maxConcurrentRequests: 10,
      },
      persona: 'academic-researcher',
      systemPrompt: systemPrompt ?
        `${systemPrompt}\n\nYou are in development mode. Provide detailed responses quickly for testing purposes.` :
        'You are in development mode. Provide detailed responses quickly for testing purposes.',
    },
  };
}

import { OPENROUTER_MODEL_SLUGS } from '../../lib/ai/model-registry';

const AVAILABLE_MODELS = {
  openrouter: OPENROUTER_MODEL_SLUGS,
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
  ],
};

const PERSONA_OPTIONS = [
  'academic-researcher',
  'creative-academic',
  'conservative-academic',
  'technical-writer',
  'literature-reviewer',
];

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  currentConfig,
  onConfigChange,
  className = '',
  isVisible = false,
  onToggleVisibility,
}) => {
  // ✅ ENHANCEMENT: Use dynamic configuration from admin panel
  const { config: dynamicConfig, loading: configLoading, error: configError } = useDynamicConfig();

  const [activeTab, setActiveTab] = useState<'ai' | 'workflow' | 'system' | 'prompt'>('ai');
  const [configName, setConfigName] = useState('');
  const [isChanged, setIsChanged] = useState(false);
  const [dynamicConfigs, setDynamicConfigs] = useState<Record<string, ConfigurationState>>({});

  const { saveTestConfig, getRecentTestConfigs, loadTestConfig } = useStatePersistence();

  // Generate dynamic configurations when config loads
  useEffect(() => {
    if (dynamicConfig && !configLoading) {
      const primaryModel = getModelConfig(dynamicConfig, 'primary');
      const fallbackModel = getModelConfig(dynamicConfig, 'fallback');
      const systemPrompt = dynamicConfig.prompts.systemInstructions?.content || '';

      const newConfigs = generateDynamicConfigs(primaryModel, fallbackModel, systemPrompt);
      setDynamicConfigs(newConfigs);

      // Dynamic configuration presets generated - silent handling for production
    }
  }, [dynamicConfig, configLoading]);

  // Handle configuration changes
  const updateConfig = useCallback((updates: Partial<ConfigurationState>) => {
    const newConfig = { ...currentConfig, ...updates };
    onConfigChange(newConfig);
    setIsChanged(true);
  }, [currentConfig, onConfigChange]);

  // Update AI model config
  const updateAIModel = useCallback((updates: Partial<AIModelConfig>) => {
    updateConfig({
      aiModel: { ...currentConfig.aiModel, ...updates }
    });
  }, [currentConfig.aiModel, updateConfig]);

  // Update workflow config
  const updateWorkflow = useCallback((updates: Partial<WorkflowConfig>) => {
    updateConfig({
      workflow: { ...currentConfig.workflow, ...updates }
    });
  }, [currentConfig.workflow, updateConfig]);

  // Update system config
  const updateSystem = useCallback((updates: Partial<SystemConfig>) => {
    updateConfig({
      system: { ...currentConfig.system, ...updates }
    });
  }, [currentConfig.system, updateConfig]);

  // Load preset configuration
  const loadPresetConfig = useCallback((presetName: string) => {
    const preset = dynamicConfigs[presetName];
    if (preset) {
      onConfigChange(preset);
      setIsChanged(false);
    }
  }, [onConfigChange, dynamicConfigs]);

  // Save current configuration
  const saveCurrentConfig = useCallback(() => {
    if (configName.trim()) {
      saveTestConfig(configName.trim(), currentConfig);
      setConfigName('');
      setIsChanged(false);
    }
  }, [configName, currentConfig, saveTestConfig]);

  // Load saved configuration
  const loadSavedConfig = useCallback((configId: string) => {
    const config = loadTestConfig(configId);
    if (config) {
      onConfigChange(config);
      setIsChanged(false);
    }
  }, [loadTestConfig, onConfigChange]);

  const recentConfigs = getRecentTestConfigs();

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`configuration-panel fixed top-0 right-0 w-96 h-full bg-white border-l border-gray-200 shadow-lg z-50 overflow-y-auto ${className}`}>
      {/* Panel Header */}
      <div className="panel-header bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">⚙️ Configuration</h3>
          <div className="flex items-center gap-2">
            {isChanged && (
              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                Unsaved
              </span>
            )}
            <button
              onClick={onToggleVisibility}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Loading/Error States */}
        {configLoading && (
          <div className="mt-2 text-xs text-blue-600">
            ⏳ Loading dynamic configurations...
          </div>
        )}

        {configError && (
          <div className="mt-2 text-xs text-orange-600">
            ⚠️ Using fallback configuration. Error: {configError}
          </div>
        )}

        {dynamicConfig && !configLoading && Object.keys(dynamicConfigs).length > 0 && (
          <div className="mt-2 text-xs text-green-600">
            ✅ Using dynamic configurations from admin panel
          </div>
        )}
      </div>

      {/* Quick Presets */}
      <div className="quick-presets p-4 border-b border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Quick Presets</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(dynamicConfigs).map((presetName) => (
            <button
              key={presetName}
              onClick={() => loadPresetConfig(presetName)}
              disabled={configLoading || Object.keys(dynamicConfigs).length === 0}
              className="btn-secondary text-sm px-2 py-1 capitalize hover:bg-gray-100 disabled:opacity-50"
            >
              {presetName}
            </button>
          ))}
        </div>

        {/* Show loading state when no configs available */}
        {configLoading && Object.keys(dynamicConfigs).length === 0 && (
          <div className="text-center text-sm text-gray-500 py-4">
            ⏳ Loading presets from admin panel...
          </div>
        )}

        {!configLoading && Object.keys(dynamicConfigs).length === 0 && (
          <div className="text-center text-sm text-gray-500 py-4">
            ⚠️ No presets available. Using fallback configuration.
          </div>
        )}
      </div>

      {/* Save/Load Custom Configs */}
      <div className="config-management p-4 border-b border-gray-200">
        <h4 className="font-medium text-gray-700 mb-2">Save/Load Configuration</h4>
        
        <div className="save-config mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Configuration name..."
              className="flex-1 form-input text-sm px-2 py-1"
            />
            <button
              onClick={saveCurrentConfig}
              disabled={!configName.trim()}
              className="btn-primary text-sm px-3 py-1 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        {recentConfigs.length > 0 && (
          <div className="recent-configs">
            <h5 className="text-sm font-medium text-gray-600 mb-2">Recent Configurations</h5>
            <div className="space-y-1">
              {recentConfigs.slice(0, 5).map((config) => (
                <div key={config.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate">{config.name}</span>
                  <button
                    onClick={() => loadSavedConfig(config.id)}
                    className="btn-secondary text-xs px-2 py-0.5 hover:bg-gray-100"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Tabs */}
      <div className="config-tabs border-b border-gray-200">
        <div className="flex">
          {[
            { id: 'ai', label: 'AI Model' },
            { id: 'workflow', label: 'Workflow' },
            { id: 'system', label: 'System' },
            { id: 'prompt', label: 'Prompts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab flex-1 px-3 py-2 text-sm ${
                activeTab === tab.id
                  ? 'bg-white border-b-2 border-primary-500 text-primary-600'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content p-4">
        {/* AI Model Tab */}
        {activeTab === 'ai' && (
          <div className="ai-config space-y-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={currentConfig.aiModel.provider}
                onChange={(e) => updateAIModel({ 
                  provider: e.target.value as any,
                  model: AVAILABLE_MODELS[e.target.value as keyof typeof AVAILABLE_MODELS][0]
                })}
                className="form-input w-full"
              >
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select
                value={currentConfig.aiModel.model}
                onChange={(e) => updateAIModel({ model: e.target.value })}
                className="form-input w-full"
              >
                {AVAILABLE_MODELS[currentConfig.aiModel.provider].map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {currentConfig.aiModel.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={currentConfig.aiModel.temperature}
                onChange={(e) => updateAIModel({ temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Focused (0)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                min="100"
                max="8000"
                value={currentConfig.aiModel.maxTokens}
                onChange={(e) => updateAIModel({ maxTokens: parseInt(e.target.value) })}
                className="form-input w-full"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
              <select
                value={currentConfig.persona}
                onChange={(e) => updateConfig({ persona: e.target.value })}
                className="form-input w-full"
              >
                {PERSONA_OPTIONS.map((persona) => (
                  <option key={persona} value={persona}>
                    {persona.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Workflow Tab */}
        {activeTab === 'workflow' && (
          <div className="workflow-config space-y-4">
            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentConfig.workflow.enableApprovalGates}
                  onChange={(e) => updateWorkflow({ enableApprovalGates: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Approval Gates</span>
              </label>
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentConfig.workflow.autoAdvancePhases}
                  onChange={(e) => updateWorkflow({ autoAdvancePhases: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto Advance Phases</span>
              </label>
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentConfig.workflow.requireHumanFeedback}
                  onChange={(e) => updateWorkflow({ requireHumanFeedback: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Require Human Feedback</span>
              </label>
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentConfig.workflow.enableToolCalls}
                  onChange={(e) => updateWorkflow({ enableToolCalls: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Tool Calls</span>
              </label>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Phase Retries</label>
              <input
                type="number"
                min="1"
                max="10"
                value={currentConfig.workflow.maxPhaseRetries}
                onChange={(e) => updateWorkflow({ maxPhaseRetries: parseInt(e.target.value) })}
                className="form-input w-full"
              />
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approval Timeout (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={Math.round(currentConfig.workflow.approvalTimeout / 60000)}
                onChange={(e) => updateWorkflow({ approvalTimeout: parseInt(e.target.value) * 60000 })}
                className="form-input w-full"
              />
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="system-config space-y-4">
            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentConfig.system.debugMode}
                  onChange={(e) => updateSystem({ debugMode: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Debug Mode</span>
              </label>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Log Level</label>
              <select
                value={currentConfig.system.logLevel}
                onChange={(e) => updateSystem({ logLevel: e.target.value as any })}
                className="form-input w-full"
              >
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentConfig.system.enableMetrics}
                  onChange={(e) => updateSystem({ enableMetrics: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Metrics</span>
              </label>
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentConfig.system.enableCaching}
                  onChange={(e) => updateSystem({ enableCaching: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Caching</span>
              </label>
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentConfig.system.rateLimitEnabled}
                  onChange={(e) => updateSystem({ rateLimitEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Rate Limiting</span>
              </label>
            </div>

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Concurrent Requests</label>
              <input
                type="number"
                min="1"
                max="20"
                value={currentConfig.system.maxConcurrentRequests}
                onChange={(e) => updateSystem({ maxConcurrentRequests: parseInt(e.target.value) })}
                className="form-input w-full"
              />
            </div>
          </div>
        )}

        {/* Prompts Tab */}
        {activeTab === 'prompt' && (
          <div className="prompt-config space-y-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
              <textarea
                value={currentConfig.systemPrompt}
                onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                className="form-input w-full resize-none"
                rows={6}
                placeholder="Enter system prompt..."
              />
            </div>

            <div className="prompt-templates">
              <h5 className="text-sm font-medium text-gray-600 mb-2">Quick Templates</h5>
              <div className="space-y-1">
                {[
                  'You are an expert academic researcher.',
                  'You are a creative academic writer.',
                  'You are a methodical literature reviewer.',
                  'You are a technical writing specialist.',
                ].map((template, index) => (
                  <button
                    key={index}
                    onClick={() => updateConfig({ systemPrompt: template })}
                    className="block w-full text-left text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 p-2 rounded"
                  >
                    <span>&quot;{template}&quot;</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apply Button */}
      <div className="panel-footer border-t border-gray-200 p-4">
        <button
          onClick={() => setIsChanged(false)}
          disabled={!isChanged}
          className="btn-primary w-full disabled:opacity-50"
        >
          Apply Configuration
        </button>
      </div>
    </div>
  );
};

export default ConfigurationPanel;
