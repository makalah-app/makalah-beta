
'use client';

import React, { useState, useEffect } from 'react';
import { OPENROUTER_MODELS } from '../../lib/ai/model-registry';

// Provider configurations
const PROVIDERS = [
  { 
    value: 'openai', 
    label: 'OpenAI',
    description: 'Most reliable and consistent',
    icon: '🟢'
  },
  { 
    value: 'openrouter', 
    label: 'OpenRouter',
    description: 'Access to multiple models',
    icon: '🔄'
  }
];

const MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Latest)', recommended: true },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', recommended: false },
  ],
  openrouter: OPENROUTER_MODELS.map(m => ({
    value: m.value,
    // label disamakan dengan source of truth (tanpa suffix marketing)
    label: m.label,
    // pertahankan rekomendasi dasar untuk UX default
    recommended: m.recommended === true,
  })),
};

interface ProviderConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
}

interface ProviderSelectorProps {
  value: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  showAdvanced?: boolean;
  showApiKey?: boolean;
  placeholder?: {
    provider?: string;
    model?: string;
    apiKey?: string;
  };
  validation?: {
    isValid: boolean;
    errors: string[];
  };
}

export function ProviderSelector({
  value,
  onChange,
  label = 'Provider Configuration',
  description,
  disabled = false,
  showAdvanced = true,
  showApiKey = true,
  placeholder,
  validation
}: ProviderSelectorProps) {
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update model when provider changes
  const handleProviderChange = (newProvider: string) => {
    const availableModels = MODELS[newProvider as keyof typeof MODELS];
    const recommendedModel = availableModels?.find(m => m.recommended);
    const defaultModel = recommendedModel || availableModels?.[0];
    
    onChange({
      ...value,
      provider: newProvider,
      model: defaultModel?.value || value.model
    });
  };

  // Handle field changes
  const handleFieldChange = (field: keyof ProviderConfig, fieldValue: any) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  // Get provider info
  const getProviderInfo = (providerValue: string) => {
    return PROVIDERS.find(p => p.value === providerValue);
  };

  // Get model info
  const getModelInfo = (providerValue: string, modelValue: string) => {
    const models = MODELS[providerValue as keyof typeof MODELS];
    return models?.find(m => m.value === modelValue);
  };

  // Validation styles
  const getValidationStyle = () => {
    if (!validation) return {};
    
    return {
      border: validation.isValid ? '2px solid #10b981' : '2px solid #ef4444'
    };
  };

  return (
    <div style={{ 
      border: '2px solid #ddd', 
      padding: '1rem', 
      backgroundColor: '#f9f9f9',
      borderRadius: '4px',
      ...getValidationStyle()
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontWeight: 'bold', margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>
            {label}
          </h3>
          {description && (
            <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>
              {description}
            </p>
          )}
        </div>
        
        {showAdvanced && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '0.75rem',
              color: '#666'
            }}
          >
            <span style={{ fontSize: '0.875rem' }}>
              {isExpanded ? '🔽' : '▶️'}
            </span>
            {isExpanded ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        )}
      </div>

      {/* Validation Errors */}
      {validation && !validation.isValid && (
        <div style={{ backgroundColor: '#fee', border: '1px solid #fcc', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <strong style={{ color: '#dc2626' }}>Validation Errors:</strong>
          <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', color: '#dc2626' }}>
            {validation.errors.map((error, index) => (
              <li key={index} style={{ fontSize: '0.875rem' }}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: showApiKey ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        {/* Provider Selection */}
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Provider
          </label>
          <select
            value={value.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              fontSize: '0.875rem'
            }}
          >
            {placeholder?.provider && (
              <option value="" disabled>
                {placeholder.provider}
              </option>
            )}
            {PROVIDERS.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.icon} {provider.label}
              </option>
            ))}
          </select>
          
          {/* Provider Description */}
          {value.provider && getProviderInfo(value.provider) && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.5rem', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '4px',
              fontSize: '0.75rem',
              color: '#666'
            }}>
              {getProviderInfo(value.provider)?.description}
            </div>
          )}
        </div>

        {/* API Key Input */}
        {showApiKey && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold', margin: 0, fontSize: '0.875rem' }}>
                API Key
              </label>
              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                disabled={disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'transparent',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  color: '#666'
                }}
              >
                <span style={{ fontSize: '0.875rem' }}>
                  {showApiKeyInput ? '🙈' : '👁️'}
                </span>
                {showApiKeyInput ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showApiKeyInput ? 'text' : 'password'}
              value={value.apiKey || ''}
              onChange={(e) => handleFieldChange('apiKey', e.target.value)}
              placeholder={placeholder?.apiKey || 
                          (value.provider === 'openai' ? 'sk-proj-...' : 
                           value.provider === 'openrouter' ? 'sk-or-...' : 'sk-ant-...')}
              disabled={disabled}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
                fontSize: '0.875rem',
                fontFamily: showApiKeyInput ? 'monospace' : 'inherit'
              }}
            />
            
            {/* API Key Status */}
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
              Status: <span style={{ 
                fontWeight: 'bold',
                color: value.apiKey && value.apiKey.length > 10 ? '#059669' : '#dc2626'
              }}>
                {value.apiKey && value.apiKey.length > 10 ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Model
        </label>
        <select
          value={value.model}
          onChange={(e) => handleFieldChange('model', e.target.value)}
          disabled={disabled || !value.provider}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ddd',
            backgroundColor: '#fff',
            fontSize: '0.875rem'
          }}
        >
          {placeholder?.model && (
            <option value="" disabled>
              {placeholder.model}
            </option>
          )}
          {value.provider && MODELS[value.provider as keyof typeof MODELS]?.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label} {model.recommended ? '⭐' : ''}
            </option>
          ))}
        </select>
        
        {/* Model Info */}
        {value.model && getModelInfo(value.provider, value.model) && (
          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.75rem',
            color: '#666'
          }}>
            {getModelInfo(value.provider, value.model)?.recommended && (
              <span style={{ 
                backgroundColor: '#fef3cd', 
                color: '#b45309',
                padding: '0.125rem 0.5rem',
                borderRadius: '4px',
                marginRight: '0.5rem'
              }}>
                ⭐ Recommended
              </span>
            )}
          </div>
        )}
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && isExpanded && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Advanced Parameters
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Temperature Control */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Temperature
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={value.temperature}
                onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value) || 0.1)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                  fontSize: '0.875rem'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {value.temperature <= 0.3 ? 'Focused & deterministic' :
                 value.temperature <= 0.7 ? 'Balanced creativity' :
                 value.temperature <= 1.2 ? 'Creative & varied' : 'Very creative'}
              </div>
            </div>
            
            {/* Max Tokens Control */}
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Max Tokens
              </label>
              <input
                type="number"
                min="100"
                max="100000"
                step="256"
                value={value.maxTokens}
                onChange={(e) => handleFieldChange('maxTokens', parseInt(e.target.value) || 8192)}
                disabled={disabled}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                  fontSize: '0.875rem'
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                Max response length (~{Math.round(value.maxTokens * 0.75)} words)
              </div>
            </div>
          </div>

          {/* Parameter Guidelines */}
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: '#1976d2'
          }}>
            <strong>💡 Parameter Guidelines:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
              <li>Academic writing: Temperature 0.1-0.3, Max tokens 4096+</li>
              <li>Creative content: Temperature 0.7-1.0, Max tokens 2048+</li>
              <li>Code generation: Temperature 0.1-0.2, Max tokens 2048+</li>
            </ul>
          </div>
        </div>
      )}

      {/* Configuration Preview */}
      <div style={{ 
        marginTop: '1rem', 
        padding: '0.75rem', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #ddd', 
        borderRadius: '4px' 
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 'bold' }}>
          Current Configuration
        </h4>
        <div style={{ fontSize: '0.75rem', color: '#374151' }}>
          <span style={{ fontWeight: 'bold' }}>{getProviderInfo(value.provider)?.label}</span> → 
          <span style={{ fontWeight: 'bold', marginLeft: '0.25rem' }}>
            {getModelInfo(value.provider, value.model)?.label || value.model}
          </span>
          <br />
          Temperature: <span style={{ fontWeight: 'bold' }}>{value.temperature}</span>, 
          Max Tokens: <span style={{ fontWeight: 'bold' }}>{value.maxTokens}</span>
          <br />
          API Key: <span style={{ 
            fontWeight: 'bold',
            color: value.apiKey && value.apiKey.length > 10 ? '#059669' : '#dc2626'
          }}>
            {value.apiKey && value.apiKey.length > 10 ? 'Configured' : 'Missing'}
          </span>
        </div>
      </div>
    </div>
  );
}
