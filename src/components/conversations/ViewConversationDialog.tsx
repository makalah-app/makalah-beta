'use client';

import { useEffect, useState } from 'react';
import { UIMessage } from 'ai';
import { Download, RefreshCw, AlertCircle, ChevronDown, FileText, User, Bot, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { convertToDocx } from '@/lib/export/markdown-to-docx';

/**
 * ViewConversationDialog - Modal untuk melihat dan mengunduh isi percakapan
 *
 * FEATURES:
 * - View conversation messages dalam format markdown
 * - Auto-fetch messages saat dialog dibuka
 * - Download conversation sebagai .md file
 * - Loading & error states
 * - Responsive scrolling untuk long conversations
 *
 * COMPLIANCE:
 * - Uses shadcn/ui Dialog component
 * - Follows global_policy.xml principles (simple, maintainable)
 * - Zero over-engineering
 */

interface ViewConversationDialogProps {
  conversationId: string | null;
  conversationTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConversationMeta {
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

export function ViewConversationDialog({
  conversationId,
  conversationTitle,
  open,
  onOpenChange,
}: ViewConversationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [conversationMeta, setConversationMeta] = useState<ConversationMeta | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<string | null>(null);

  // Auto-fetch on dialog open
  useEffect(() => {
    if (open && conversationId) {
      fetchConversationMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationId]);

  /**
   * Fetch conversation messages from API
   */
  const fetchConversationMessages = async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}?includeMessages=true`
      );

      if (!response.ok) {
        throw new Error('Gagal memuat percakapan');
      }

      const data = await response.json();

      setMessages(data.messages || []);
      setConversationMeta({
        created_at: data.conversation.created_at,
        updated_at: data.conversation.updated_at,
        message_count: data.metadata.messageCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Extract text content from UIMessage
   * AI SDK v5 uses parts array for message content
   */
  const extractMessageContent = (message: UIMessage): string => {
    // Handle parts array (AI SDK v5 format)
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
  };

  /**
   * Format role untuk markdown headers
   * Uses outline-style unicode symbols for consistency with UI
   */
  const formatRole = (role: string): string => {
    const roleMap: Record<string, string> = {
      user: '## ○ User',
      assistant: '## ◇ Assistant',
      system: '## ◎ System',
    };
    return roleMap[role] || `## ${role}`;
  };

  /**
   * Convert messages to markdown format
   */
  const convertMessagesToMarkdown = (): string => {
    if (!conversationMeta) return '';

    const header = `# ${conversationTitle}

**Dibuat:** ${new Date(conversationMeta.created_at).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}
**Jumlah Pesan:** ${conversationMeta.message_count}
**Terakhir Diperbarui:** ${new Date(conversationMeta.updated_at).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}

---

`;

    const messagesContent = messages
      .map((msg) => {
        const roleHeader = formatRole(msg.role);
        const content = extractMessageContent(msg);
        return `${roleHeader}\n\n${content}\n`;
      })
      .join('\n');

    const footer = `\n---

*Exported from Makalah AI - ${new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}*
`;

    return header + messagesContent + footer;
  };

  /**
   * Format date untuk filename (YYYY-MM-DD)
   */
  const formatDateForFilename = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Handle download with multiple format support
   */
  const handleDownload = async (format: 'md' | 'docx' | 'pdf') => {
    setDownloading(true);
    setDownloadFormat(format);

    try {
      if (format === 'md') {
        // Markdown download (existing logic)
        const markdownContent = convertMessagesToMarkdown();
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });

        const sanitizedTitle = conversationTitle
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .substring(0, 50);
        const filename = `percakapan-${sanitizedTitle}-${formatDateForFilename(new Date())}.md`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (format === 'docx') {
        // DOCX download - Phase 2 implementation
        if (!conversationMeta) {
          throw new Error('Metadata percakapan tidak tersedia');
        }

        const blob = await convertToDocx(messages, {
          title: conversationTitle,
          created_at: conversationMeta.created_at,
          updated_at: conversationMeta.updated_at,
          message_count: conversationMeta.message_count
        });

        const sanitizedTitle = conversationTitle
          .replace(/[^a-z0-9\s-]/gi, '')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .substring(0, 50);
        const filename = `percakapan-${sanitizedTitle}-${formatDateForFilename(new Date())}.docx`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // PDF download - Phase 3 implementation (server-side)
        if (!conversationId) {
          throw new Error('ID percakapan tidak tersedia');
        }

        const response = await fetch('/api/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'PDF generation failed');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Extract filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch?.[1] || `percakapan-${conversationId}.pdf`;

        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // Error handling with toast notification
      toast({
        variant: "destructive",
        title: "Download gagal",
        description: error instanceof Error ? error.message : `Gagal mengunduh file ${format.toUpperCase()}.`
      });
    } finally {
      setDownloading(false);
      setDownloadFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{conversationTitle}</DialogTitle>
          {conversationMeta && (
            <DialogDescription>
              {conversationMeta.message_count} pesan • Dibuat{' '}
              {new Date(conversationMeta.created_at).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memuat percakapan...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Gagal memuat percakapan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content - Scrollable message list */}
        {!loading && !error && messages.length > 0 && (
          <ScrollArea className="h-[50vh] w-full pr-4">
            <div className="space-y-6">
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                const RoleIcon = isUser ? User : Bot;
                const roleLabel = isUser ? 'User' : 'Assistant';
                const content = extractMessageContent(message);

                return (
                  <div key={message.id || index} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <RoleIcon className="h-4 w-4" />
                      <span>{roleLabel}</span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                      {content}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Empty State */}
        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">Percakapan ini belum memiliki pesan</p>
          </div>
        )}

        <DialogFooter>
          {/* Download Progress Indicator */}
          {downloading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating {downloadFormat?.toUpperCase()}...
            </div>
          )}

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={loading || messages.length === 0 || downloading}>
                <Download className="mr-2 h-4 w-4" />
                Unduh
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleDownload('md')}>
                <FileText className="mr-2 h-4 w-4" />
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('docx')}>
                <FileText className="mr-2 h-4 w-4" />
                Word Document (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                PDF Document (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
