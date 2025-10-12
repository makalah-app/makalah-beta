/**
 * HTML Generation Utility - PHASE 3 IMPLEMENTATION
 *
 * Converts conversation messages to styled HTML for PDF rendering
 *
 * COMPLIANCE:
 * - Server-side utility for Puppeteer PDF generation
 * - Follows global_policy.xml principles (simple, maintainable)
 * - Zero over-engineering
 */

import type { UIMessage } from 'ai';

interface ConversationMeta {
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface MessagePart {
  type: string;
  text?: string;
  toolName?: string;
  toolCallId?: string;
  result?: unknown;
}

/**
 * Extract text content from UIMessage
 */
function extractMessageContent(message: UIMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts
      .map((part: MessagePart) => {
        if (part.type === 'text' && part.text) {
          return part.text;
        }
        if (part.type === 'tool-call' && part.toolName) {
          return `[Tool Call: ${part.toolName}]`;
        }
        if (part.type === 'tool-result') {
          return '[Tool Result]';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return '[Empty message]';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * Format date to Indonesian locale
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate styled HTML document from conversation
 *
 * @param messages - Array of UIMessage objects
 * @param meta - Conversation metadata
 * @returns HTML string ready for Puppeteer PDF rendering
 */
export function generateConversationHTML(
  messages: UIMessage[],
  meta: ConversationMeta
): string {
  const messagesHTML = messages
    .map((msg) => {
      // Using outline-style unicode symbols for consistency with UI
      const roleSymbol = msg.role === 'user' ? '○' : '◇';
      const roleName = msg.role === 'user' ? 'User' : 'Assistant';
      const content = extractMessageContent(msg);
      const escapedContent = escapeHtml(content);

      return `
        <div class="message ${msg.role}">
          <div class="role-header">
            <span class="symbol">${roleSymbol}</span>
            <span class="role-name">${roleName}</span>
          </div>
          <div class="content">${escapedContent}</div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title}</title>
  <style>
    @page {
      margin: 20mm;
      size: A4;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 20px;
      background: white;
    }

    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }

    h1 {
      font-size: 28px;
      font-weight: bold;
      color: #0a0a0a;
      margin-bottom: 15px;
    }

    .metadata {
      font-size: 13px;
      color: #666;
      line-height: 1.8;
    }

    .metadata-label {
      font-weight: bold;
      color: #333;
    }

    .messages {
      margin-top: 20px;
    }

    .message {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }

    .role-header {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .symbol {
      font-size: 18px;
      margin-right: 8px;
    }

    .role-name {
      font-size: 16px;
      font-weight: bold;
      color: #0a0a0a;
    }

    .message.user .role-name {
      color: #2563eb;
    }

    .message.assistant .role-name {
      color: #16a34a;
    }

    .content {
      font-size: 14px;
      color: #333;
      padding-left: 26px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e5e5;
      text-align: center;
      font-size: 12px;
      color: #999;
      font-style: italic;
    }

    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${meta.title}</h1>
    <div class="metadata">
      <div><span class="metadata-label">Dibuat:</span> ${formatDate(meta.created_at)}</div>
      <div><span class="metadata-label">Jumlah Pesan:</span> ${meta.message_count}</div>
      <div><span class="metadata-label">Terakhir Diperbarui:</span> ${formatDate(meta.updated_at)}</div>
    </div>
  </div>

  <div class="messages">
    ${messagesHTML}
  </div>

  <div class="footer">
    Exported from Makalah AI - ${formatDate(new Date().toISOString())}
  </div>
</body>
</html>
  `;
}
