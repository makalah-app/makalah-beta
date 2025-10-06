'use client';

/**
 * ChatInput - Input component dengan send functionality dan keyboard shortcuts
 *
 * UPDATED TO AI ELEMENTS:
 * - Uses official AI SDK Elements PromptInput components for consistency
 * - Integrates dengan existing useChat hook sendMessage
 * - Simplified structure following AI SDK Elements patterns
 *
 * DESIGN COMPLIANCE:
 * - AI SDK Elements styling dengan 3px border radius
 * - Button patterns yang consistent dengan design system
 * - Auto-resize textarea functionality dari AI Elements
 */

import React, { useState, useRef, type FormEventHandler } from 'react';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
} from '../ai-elements/prompt-input';
import { Button } from '../ui/button';
import { PlusIcon, SquareIcon } from 'lucide-react';

// Define message structure for AI SDK compatibility
export interface PromptInputMessage {
  text?: string;
  files?: FileList;
}

interface ChatInputProps {
  sendMessage: (message: { text: string; metadata?: { timestamp?: number } }) => void; // AI SDK v5 pattern - CreateUIMessage object
  disabled?: boolean;
  status?: 'ready' | 'submitted' | 'streaming' | 'error';
  placeholder?: string;
  className?: string;
  // Testing features
  testMode?: boolean;
  onTestScenario?: (scenario: string) => void;
  onStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  sendMessage,
  disabled = false,
  status = 'ready',
  placeholder = 'Ketik pesan Anda di sini...',
  className = '',
  testMode = false,
  onTestScenario,
  onStop,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [text, setText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canStop = status === 'submitted' || status === 'streaming';
  const isSubmitDisabled = disabled || status !== 'ready' || !text.trim();

  // Handle form submission dengan AI Elements pattern
  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    if (!text?.trim() && !selectedFiles?.length) return;
    if (disabled || status !== 'ready') return;

    // Send message using AI SDK sendMessage (AI SDK v5 pattern - CreateUIMessage object)
    const messageText = text.trim();

    // Handle files if present
    if (selectedFiles?.length) {
      const fileNames = Array.from(selectedFiles).map(f => f.name).join(', ');
      const messageWithFiles = `${messageText}\n\n[Files attached: ${fileNames}]`;
      sendMessage({
        text: messageWithFiles,
        metadata: {
          timestamp: Date.now()
        }
      });

      // Clear selected files after sending
      clearFiles();
    } else {
      sendMessage({
        text: messageText,
        metadata: {
          timestamp: Date.now()
        }
      });
    }

    // Clear text after sending
    setText('');
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (validateFiles(e.target.files)) {
        setSelectedFiles(e.target.files);
      } else {
        // Clear the input if validation fails
        e.target.value = '';
      }
    }
  };

  // Handle file upload button click
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Clear selected files
  const clearFiles = () => {
    setSelectedFiles(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file upload errors for manual validation
  const validateFiles = (files: FileList) => {
    const maxFiles = 5;
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      setTimeout(() => setError(null), 3000);
      return false;
    }

    for (const file of Array.from(files)) {
      if (file.size > maxFileSize) {
        setError(`File "${file.name}" exceeds 10MB limit`);
        setTimeout(() => setError(null), 3000);
        return false;
      }
    }

    return true;
  };

  // Test scenario shortcuts (development only)
  const testScenarios = [
    { key: 'research', label: 'Test Research Phase' },
    { key: 'error', label: 'Test Error Handling' },
  ];

  const handleTestScenario = (scenario: string) => {
    if (onTestScenario) {
      onTestScenario(scenario);
    }
  };

  return (
    <div className={className}>
      {/* Test Scenarios (Development Mode) */}
      {testMode && (
        <div className="mb-4 rounded-[3px] border border-dashed border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950">
          <div className="mb-2 text-sm font-medium text-orange-800 dark:text-orange-200">
            Test Scenarios
          </div>
          <div className="flex flex-wrap gap-2">
            {testScenarios.map((scenario) => (
              <Button
                key={scenario.key}
                onClick={() => handleTestScenario(scenario.key)}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                {scenario.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 rounded-[3px] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* File Preview */}
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="mb-4 rounded-[3px] border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {selectedFiles.length} file(s) attached
            </span>
            <Button
              onClick={clearFiles}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              Remove
            </Button>
          </div>
          <div className="space-y-1">
            {Array.from(selectedFiles).map((file, index) => (
              <div key={index} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{file.name}</span>
                <span>({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        multiple
        accept="image/*,text/*,.pdf,.doc,.docx"
        className="hidden"
      />

      {/* AI Elements PromptInput - Clean Standard Implementation */}
      <PromptInput
        onSubmit={handleSubmit}
        className="bg-[var(--chat-input)]"
      >
        {/* Textarea Input - AI SDK Elements Style */}
        <PromptInputTextarea
          placeholder={
            status === 'submitted' ? 'Mengirim pesan...' :
            disabled ? 'Tunggu...' :
            placeholder
          }
          disabled={disabled || status === 'submitted'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Toolbar with Actions - AI SDK Elements Style */}
        <PromptInputToolbar>
          <PromptInputTools>
            {/* File Upload Button - Using PromptInputButton */}
            <PromptInputButton
              onClick={handleFileUploadClick}
              disabled={disabled}
              variant="ghost"
            >
              <PlusIcon className="h-8 w-8" />
            </PromptInputButton>
          </PromptInputTools>

          {canStop ? (
            <PromptInputButton
              variant="ghost"
              disabled={!onStop}
              onClick={() => {
                if (onStop) {
                  onStop();
                }
              }}
              aria-label="Stop streaming"
              className="text-muted-foreground hover:text-white hover:bg-white/10 dark:hover:bg-white/10"
            >
              <SquareIcon className="h-8 w-8" />
            </PromptInputButton>
          ) : (
            <PromptInputSubmit
              variant="ghost"
              status={status}
              disabled={isSubmitDisabled}
            />
          )}
        </PromptInputToolbar>
      </PromptInput>

    </div>
  );
};

export default ChatInput;
