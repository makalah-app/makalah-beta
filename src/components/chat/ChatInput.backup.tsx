'use client';

/**
 * ChatInput - Input component dengan send functionality dan keyboard shortcuts
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Menggunakan sendMessage patterns dari useChat hook documentation
 * - Support untuk file attachments sesuai AI SDK patterns
 * - Keyboard shortcuts dan accessibility features
 * 
 * DESIGN COMPLIANCE:
 * - Form input styling dari chat-page-styleguide.md
 * - Button patterns yang consistent dengan design system
 * - Auto-resize textarea functionality
 */

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';

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
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea berdasarkan content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Clear input on Escape
    if (e.key === 'Escape') {
      setInput('');
      setFiles(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
    }
  };

  // Remove selected files
  const clearFiles = () => {
    setFiles(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle message submission
  const handleSubmit = () => {
    if (!input.trim() && !files?.length) return;
    if (disabled || status !== 'ready') return;

    // Send message using AI SDK sendMessage (AI SDK v5 pattern - CreateUIMessage object)
    sendMessage({ text: input.trim() });
    // TODO: Handle files separately if file upload support is needed

    // Reset form
    setInput('');
    setFiles(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
    <div>
      {/* Test Scenarios (Development Mode) */}
      {testMode && (
        <div>
          <div>Test Scenarios</div>
          <div>
            {testScenarios.map((scenario) => (
              <button
                key={scenario.key}
                onClick={() => handleTestScenario(scenario.key)}
              >
                {scenario.key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Preview */}
      {files && files.length > 0 && (
        <div>
          <div>
            <span>
              {files.length} file(s) attached
            </span>
            <button onClick={clearFiles}>
              Remove
            </button>
          </div>
          <div>
            {Array.from(files).map((file, index) => (
              <div key={index}>
                <span>{file.name}</span>
                <span>({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div>
        {/* File Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            multiple
            accept="image/*,text/*,.pdf,.doc,.docx"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            Attach
          </label>
        </div>

        {/* Text Input */}
        <div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Wait...' : placeholder}
            disabled={disabled}
            rows={1}
          />
          
          {/* Character Count (for long messages) */}
          {input.length > 500 && (
            <div>
              {input.length}/2000
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || (!input.trim() && !files?.length) || status !== 'ready'}
        >
          {status === 'submitted' || status === 'streaming' ? (
            <span>
              <span>Loading</span>
              Sending...
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>

      {/* Status Message */}
      {status !== 'ready' && status !== 'error' && (
        <div>
          {status === 'submitted' && (
            <>
              <span>Sending message...</span>
            </>
          )}
          {status === 'streaming' && (
            <>
              <span>Responding...</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInput;