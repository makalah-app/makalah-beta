/**
 * Format Converter Utilities for Academic Documents
 * 
 * Comprehensive format conversion utilities for academic documents,
 * supporting multiple input/output formats, citation styles, and
 * document structure transformations.
 * 
 * Features:
 * - Document format conversions (Markdown, HTML, LaTeX, DOCX, PDF)
 * - Citation style transformations (APA, MLA, Chicago, Harvard)
 * - Academic structure formatting
 * - Bibliography management and conversion
 * - Export/import utilities for various academic formats
 * 
 * @module FormatConverter
 * @version 1.0.0
 */

import {
  Document,
  DocumentSection,
  BibliographyEntry,
  CitationType,
  Author,
  ContentMetadata
} from '../config/system-types';
import type { AcademicPhase } from '../types';

/**
 * Supported document formats
 */
export type DocumentFormat = 
  | 'markdown'
  | 'html'
  | 'latex'
  | 'docx'
  | 'pdf'
  | 'json'
  | 'xml'
  | 'rtf'
  | 'odt';

/**
 * Supported citation styles
 */
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee' | 'ama';

/**
 * Conversion options
 */
export interface ConversionOptions {
  format: DocumentFormat;
  citationStyle?: CitationStyle;
  includeMetadata?: boolean;
  includeBibliography?: boolean;
  formatting?: FormattingOptions;
  template?: string;
  customSettings?: Record<string, unknown>;
}

/**
 * Formatting options
 */
export interface FormattingOptions {
  fontSize?: number;
  fontFamily?: string;
  lineSpacing?: number;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  pageSize?: 'A4' | 'Letter' | 'Legal';
  pageOrientation?: 'portrait' | 'landscape';
  headers?: boolean;
  footers?: boolean;
  pageNumbers?: boolean;
  tableOfContents?: boolean;
}

/**
 * Conversion result
 */
export interface ConversionResult {
  success: boolean;
  content: string | Buffer;
  format: DocumentFormat;
  metadata: ConversionMetadata;
  warnings?: string[];
  errors?: string[];
}

/**
 * Conversion metadata
 */
export interface ConversionMetadata {
  sourceFormat: DocumentFormat;
  targetFormat: DocumentFormat;
  convertedAt: Date;
  fileSize: number;
  pageCount?: number;
  wordCount: number;
  processingTime: number;
  converter: string;
  version: string;
}

/**
 * Citation formatting result
 */
export interface CitationFormatResult {
  inText: string;
  bibliography: string;
  style: CitationStyle;
  valid: boolean;
  warnings?: string[];
}

/**
 * Template configuration
 */
export interface DocumentTemplate {
  name: string;
  description: string;
  format: DocumentFormat;
  structure: TemplateStructure;
  styles: TemplateStyles;
  metadata: TemplateMetadata;
}

/**
 * Template structure
 */
export interface TemplateStructure {
  requiredSections: string[];
  optionalSections: string[];
  sectionOrder: string[];
  hierarchyLevels: number;
  numbering: boolean;
}

/**
 * Template styles
 */
export interface TemplateStyles {
  headings: Record<number, HeadingStyle>;
  paragraphs: ParagraphStyle;
  citations: CitationStyle;
  bibliography: BibliographyStyle;
  tables: TableStyle;
  figures: FigureStyle;
}

/**
 * Heading style configuration
 */
export interface HeadingStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  alignment: 'left' | 'center' | 'right' | 'justify';
  spacing: { before: number; after: number };
  numbering: boolean;
}

/**
 * Paragraph style configuration
 */
export interface ParagraphStyle {
  fontSize: number;
  lineHeight: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
  indentation: { first: number; left: number; right: number };
  spacing: { before: number; after: number };
}

/**
 * Bibliography style configuration
 */
export interface BibliographyStyle {
  format: CitationStyle;
  alignment: 'left' | 'center' | 'right' | 'justify';
  hangingIndent: number;
  spacing: { between: number };
  sorting: 'alphabetical' | 'chronological' | 'appearance';
}

/**
 * Table style configuration
 */
export interface TableStyle {
  borderStyle: 'none' | 'simple' | 'grid';
  headerStyle: 'bold' | 'background' | 'both';
  alignment: 'left' | 'center' | 'right';
  spacing: { cellPadding: number };
}

/**
 * Figure style configuration
 */
export interface FigureStyle {
  alignment: 'left' | 'center' | 'right';
  captionPosition: 'above' | 'below';
  captionStyle: ParagraphStyle;
  numbering: boolean;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  version: string;
  author: string;
  created: Date;
  modified: Date;
  category: 'academic' | 'thesis' | 'journal' | 'conference' | 'report';
  discipline?: string;
  institution?: string;
}

/**
 * Format Converter Service
 * 
 * Main service for converting between different academic document formats
 */
export class FormatConverterService {
  private templates: Map<string, DocumentTemplate> = new Map();
  private citationFormatters: Map<CitationStyle, CitationFormatter> = new Map();

  constructor() {
    this.initializeTemplates();
    this.initializeCitationFormatters();
  }

  /**
   * Convert document to specified format
   */
  async convertDocument(
    document: Document,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      let content: string;
      
      switch (options.format) {
        case 'markdown':
          content = this.convertToMarkdown(document, options);
          break;
        case 'html':
          content = this.convertToHtml(document, options);
          break;
        case 'latex':
          content = this.convertToLatex(document, options);
          break;
        case 'json':
          content = this.convertToJson(document, options);
          break;
        case 'xml':
          content = this.convertToXml(document, options);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      const processingTime = Date.now() - startTime;
      const wordCount = this.countWords(content);

      return {
        success: true,
        content,
        format: options.format,
        metadata: {
          sourceFormat: 'json', // Assuming source is our internal format
          targetFormat: options.format,
          convertedAt: new Date(),
          fileSize: Buffer.byteLength(content, 'utf8'),
          wordCount,
          processingTime,
          converter: 'FormatConverterService',
          version: '1.0.0'
        }
      };

    } catch (error) {
      return {
        success: false,
        content: '',
        format: options.format,
        metadata: {
          sourceFormat: 'json',
          targetFormat: options.format,
          convertedAt: new Date(),
          fileSize: 0,
          wordCount: 0,
          processingTime: Date.now() - startTime,
          converter: 'FormatConverterService',
          version: '1.0.0'
        },
        errors: [String(error)]
      };
    }
  }

  /**
   * Convert citation to specified style
   */
  formatCitation(
    entry: BibliographyEntry,
    style: CitationStyle,
    type: 'in-text' | 'bibliography' = 'bibliography'
  ): CitationFormatResult {
    const formatter = this.citationFormatters.get(style);
    
    if (!formatter) {
      return {
        inText: '',
        bibliography: '',
        style,
        valid: false,
        warnings: [`Unsupported citation style: ${style}`]
      };
    }

    try {
      const result = type === 'in-text' ? 
        formatter.formatInText(entry) : 
        formatter.formatBibliography(entry);

      return {
        inText: type === 'in-text' ? result : '',
        bibliography: type === 'bibliography' ? result : '',
        style,
        valid: true
      };

    } catch (error) {
      return {
        inText: '',
        bibliography: '',
        style,
        valid: false,
        warnings: [String(error)]
      };
    }
  }

  /**
   * Convert bibliography to different citation style
   */
  convertBibliography(
    entries: BibliographyEntry[],
    fromStyle: CitationStyle,
    toStyle: CitationStyle
  ): BibliographyEntry[] {
    // For this implementation, we'll return the entries as-is
    // In a real implementation, this would involve parsing and reformatting
    return entries.map(entry => ({
      ...entry,
      // Additional metadata could be added here
    }));
  }

  /**
   * Extract document structure from formatted text
   */
  parseDocumentStructure(
    content: string,
    format: DocumentFormat
  ): DocumentSection[] {
    switch (format) {
      case 'markdown':
        return this.parseMarkdownStructure(content);
      case 'html':
        return this.parseHtmlStructure(content);
      case 'latex':
        return this.parseLatexStructure(content);
      default:
        return this.parseGenericStructure(content);
    }
  }

  /**
   * Apply template to document
   */
  async applyTemplate(
    document: Document,
    templateName: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      return {
        success: false,
        content: '',
        format: options.format,
        metadata: this.createEmptyMetadata(options.format),
        errors: [`Template not found: ${templateName}`]
      };
    }

    // Apply template styles and structure
    const styledDocument = this.applyTemplateStyles(document, template);

    return await this.convertDocument(styledDocument, {
      ...options,
      template: templateName
    });
  }

  /**
   * Private conversion methods
   */
  private convertToMarkdown(document: Document, options: ConversionOptions): string {
    let markdown = '';

    // Add title
    if (document.title) {
      markdown += `# ${document.title}\n\n`;
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      markdown += this.generateMarkdownMetadata(document);
    }

    // Add abstract if available
    if (document.content.abstract) {
      markdown += `## Abstract\n\n${document.content.abstract}\n\n`;
    }

    // Convert sections
    for (const section of document.content.sections.sort((a, b) => a.order - b.order)) {
      markdown += this.sectionToMarkdown(section);
    }

    // Add bibliography if requested
    if (options.includeBibliography && document.content.bibliography.length > 0) {
      markdown += this.bibliographyToMarkdown(document.content.bibliography, options.citationStyle);
    }

    return markdown;
  }

  private convertToHtml(document: Document, options: ConversionOptions): string {
    let html = this.getHtmlHeader(document.title, options);

    // Add title
    if (document.title) {
      html += `<h1>${this.escapeHtml(document.title)}</h1>\n`;
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      html += this.generateHtmlMetadata(document);
    }

    // Add abstract if available
    if (document.content.abstract) {
      html += `<section id="abstract">\n<h2>Abstract</h2>\n<p>${this.escapeHtml(document.content.abstract)}</p>\n</section>\n`;
    }

    // Convert sections
    for (const section of document.content.sections.sort((a, b) => a.order - b.order)) {
      html += this.sectionToHtml(section);
    }

    // Add bibliography if requested
    if (options.includeBibliography && document.content.bibliography.length > 0) {
      html += this.bibliographyToHtml(document.content.bibliography, options.citationStyle);
    }

    html += this.getHtmlFooter();
    return html;
  }

  private convertToLatex(document: Document, options: ConversionOptions): string {
    let latex = this.getLatexHeader(options);

    // Add title and metadata
    latex += `\\title{${this.escapeLatex(document.title || 'Untitled')}}\n`;
    latex += `\\author{${this.escapeLatex(document.createdBy || 'Anonymous')}}\n`;
    latex += `\\date{${new Date().toLocaleDateString()}}\n`;
    latex += `\\maketitle\n\n`;

    // Add abstract if available
    if (document.content.abstract) {
      latex += `\\begin{abstract}\n${this.escapeLatex(document.content.abstract)}\n\\end{abstract}\n\n`;
    }

    // Convert sections
    for (const section of document.content.sections.sort((a, b) => a.order - b.order)) {
      latex += this.sectionToLatex(section);
    }

    // Add bibliography if requested
    if (options.includeBibliography && document.content.bibliography.length > 0) {
      latex += this.bibliographyToLatex(document.content.bibliography, options.citationStyle);
    }

    latex += `\\end{document}\n`;
    return latex;
  }

  private convertToJson(document: Document, options: ConversionOptions): string {
    const jsonDoc = {
      title: document.title,
      description: document.description,
      type: document.type,
      status: document.status,
      content: document.content,
      metadata: options.includeMetadata ? document.metadata : undefined,
      tags: document.tags,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      version: document.version
    };

    return JSON.stringify(jsonDoc, null, 2);
  }

  private convertToXml(document: Document, options: ConversionOptions): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<document>\n';
    xml += `  <title>${this.escapeXml(document.title || 'Untitled')}</title>\n`;
    xml += `  <type>${document.type}</type>\n`;
    xml += `  <status>${document.status}</status>\n`;

    if (options.includeMetadata) {
      xml += '  <metadata>\n';
      xml += `    <created>${document.createdAt.toISOString()}</created>\n`;
      xml += `    <modified>${document.updatedAt.toISOString()}</modified>\n`;
      xml += `    <version>${document.version}</version>\n`;
      xml += '  </metadata>\n';
    }

    xml += '  <content>\n';
    
    if (document.content.abstract) {
      xml += `    <abstract>${this.escapeXml(document.content.abstract)}</abstract>\n`;
    }

    xml += '    <sections>\n';
    for (const section of document.content.sections.sort((a, b) => a.order - b.order)) {
      xml += this.sectionToXml(section);
    }
    xml += '    </sections>\n';

    if (options.includeBibliography && document.content.bibliography.length > 0) {
      xml += '    <bibliography>\n';
      for (const entry of document.content.bibliography) {
        xml += this.bibliographyEntryToXml(entry);
      }
      xml += '    </bibliography>\n';
    }

    xml += '  </content>\n';
    xml += '</document>\n';

    return xml;
  }

  /**
   * Section conversion helpers
   */
  private sectionToMarkdown(section: DocumentSection): string {
    const headingLevel = this.getHeadingLevel(section.type);
    const headingPrefix = '#'.repeat(headingLevel);
    
    return `${headingPrefix} ${section.title}\n\n${section.content}\n\n`;
  }

  private sectionToHtml(section: DocumentSection): string {
    const headingLevel = this.getHeadingLevel(section.type);
    const sectionId = section.id.replace(/[^a-zA-Z0-9-]/g, '-');
    
    return `<section id="${sectionId}">\n<h${headingLevel}>${this.escapeHtml(section.title)}</h${headingLevel}>\n${this.markdownToHtml(section.content)}\n</section>\n`;
  }

  private sectionToLatex(section: DocumentSection): string {
    const sectionCommand = this.getLatexSectionCommand(section.type);
    return `\\${sectionCommand}{${this.escapeLatex(section.title)}}\n${this.escapeLatex(section.content)}\n\n`;
  }

  private sectionToXml(section: DocumentSection): string {
    return `      <section id="${section.id}" type="${section.type}" order="${section.order}">\n` +
           `        <title>${this.escapeXml(section.title)}</title>\n` +
           `        <content>${this.escapeXml(section.content)}</content>\n` +
           `      </section>\n`;
  }

  /**
   * Bibliography conversion helpers
   */
  private bibliographyToMarkdown(entries: BibliographyEntry[], style?: CitationStyle): string {
    let markdown = '## References\n\n';
    
    for (const entry of entries) {
      const formatted = this.formatCitation(entry, style || 'apa', 'bibliography');
      markdown += `- ${formatted.bibliography}\n`;
    }
    
    return markdown + '\n';
  }

  private bibliographyToHtml(entries: BibliographyEntry[], style?: CitationStyle): string {
    let html = '<section id="bibliography">\n<h2>References</h2>\n<ol>\n';
    
    for (const entry of entries) {
      const formatted = this.formatCitation(entry, style || 'apa', 'bibliography');
      html += `<li>${this.escapeHtml(formatted.bibliography)}</li>\n`;
    }
    
    html += '</ol>\n</section>\n';
    return html;
  }

  private bibliographyToLatex(entries: BibliographyEntry[], style?: CitationStyle): string {
    let latex = '\\begin{thebibliography}{99}\n';
    
    for (const entry of entries) {
      const formatted = this.formatCitation(entry, style || 'apa', 'bibliography');
      latex += `\\bibitem{${entry.id}} ${this.escapeLatex(formatted.bibliography)}\n`;
    }
    
    latex += '\\end{thebibliography}\n';
    return latex;
  }

  private bibliographyEntryToXml(entry: BibliographyEntry): string {
    return `      <entry id="${entry.id}" type="${entry.type}">\n` +
           `        <authors>${entry.authors.map(a => `${a.firstName} ${a.lastName}`).join(', ')}</authors>\n` +
           `        <title>${this.escapeXml(entry.title)}</title>\n` +
           `        <year>${entry.year}</year>\n` +
           (entry.publication ? `        <publication>${this.escapeXml(entry.publication)}</publication>\n` : '') +
           (entry.doi ? `        <doi>${entry.doi}</doi>\n` : '') +
           `      </entry>\n`;
  }

  /**
   * Utility methods
   */
  private getHeadingLevel(sectionType: string): number {
    const levels: Record<string, number> = {
      'title': 1,
      'abstract': 2,
      'introduction': 2,
      'literature-review': 2,
      'methodology': 2,
      'results': 2,
      'discussion': 2,
      'conclusion': 2,
      'references': 2,
      'custom': 3
    };
    
    return levels[sectionType] || 3;
  }

  private getLatexSectionCommand(sectionType: string): string {
    const commands: Record<string, string> = {
      'title': 'section',
      'abstract': 'section',
      'introduction': 'section',
      'literature-review': 'section',
      'methodology': 'section',
      'results': 'section',
      'discussion': 'section',
      'conclusion': 'section',
      'references': 'section',
      'custom': 'subsection'
    };
    
    return commands[sectionType] || 'subsection';
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeLatex(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\$/g, '\\$')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/#/g, '\\#')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\textasciitilde{}');
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private markdownToHtml(markdown: string): string {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p>\n<p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private getHtmlHeader(title: string, options: ConversionOptions): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title || 'Academic Document')}</title>
    <style>
        body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 2cm; }
        h1, h2, h3, h4, h5, h6 { color: #333; }
        .abstract { font-style: italic; margin: 2em 0; }
        .bibliography ol { list-style-type: none; }
        .bibliography li { margin-bottom: 1em; }
    </style>
</head>
<body>
`;
  }

  private getHtmlFooter(): string {
    return '</body>\n</html>';
  }

  private getLatexHeader(options: ConversionOptions): string {
    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{setspace}
\\usepackage{cite}
\\geometry{margin=2.5cm}
\\doublespacing

\\begin{document}
`;
  }

  private generateMarkdownMetadata(document: Document): string {
    return `---
title: "${document.title}"
type: ${document.type}
status: ${document.status}
created: ${document.createdAt.toISOString()}
modified: ${document.updatedAt.toISOString()}
tags: [${document.tags.join(', ')}]
---

`;
  }

  private generateHtmlMetadata(document: Document): string {
    return `<div class="document-metadata">
    <p><strong>Type:</strong> ${document.type}</p>
    <p><strong>Status:</strong> ${document.status}</p>
    <p><strong>Created:</strong> ${document.createdAt.toLocaleDateString()}</p>
    <p><strong>Last Modified:</strong> ${document.updatedAt.toLocaleDateString()}</p>
    <p><strong>Tags:</strong> ${document.tags.join(', ')}</p>
</div>

`;
  }

  private parseMarkdownStructure(content: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = content.split('\n');
    let currentSection: Partial<DocumentSection> | null = null;
    let sectionContent = '';
    let order = 0;

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        // Save previous section
        if (currentSection && sectionContent.trim()) {
          sections.push({
            ...currentSection,
            content: sectionContent.trim(),
            order: order++
          } as DocumentSection);
        }

        // Start new section
        currentSection = {
          id: `section-${order}`,
          title: headingMatch[2],
          type: 'custom'
        };
        sectionContent = '';
      } else {
        sectionContent += line + '\n';
      }
    }

    // Handle last section
    if (currentSection && sectionContent.trim()) {
      sections.push({
        ...currentSection,
        content: sectionContent.trim(),
        order: order++
      } as DocumentSection);
    }

    return sections;
  }

  private parseHtmlStructure(content: string): DocumentSection[] {
    // Simplified HTML parsing - would use a proper HTML parser in production
    const sections: DocumentSection[] = [];
    const sectionRegex = /<section[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g;
    let match;
    let order = 0;

    while ((match = sectionRegex.exec(content)) !== null) {
      const titleMatch = match[2].match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/);
      const contentMatch = match[2].replace(/<h[1-6][^>]*>[^<]+<\/h[1-6]>/, '');
      
      if (titleMatch) {
        sections.push({
          id: match[1],
          title: titleMatch[1],
          type: 'custom',
          content: contentMatch.replace(/<[^>]*>/g, '').trim(),
          order: order++,
          metadata: {
            wordCount: 0,
            citationCount: 0,
            lastModified: new Date(),
            phase: 'content_drafting',
            persona: 'academic-writer',
            aiGenerated: false,
            humanEdited: true
          }
        });
      }
    }

    return sections;
  }

  private parseLatexStructure(content: string): DocumentSection[] {
    // Simplified LaTeX parsing
    const sections: DocumentSection[] = [];
    const sectionRegex = /\\(section|subsection|subsubsection)\{([^}]+)\}([\s\S]*?)(?=\\(?:section|subsection|subsubsection|end\{document\}))/g;
    let match;
    let order = 0;

    while ((match = sectionRegex.exec(content)) !== null) {
      sections.push({
        id: `section-${order}`,
        title: match[2],
        type: 'custom',
        content: match[3].trim(),
        order: order++,
        metadata: {
          wordCount: 0,
          citationCount: 0,
          lastModified: new Date(),
          phase: 'content_drafting',
          persona: 'academic-writer',
          aiGenerated: false,
          humanEdited: true
        }
      });
    }

    return sections;
  }

  private parseGenericStructure(content: string): DocumentSection[] {
    // Fallback generic parsing
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return paragraphs.map((paragraph, index) => ({
      id: `section-${index}`,
      title: `Section ${index + 1}`,
      type: 'custom',
      content: paragraph.trim(),
      order: index,
      metadata: {
        wordCount: paragraph.trim().split(/\s+/).length,
        citationCount: 0,
        lastModified: new Date(),
        phase: 'content_drafting',
        persona: 'academic-writer',
        aiGenerated: false,
        humanEdited: true
      }
    }));
  }

  private applyTemplateStyles(document: Document, template: DocumentTemplate): Document {
    // Apply template styles to document
    // This would involve modifying the document structure and content
    // based on the template configuration
    return {
      ...document,
      // Template styles would be applied here
    };
  }

  private createEmptyMetadata(format: DocumentFormat): ConversionMetadata {
    return {
      sourceFormat: 'json',
      targetFormat: format,
      convertedAt: new Date(),
      fileSize: 0,
      wordCount: 0,
      processingTime: 0,
      converter: 'FormatConverterService',
      version: '1.0.0'
    };
  }

  private initializeTemplates(): void {
    // Initialize standard academic templates
    this.templates.set('academic-paper', {
      name: 'Academic Paper',
      description: 'Standard academic paper template',
      format: 'markdown',
      structure: {
        requiredSections: ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion', 'references'],
        optionalSections: ['acknowledgments', 'appendix'],
        sectionOrder: ['abstract', 'introduction', 'literature-review', 'methodology', 'results', 'discussion', 'conclusion', 'references'],
        hierarchyLevels: 3,
        numbering: true
      },
      styles: {
        headings: {
          1: { fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', alignment: 'center', spacing: { before: 12, after: 6 }, numbering: false },
          2: { fontSize: 14, fontWeight: 'bold', fontStyle: 'normal', alignment: 'left', spacing: { before: 12, after: 6 }, numbering: true },
          3: { fontSize: 12, fontWeight: 'bold', fontStyle: 'normal', alignment: 'left', spacing: { before: 6, after: 3 }, numbering: true }
        },
        paragraphs: {
          fontSize: 12,
          lineHeight: 1.6,
          alignment: 'justify',
          indentation: { first: 0, left: 0, right: 0 },
          spacing: { before: 0, after: 6 }
        },
        citations: 'apa',
        bibliography: {
          format: 'apa',
          alignment: 'left',
          hangingIndent: 36,
          spacing: { between: 6 },
          sorting: 'alphabetical'
        },
        tables: {
          borderStyle: 'simple',
          headerStyle: 'bold',
          alignment: 'center',
          spacing: { cellPadding: 6 }
        },
        figures: {
          alignment: 'center',
          captionPosition: 'below',
          captionStyle: {
            fontSize: 10,
            lineHeight: 1.2,
            alignment: 'center',
            indentation: { first: 0, left: 0, right: 0 },
            spacing: { before: 6, after: 12 }
          },
          numbering: true
        }
      },
      metadata: {
        version: '1.0.0',
        author: 'FormatConverterService',
        created: new Date(),
        modified: new Date(),
        category: 'academic'
      }
    });
  }

  private initializeCitationFormatters(): void {
    // Initialize citation formatters for different styles
    this.citationFormatters.set('apa', new APACitationFormatter());
    this.citationFormatters.set('mla', new MLACitationFormatter());
    this.citationFormatters.set('chicago', new ChicagoCitationFormatter());
    this.citationFormatters.set('harvard', new HarvardCitationFormatter());
  }

  /**
   * P0.2 INTEGRATION: Quick snapshot formatting method
   */
  formatSnapshot(
    snapshot: any,
    phase: number,
    format: 'system-message' | 'markdown' | 'compressed' = 'system-message'
  ): string {
    if (this instanceof FormatConverterServiceExtended) {
      const result = this.formatSnapshotForContext(snapshot, phase, { format });
      return result.content;
    }

    // Fallback for legacy service
    return JSON.stringify(snapshot, null, 2);
  }
}

/**
 * Abstract citation formatter
 */
abstract class CitationFormatter {
  abstract formatInText(entry: BibliographyEntry): string;
  abstract formatBibliography(entry: BibliographyEntry): string;
  
  protected formatAuthors(authors: Author[], style: 'full' | 'last-first' | 'initials' = 'full'): string {
    if (authors.length === 0) return '';
    
    const formatAuthor = (author: Author) => {
      switch (style) {
        case 'last-first':
          return `${author.lastName}, ${author.firstName}`;
        case 'initials':
          return `${author.firstName[0]}. ${author.lastName}`;
        default:
          return `${author.firstName} ${author.lastName}`;
      }
    };

    if (authors.length === 1) {
      return formatAuthor(authors[0]);
    } else if (authors.length === 2) {
      return `${formatAuthor(authors[0])} & ${formatAuthor(authors[1])}`;
    } else {
      const firstAuthor = formatAuthor(authors[0]);
      return `${firstAuthor} et al.`;
    }
  }
}

/**
 * APA Citation Formatter
 */
class APACitationFormatter extends CitationFormatter {
  formatInText(entry: BibliographyEntry): string {
    const authors = this.formatAuthors(entry.authors, 'full');
    return `(${authors}, ${entry.year})`;
  }

  formatBibliography(entry: BibliographyEntry): string {
    const authors = this.formatAuthors(entry.authors, 'last-first');
    let citation = `${authors} (${entry.year}). ${entry.title}`;
    
    if (entry.publication) {
      citation += `. ${entry.publication}`;
    }
    
    if (entry.volume) {
      citation += `, ${entry.volume}`;
    }
    
    if (entry.pages) {
      citation += `, ${entry.pages}`;
    }
    
    if (entry.doi) {
      citation += `. https://doi.org/${entry.doi}`;
    }
    
    return citation + '.';
  }
}

/**
 * MLA Citation Formatter
 */
class MLACitationFormatter extends CitationFormatter {
  formatInText(entry: BibliographyEntry): string {
    const authors = this.formatAuthors(entry.authors, 'full');
    return `(${authors} ${entry.pages || entry.year})`;
  }

  formatBibliography(entry: BibliographyEntry): string {
    const authors = this.formatAuthors(entry.authors, 'last-first');
    let citation = `${authors}. "${entry.title}."`;
    
    if (entry.publication) {
      citation += ` ${entry.publication}`;
    }
    
    if (entry.volume) {
      citation += `, vol. ${entry.volume}`;
    }
    
    if (entry.issue) {
      citation += `, no. ${entry.issue}`;
    }
    
    citation += `, ${entry.year}`;
    
    if (entry.pages) {
      citation += `, pp. ${entry.pages}`;
    }
    
    return citation + '.';
  }
}

/**
 * Chicago Citation Formatter
 */
class ChicagoCitationFormatter extends CitationFormatter {
  formatInText(entry: BibliographyEntry): string {
    const authors = this.formatAuthors(entry.authors, 'full');
    return `(${authors} ${entry.year})`;
  }

  formatBibliography(entry: BibliographyEntry): string {
    const authors = this.formatAuthors(entry.authors, 'last-first');
    let citation = `${authors}. "${entry.title}."`;
    
    if (entry.publication) {
      citation += ` ${entry.publication}`;
    }
    
    if (entry.volume) {
      citation += ` ${entry.volume}`;
    }
    
    if (entry.issue) {
      citation += `, no. ${entry.issue}`;
    }
    
    citation += ` (${entry.year})`;
    
    if (entry.pages) {
      citation += `: ${entry.pages}`;
    }
    
    return citation + '.';
  }
}

/**
 * Harvard Citation Formatter
 */
class HarvardCitationFormatter extends CitationFormatter {
  formatInText(entry: BibliographyEntry): string {
    const authors = this.formatAuthors(entry.authors, 'full');
    return `(${authors}, ${entry.year})`;
  }

  formatBibliography(entry: BibliographyEntry): string {
    const authors = this.formatAuthors(entry.authors, 'last-first');
    let citation = `${authors}, ${entry.year}. ${entry.title}`;
    
    if (entry.publication) {
      citation += `. ${entry.publication}`;
    }
    
    if (entry.volume) {
      citation += `, ${entry.volume}`;
    }
    
    if (entry.issue) {
      citation += `(${entry.issue})`;
    }
    
    if (entry.pages) {
      citation += `, pp.${entry.pages}`;
    }
    
    return citation + '.';
  }
}

/**
 * P0.2 SNAPSHOT FORMATTING: Phase Snapshot Format Conversion
 * Convert snapshots between different formats untuk context injection
 */
import type { PhaseSnapshot, DistillationResult } from './content-processor';

export interface SnapshotFormatOptions {
  format: 'system-message' | 'markdown' | 'json' | 'compressed';
  includeMetadata: boolean;
  tokenLimit?: number;
  language: 'id' | 'en';
}

export interface FormattedSnapshot {
  content: string;
  format: SnapshotFormatOptions['format'];
  tokenCount: number;
  metadata: {
    originalTokens: number;
    compressionRatio: number;
    formattedAt: string;
  };
}

/**
 * Extended FormatConverterService dengan snapshot formatting
 */
export class FormatConverterServiceExtended extends FormatConverterService {
  /**
   * P0.2 CORE: Format snapshot untuk context injection
   */
  formatSnapshotForContext(
    snapshot: PhaseSnapshot,
    phase: number,
    options: Partial<SnapshotFormatOptions> = {}
  ): FormattedSnapshot {
    const config: SnapshotFormatOptions = {
      format: 'system-message',
      includeMetadata: false,
      tokenLimit: 800,
      language: 'id',
      ...options
    };

    const originalTokens = this.calculateSnapshotTokens(snapshot);
    let formattedContent: string;

    switch (config.format) {
      case 'system-message':
        formattedContent = this.formatAsSystemMessage(snapshot, phase, config);
        break;
      case 'markdown':
        formattedContent = this.formatAsMarkdown(snapshot, phase, config);
        break;
      case 'json':
        formattedContent = this.formatAsJSON(snapshot, config);
        break;
      case 'compressed':
        formattedContent = this.formatAsCompressed(snapshot, phase, config);
        break;
      default:
        formattedContent = this.formatAsSystemMessage(snapshot, phase, config);
    }

    const finalTokens = this.estimateTokenCount(formattedContent);
    const compressionRatio = originalTokens > 0 ? finalTokens / originalTokens : 1;

    console.log(`[FormatConverter] 🔄 Formatted phase ${phase} snapshot: ${originalTokens} → ${finalTokens} tokens (${config.format})`);

    return {
      content: formattedContent,
      format: config.format,
      tokenCount: finalTokens,
      metadata: {
        originalTokens,
        compressionRatio,
        formattedAt: new Date().toISOString()
      }
    };
  }

  /**
   * P0.2 SYSTEM MESSAGE: Format untuk hidden system message injection
   */
  private formatAsSystemMessage(
    snapshot: PhaseSnapshot,
    phase: number,
    config: SnapshotFormatOptions
  ): string {
    const phaseName = this.getPhaseDisplayName(phase);

    let content = config.language === 'id' ?
      `KONTEKS FASE ${phase} (${phaseName}):\n\n` :
      `PHASE ${phase} CONTEXT (${phaseName}):\n\n`;

    // Summary section
    if (snapshot.summary) {
      content += config.language === 'id' ?
        `RINGKASAN: ${snapshot.summary}\n\n` :
        `SUMMARY: ${snapshot.summary}\n\n`;
    }

    // Decisions section
    if (snapshot.decisions.length > 0) {
      content += config.language === 'id' ? 'KEPUTUSAN:\n' : 'DECISIONS:\n';
      snapshot.decisions.forEach((decision, index) => {
        content += `${index + 1}. ${decision}\n`;
      });
      content += '\n';
    }

    // Outstanding questions
    if (snapshot.questions.length > 0) {
      content += config.language === 'id' ? 'PERTANYAAN TERBUKA:\n' : 'OUTSTANDING QUESTIONS:\n';
      snapshot.questions.forEach((question, index) => {
        content += `${index + 1}. ${question}\n`;
      });
      content += '\n';
    }

    // Scope definition
    if (snapshot.scope) {
      content += config.language === 'id' ?
        `RUANG LINGKUP: ${snapshot.scope}\n\n` :
        `SCOPE: ${snapshot.scope}\n\n`;
    }

    // Sources
    if (snapshot.sources.length > 0) {
      content += config.language === 'id' ? 'SUMBER:\n' : 'SOURCES:\n';
      snapshot.sources.forEach((source, index) => {
        content += `${index + 1}. ${source}\n`;
      });
      content += '\n';
    }

    // Pending items
    if (snapshot.pending.length > 0) {
      content += config.language === 'id' ? 'UNTUK FASE SELANJUTNYA:\n' : 'FOR NEXT PHASE:\n';
      snapshot.pending.forEach((item, index) => {
        content += `${index + 1}. ${item}\n`;
      });
    }

    // Ensure within token limit
    if (config.tokenLimit && this.estimateTokenCount(content) > config.tokenLimit) {
      content = this.compressToTokenLimit(content, config.tokenLimit);
    }

    return content.trim();
  }

  /**
   * P0.2 MARKDOWN: Format sebagai markdown untuk display
   */
  private formatAsMarkdown(
    snapshot: PhaseSnapshot,
    phase: number,
    config: SnapshotFormatOptions
  ): string {
    const phaseName = this.getPhaseDisplayName(phase);

    let markdown = `# Fase ${phase}: ${phaseName}\n\n`;

    if (snapshot.summary) {
      markdown += `## Ringkasan\n\n${snapshot.summary}\n\n`;
    }

    if (snapshot.decisions.length > 0) {
      markdown += `## Keputusan Utama\n\n`;
      snapshot.decisions.forEach((decision, index) => {
        markdown += `${index + 1}. ${decision}\n`;
      });
      markdown += '\n';
    }

    if (snapshot.questions.length > 0) {
      markdown += `## Pertanyaan Terbuka\n\n`;
      snapshot.questions.forEach((question, index) => {
        markdown += `- ${question}\n`;
      });
      markdown += '\n';
    }

    if (snapshot.scope) {
      markdown += `## Ruang Lingkup\n\n${snapshot.scope}\n\n`;
    }

    if (snapshot.sources.length > 0) {
      markdown += `## Sumber Referensi\n\n`;
      snapshot.sources.forEach((source, index) => {
        markdown += `${index + 1}. ${source}\n`;
      });
      markdown += '\n';
    }

    if (snapshot.pending.length > 0) {
      markdown += `## Agenda Fase Selanjutnya\n\n`;
      snapshot.pending.forEach((item, index) => {
        markdown += `- [ ] ${item}\n`;
      });
    }

    return markdown.trim();
  }

  /**
   * P0.2 JSON: Format sebagai structured JSON
   */
  private formatAsJSON(
    snapshot: PhaseSnapshot,
    config: SnapshotFormatOptions
  ): string {
    const jsonData = {
      snapshot,
      metadata: config.includeMetadata ? {
        formatVersion: '1.0',
        language: config.language,
        formattedAt: new Date().toISOString()
      } : undefined
    };

    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * P0.2 COMPRESSED: Ultra-compact format untuk tight token budgets
   */
  private formatAsCompressed(
    snapshot: PhaseSnapshot,
    phase: number,
    config: SnapshotFormatOptions
  ): string {
    const parts: string[] = [];

    // Ultra-compact format
    if (snapshot.summary) {
      parts.push(`P${phase}: ${this.compressText(snapshot.summary, 200)}`);
    }

    if (snapshot.decisions.length > 0) {
      const decisions = snapshot.decisions
        .map(d => this.compressText(d, 50))
        .join('; ');
      parts.push(`D: ${decisions}`);
    }

    if (snapshot.questions.length > 0) {
      const questions = snapshot.questions
        .map(q => this.compressText(q, 40))
        .join('; ');
      parts.push(`Q: ${questions}`);
    }

    if (snapshot.pending.length > 0) {
      const pending = snapshot.pending
        .map(p => this.compressText(p, 30))
        .join('; ');
      parts.push(`N: ${pending}`);
    }

    return parts.join(' | ');
  }

  /**
   * P0.2 META-SUMMARY: Generate concise meta-summary
   */
  generateMetaSummary(
    snapshots: PhaseSnapshot[],
    currentPhase: number,
    maxTokens: number = 200
  ): string {
    if (snapshots.length === 0) {
      return '';
    }

    const keyPoints: string[] = [];

    snapshots.forEach((snapshot, index) => {
      const phase = index + 1;
      const phaseName = this.getPhaseDisplayName(phase);

      // Extract key point from each phase
      const keyPoint = this.extractKeyPoint(snapshot);
      if (keyPoint) {
        keyPoints.push(`${phaseName}: ${keyPoint}`);
      }
    });

    let metaSummary = keyPoints.join('. ') + '.';

    // Compress if needed
    if (this.estimateTokenCount(metaSummary) > maxTokens) {
      metaSummary = this.compressToTokenLimit(metaSummary, maxTokens);
    }

    return metaSummary;
  }

  /**
   * P0.2 BATCH: Format multiple snapshots untuk context chain
   */
  formatSnapshotChain(
    snapshots: PhaseSnapshot[],
    currentPhase: number,
    options: Partial<SnapshotFormatOptions> = {}
  ): FormattedSnapshot {
    const config: SnapshotFormatOptions = {
      format: 'system-message',
      includeMetadata: false,
      tokenLimit: 800,
      language: 'id',
      ...options
    };

    // Generate meta-summary
    const metaSummary = this.generateMetaSummary(snapshots, currentPhase, 200);

    // Format individual snapshots (compressed)
    const formattedSnapshots = snapshots.map((snapshot, index) => {
      const phase = index + 1;
      return this.formatSnapshotForContext(snapshot, phase, {
        ...config,
        format: 'compressed',
        tokenLimit: Math.floor((config.tokenLimit! - 200) / snapshots.length) // Reserve 200 for meta
      });
    });

    // Combine meta-summary with compressed snapshots
    let content = config.language === 'id' ?
      `KONTEKS PENELITIAN (Fase 1-${currentPhase - 1}):\n\n` :
      `RESEARCH CONTEXT (Phases 1-${currentPhase - 1}):\n\n`;

    content += `META-RINGKASAN: ${metaSummary}\n\n`;

    content += config.language === 'id' ? 'DETAIL FASE:\n' : 'PHASE DETAILS:\n';
    formattedSnapshots.forEach((formatted) => {
      content += formatted.content + '\n';
    });

    const finalTokens = this.estimateTokenCount(content);
    const originalTokens = snapshots.reduce((sum, snapshot) =>
      sum + this.calculateSnapshotTokens(snapshot), 0
    );

    return {
      content: content.trim(),
      format: config.format,
      tokenCount: finalTokens,
      metadata: {
        originalTokens,
        compressionRatio: originalTokens > 0 ? finalTokens / originalTokens : 1,
        formattedAt: new Date().toISOString()
      }
    };
  }

  /**
   * P0.2 UTILITIES: Helper methods untuk snapshot formatting
   */
  private calculateSnapshotTokens(snapshot: PhaseSnapshot): number {
    return [
      this.estimateTokenCount(snapshot.summary),
      ...snapshot.decisions.map(d => this.estimateTokenCount(d)),
      ...snapshot.questions.map(q => this.estimateTokenCount(q)),
      this.estimateTokenCount(snapshot.scope),
      ...snapshot.sources.map(s => this.estimateTokenCount(s)),
      ...snapshot.pending.map(p => this.estimateTokenCount(p))
    ].reduce((sum, tokens) => sum + tokens, 0);
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private getPhaseDisplayName(phase: number): string {
    const phaseNames: Record<number, string> = {
      1: 'Klarifikasi Topik',
      2: 'Penelusuran Literatur',
      3: 'Kerangka Penelitian',
      4: 'Pengembangan Konten',
      5: 'Sintesis & Analisis',
      6: 'Review & Validasi',
      7: 'Finalisasi Dokumen'
    };

    return phaseNames[phase] || `Fase ${phase}`;
  }

  private extractKeyPoint(snapshot: PhaseSnapshot): string {
    // Extract most important point from snapshot
    if (snapshot.decisions.length > 0) {
      return this.compressText(snapshot.decisions[0], 60);
    }

    if (snapshot.summary) {
      // Extract first sentence
      const sentences = snapshot.summary.split(/[.!?]+/);
      return this.compressText(sentences[0], 60);
    }

    return '';
  }

  private compressText(text: string, maxTokens: number): string {
    const currentTokens = this.estimateTokenCount(text);

    if (currentTokens <= maxTokens) {
      return text;
    }

    // Simple truncation with ellipsis
    const targetLength = Math.floor(text.length * (maxTokens / currentTokens));
    return text.substring(0, targetLength - 3) + '...';
  }

  private compressToTokenLimit(content: string, tokenLimit: number): string {
    const currentTokens = this.estimateTokenCount(content);

    if (currentTokens <= tokenLimit) {
      return content;
    }

    // Compress by reducing sections proportionally
    const ratio = tokenLimit / currentTokens * 0.9; // Safety margin
    const targetLength = Math.floor(content.length * ratio);

    return content.substring(0, targetLength - 3) + '...';
  }
}

/**
 * Export default service instance (extended)
 */
export const formatConverter = new FormatConverterServiceExtended();

/**
 * Export legacy service for compatibility
 */
export const formatConverterLegacy = new FormatConverterService();