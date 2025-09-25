/**
 * DOCUMENT PROCESSING MIDDLEWARE - AI SDK v5 COMPLIANCE
 * 
 * Implements academic document processing using wrapLanguageModel patterns
 * following documentation from docs/03-ai-sdk-core/40-middleware.mdx
 * 
 * INTEGRATION: Enhances language model behavior with document analysis capabilities
 * without modifying core streaming patterns or protected route functionality
 */

import { 
  wrapLanguageModel, 
  LanguageModel, 
  LanguageModelMiddleware,
  LanguageModelRequest,
  LanguageModelResponse 
} from 'ai';
import { supabaseAdmin } from '../../database/supabase-client';
import { z } from 'zod';

// Document context schema for academic analysis
const DocumentContextSchema = z.object({
  document_id: z.string(),
  document_type: z.enum(['research_paper', 'thesis', 'article', 'book', 'report', 'other']),
  content: z.string(),
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    subject_area: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  processing_results: z.object({
    citations_found: z.number().optional(),
    has_abstract: z.boolean().optional(),
    has_references: z.boolean().optional(),
    word_count: z.number().optional(),
  }).optional(),
});

export type DocumentContext = z.infer<typeof DocumentContextSchema>;

// Document processing configuration
export interface DocumentProcessingConfig {
  enableCitationAnalysis?: boolean;
  enableContentSummary?: boolean;
  enableKeywordExtraction?: boolean;
  maxContentLength?: number;
  academicContext?: {
    currentPhase?: number;
    researchFocus?: string;
    preferredSourceTypes?: string[];
  };
}

/**
 * ACADEMIC DOCUMENT PROCESSING MIDDLEWARE
 * 
 * Middleware that enhances language model with document analysis capabilities
 * Uses wrapLanguageModel pattern per AI SDK v5 documentation
 * 
 * Documentation Reference:
 * /Users/eriksupit/Desktop/makalah/documentation/docs/03-ai-sdk-core/40-middleware.mdx
 */
export function createAcademicDocumentMiddleware(
  config: DocumentProcessingConfig = {}
): LanguageModelMiddleware {
  return {
    transformParams: async ({ params }) => {
      // Extract file references from messages for document context enhancement
      const documentsToProcess = await extractDocumentReferences(params.messages);
      
      if (documentsToProcess.length === 0) {
        return params; // No documents to process, return original params
      }

      // Process documents and enhance system message
      const documentContexts = await Promise.all(
        documentsToProcess.map(docRef => processDocumentForContext(docRef, config))
      );

      // Filter out failed document processing
      const validContexts = documentContexts.filter(ctx => ctx !== null) as DocumentContext[];

      if (validContexts.length === 0) {
        return params; // No valid documents processed
      }

      // Enhance system message with document context
      const enhancedSystemMessage = enhanceSystemMessageWithDocuments(
        params.system || '',
        validContexts,
        config
      );

      return {
        ...params,
        system: enhancedSystemMessage,
      };
    },

    transformResponse: async ({ response }) => {
      // Transform response to include document processing metadata
      return {
        ...response,
        // Add document processing metadata to response
        metadata: {
          ...response.metadata,
          documentProcessingEnabled: true,
          documentsProcessed: response.metadata?.documentsProcessed || 0,
        },
      };
    },
  };
}

/**
 * EXTRACT DOCUMENT REFERENCES FROM MESSAGES
 * Finds file references in messages that need document processing
 */
async function extractDocumentReferences(
  messages: LanguageModelRequest['messages']
): Promise<string[]> {
  const documentIds: string[] = [];

  for (const message of messages) {
    if (typeof message.content === 'string') {
      // Look for file_id patterns in message content
      const fileIdMatches = message.content.match(/file_id:\s*([a-f0-9-]+)/gi);
      if (fileIdMatches) {
        documentIds.push(...fileIdMatches.map(match => match.split(':')[1].trim()));
      }
    }

    // Check for experimental_attachments (from file message integration)
    if ('experimental_attachments' in message && Array.isArray(message.experimental_attachments)) {
      const fileAttachments = message.experimental_attachments
        .filter((attachment: any) => attachment.type === 'file_reference')
        .map((attachment: any) => attachment.file_id);
      
      documentIds.push(...fileAttachments);
    }
  }

  return [...new Set(documentIds)]; // Remove duplicates
}

/**
 * PROCESS DOCUMENT FOR CONTEXT
 * Processes individual document to create context for language model
 */
async function processDocumentForContext(
  documentId: string,
  config: DocumentProcessingConfig
): Promise<DocumentContext | null> {
  try {
    // Get document from database
    const { data: fileRecord, error } = await supabaseAdmin
      .from('chat_files')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !fileRecord) {
      console.warn(`Document processing: File not found ${documentId}`);
      return null;
    }

    // Get document content from storage if needed
    let documentContent = '';
    if (fileRecord.processing_results?.content) {
      documentContent = fileRecord.processing_results.content;
    } else {
      // Try to get content from storage
      const { data: fileData } = await supabaseAdmin.storage
        .from('academic-files')
        .download(fileRecord.storage_path);

      if (fileData) {
        documentContent = await fileData.text();
      }
    }

    // Truncate content if needed
    const maxLength = config.maxContentLength || 3000;
    const truncatedContent = documentContent.substring(0, maxLength);

    // Enhanced document analysis based on config
    const processingResults = await analyzeDocumentContent(
      truncatedContent,
      fileRecord,
      config
    );

    return {
      document_id: documentId,
      document_type: fileRecord.academic_content?.document_type as DocumentContext['document_type'] || 'other',
      content: truncatedContent,
      metadata: {
        title: fileRecord.academic_content?.title,
        author: fileRecord.academic_content?.author,
        subject_area: fileRecord.academic_content?.subject_area,
      },
      processing_results: processingResults,
    };

  } catch (error) {
    console.error(`Document processing error for ${documentId}:`, error);
    return null;
  }
}

/**
 * ANALYZE DOCUMENT CONTENT
 * Performs content analysis based on configuration
 */
async function analyzeDocumentContent(
  content: string,
  fileRecord: any,
  config: DocumentProcessingConfig
) {
  const results: any = {
    word_count: content.split(/\s+/).length,
    has_abstract: content.toLowerCase().includes('abstract'),
    has_references: content.toLowerCase().includes('references') || content.toLowerCase().includes('bibliography'),
  };

  // Citation analysis if enabled
  if (config.enableCitationAnalysis) {
    const citations = content.match(/\[\d+\]|\(\w+,?\s*\d{4}\)/g) || [];
    results.citations_found = citations.length;
    results.citation_format = citations.length > 0 ? 'mixed' : 'none';
  }

  // Keyword extraction if enabled
  if (config.enableKeywordExtraction) {
    const keywords = extractAcademicKeywords(content);
    results.extracted_keywords = keywords;
  }

  // Content summary if enabled
  if (config.enableContentSummary) {
    results.content_summary = generateContentSummary(content);
  }

  return results;
}

/**
 * EXTRACT ACADEMIC KEYWORDS
 * Simple keyword extraction for academic content
 */
function extractAcademicKeywords(content: string): string[] {
  // Academic keyword patterns
  const academicTerms = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  // Filter for academic-sounding terms (length > 4, not common words)
  const commonWords = ['This', 'That', 'These', 'Those', 'However', 'Therefore', 'Moreover'];
  const keywords = academicTerms
    .filter(term => term.length > 4)
    .filter(term => !commonWords.includes(term))
    .slice(0, 10); // Top 10 keywords

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * GENERATE CONTENT SUMMARY
 * Creates brief summary of document content
 */
function generateContentSummary(content: string): string {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Take first and last meaningful sentences as summary
  const summary = sentences.length > 2 
    ? `${sentences[0].trim()}... ${sentences[sentences.length - 1].trim()}`
    : content.substring(0, 200);

  return summary.substring(0, 300); // Limit summary length
}

/**
 * ENHANCE SYSTEM MESSAGE WITH DOCUMENTS
 * Adds document context to system message for better AI processing
 */
function enhanceSystemMessageWithDocuments(
  originalSystem: string,
  documentContexts: DocumentContext[],
  config: DocumentProcessingConfig
): string {
  const documentSummaries = documentContexts.map((doc, index) => {
    const metadata = doc.metadata || {};
    const processing = doc.processing_results || {};
    
    return `
📄 **DOCUMENT ${index + 1}**: ${metadata.title || 'Untitled Document'}
- Type: ${doc.document_type}
- Author: ${metadata.author || 'Unknown'}
- Subject: ${metadata.subject_area || 'General'}
- Content (${processing.word_count || 0} words): ${doc.content.substring(0, 200)}...
- Citations: ${processing.citations_found || 0}
- Has Abstract: ${processing.has_abstract ? 'Yes' : 'No'}
- Has References: ${processing.has_references ? 'Yes' : 'No'}
${processing.extracted_keywords ? `- Keywords: ${processing.extracted_keywords.join(', ')}` : ''}
`;
  }).join('\n');

  const academicContext = config.academicContext ? `
🎓 **ACADEMIC CONTEXT**:
- Current Phase: ${config.academicContext.currentPhase || 'General'}
- Research Focus: ${config.academicContext.researchFocus || 'Broad research'}
- Preferred Sources: ${config.academicContext.preferredSourceTypes?.join(', ') || 'Academic papers'}
` : '';

  return `${originalSystem}

📚 **DOCUMENT ANALYSIS CONTEXT** (${documentContexts.length} documents processed):
${documentSummaries}
${academicContext}

**DOCUMENT PROCESSING INSTRUCTIONS**:
- Reference specific documents by number when relevant
- Cite information from documents when used in responses
- Consider document type and academic context in analysis
- Maintain academic rigor when interpreting document content
- Flag any potential inconsistencies between documents
`;
}

/**
 * CREATE CITATION EXTRACTION MIDDLEWARE
 * Specialized middleware for citation analysis
 */
export function createCitationExtractionMiddleware(): LanguageModelMiddleware {
  return {
    transformParams: async ({ params }) => {
      const enhancedSystem = `${params.system || ''}

🔍 **CITATION ANALYSIS MODE ACTIVATED**:
When analyzing documents or generating responses:
- Extract and validate all citations found
- Identify citation formats (APA, MLA, Chicago, etc.)
- Flag incomplete or malformed citations
- Suggest improvements for citation quality
- Maintain academic integrity standards
`;

      return {
        ...params,
        system: enhancedSystem,
      };
    },
  };
}

/**
 * WRAP MODEL WITH DOCUMENT PROCESSING
 * Convenience function to create document-enhanced language model
 * 
 * Usage Example:
 * const enhancedModel = wrapModelWithDocumentProcessing(baseModel, {
 *   enableCitationAnalysis: true,
 *   maxContentLength: 5000
 * });
 */
export function wrapModelWithDocumentProcessing(
  model: LanguageModel,
  config: DocumentProcessingConfig = {}
): LanguageModel {
  return wrapLanguageModel({
    model,
    middleware: createAcademicDocumentMiddleware(config),
  });
}

/**
 * WRAP MODEL WITH CITATION ANALYSIS
 * Specialized wrapper for citation-focused processing
 */
export function wrapModelWithCitationAnalysis(model: LanguageModel): LanguageModel {
  return wrapLanguageModel({
    model,
    middleware: [
      createAcademicDocumentMiddleware({ enableCitationAnalysis: true }),
      createCitationExtractionMiddleware(),
    ],
  });
}

// Export middleware and utility functions
export {
  type DocumentProcessingConfig,
};