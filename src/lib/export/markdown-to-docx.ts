/**
 * DOCX Export Utility - PHASE 2 IMPLEMENTATION
 *
 * Converts conversation messages to Microsoft Word DOCX format
 *
 * COMPLIANCE:
 * - Uses official docx@9.5.1 package
 * - Client-side conversion (zero server overhead)
 * - Follows global_policy.xml principles (simple, maintainable)
 * - Zero over-engineering
 */

import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
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
 * Handles both string content and parts array
 */
function extractMessageContent(message: UIMessage): string {
  // Handle string content
  if (typeof message.content === 'string') {
    return message.content;
  }

  // Handle parts array (tool calls, text parts, etc.)
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
 * Convert markdown messages to DOCX document
 *
 * @param messages - Array of UIMessage objects
 * @param meta - Conversation metadata
 * @returns Promise<Blob> - DOCX file as blob
 */
export async function convertToDocx(
  messages: UIMessage[],
  meta: ConversationMeta
): Promise<Blob> {
  // Build document sections
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: meta.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    })
  );

  // Metadata
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Dibuat: ', bold: true }),
        new TextRun(new Date(meta.created_at).toLocaleString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }))
      ],
      spacing: { after: 100 }
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Jumlah Pesan: ', bold: true }),
        new TextRun(meta.message_count.toString())
      ],
      spacing: { after: 100 }
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Terakhir Diperbarui: ', bold: true }),
        new TextRun(new Date(meta.updated_at).toLocaleString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }))
      ],
      spacing: { after: 200 }
    })
  );

  // Separator
  sections.push(
    new Paragraph({
      text: '───────────────────────────────────────────────────────────────────',
      spacing: { after: 200 }
    })
  );

  // Messages
  messages.forEach((msg) => {
    // Role header - using outline-style unicode symbols for consistency
    const roleSymbol = msg.role === 'user' ? '○' : '◇';
    const roleName = msg.role === 'user' ? 'User' : 'Assistant';

    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${roleSymbol} ${roleName}`, bold: true, size: 28 })
        ],
        spacing: { before: 200, after: 100 }
      })
    );

    // Message content
    const content = extractMessageContent(msg);

    // Simple paragraph (future: expand untuk markdown parsing)
    sections.push(
      new Paragraph({
        text: content,
        spacing: { after: 200 }
      })
    );
  });

  // Footer separator
  sections.push(
    new Paragraph({
      text: '───────────────────────────────────────────────────────────────────',
      spacing: { before: 200, after: 100 }
    })
  );

  // Footer
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported from Makalah AI - ${new Date().toLocaleString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          italics: true
        })
      ]
    })
  );

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });

  // Generate blob
  return await Packer.toBlob(doc);
}
