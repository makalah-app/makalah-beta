'use client';

/**
 * ChatInput - Input component dengan send functionality dan keyboard shortcuts
 *
 * MIGRATED TO AI ELEMENTS:
 * - Uses AI Elements PromptInput components for consistent design
 * - Integrates dengan existing useChat hook sendMessage
 * - Preserves keyboard shortcuts dan file attachment functionality
 *
 * DESIGN COMPLIANCE:
 * - AI Elements styling dengan shadcn/ui base components
 * - Button patterns yang consistent dengan design system
 * - Auto-resize textarea functionality dari AI Elements
 */

import React, { useState, useRef } from 'react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
  type PromptInputMessage,
} from '../ai-elements/prompt-input';
import { Button } from '../ui/button';
import { PlusIcon } from 'lucide-react';

interface ChatInputProps {
  sendMessage: (message: { text: string }) => void; // AI SDK v5 pattern - CreateUIMessage object
  disabled?: boolean;
  status?: 'ready' | 'submitted' | 'streaming' | 'error';
  placeholder?: string;
  className?: string;
  // Testing features
  testMode?: boolean;
  onTestScenario?: (scenario: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  sendMessage,
  disabled = false,
  status = 'ready',
  placeholder = 'Ketik pesan Anda di sini...',
  className = '',
  testMode = false,
  onTestScenario,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle form submission dengan AI Elements pattern
  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim() && !message.files?.length && !selectedFiles?.length) return;
    if (disabled || status !== 'ready') return;

    // Send message using AI SDK sendMessage (AI SDK v5 pattern - CreateUIMessage object)
    const messageText = message.text?.trim() || '';

    // Handle files if present (from PromptInput or selected files)
    const files = message.files?.length ? message.files : selectedFiles;
    if (files?.length) {
      let fileNames;
      if (selectedFiles) {
        fileNames = Array.from(selectedFiles).map(f => f.name).join(', ');
      } else {
        fileNames = message.files?.map(f => f.filename || 'Unknown file').join(', ');
      }
      const messageWithFiles = `${messageText}\n\n[Files attached: ${fileNames}]`;
      sendMessage({ text: messageWithFiles });
      console.log('[ChatInput] Files attached:', files);

      // Clear selected files after sending
      clearFiles();
    } else {
      sendMessage({ text: messageText });
    }
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
    { key: 'approval', label: 'Test Approval Gate' },
    { key: 'artifact', label: 'Test Artifact Generation' },
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
        <div className="mb-4 rounded-lg border border-dashed border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950">
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
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* File Preview */}
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-card p-3">
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

      {/* AI Elements PromptInput - Standardized Style */}
      <PromptInput
        className="rounded-[5px] border-border bg-muted divide-y-0"
        onSubmit={handleSubmit}
      >

        <PromptInputBody>
          {/* Textarea Input - Standardized Style */}
          <PromptInputTextarea
            className="px-5 py-3 text-base border-none bg-transparent placeholder:text-muted-foreground focus:ring-0 focus:outline-none"
            placeholder={disabled ? 'Tunggu...' : placeholder}
            disabled={disabled}
          />

          {/* Toolbar with Actions - Standardized Style */}
          <PromptInputToolbar className="p-2.5">
            <PromptInputTools>
              {/* File Upload Button */}
              <Button
                onClick={handleFileUploadClick}
                disabled={disabled}
                variant="ghost"
                size="icon"
                className="rounded-[5px] text-muted-foreground hover:text-foreground hover:bg-accent h-9 w-9 focus:outline-none focus:ring-0 border-0"
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </PromptInputTools>

            {/* Submit Button - Standardized Style */}
            <PromptInputSubmit
              className="rounded-[5px] bg-accent-500 hover:bg-accent-400 text-white"
              status={status}
              disabled={disabled || status !== 'ready'}
            />
          </PromptInputToolbar>
        </PromptInputBody>
      </PromptInput>

      {/* Status Message */}
      {(status === 'submitted' || status === 'streaming') && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          {status === 'submitted' && (
            <>
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span>Mengirim pesan...</span>
            </>
          )}
          {status === 'streaming' && (
            <>
              <div className="flex gap-1">
                <div className="size-1 animate-bounce rounded-full bg-primary"></div>
                <div className="size-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.1s' }}></div>
                <div className="size-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>AI sedang merespons...</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInput;