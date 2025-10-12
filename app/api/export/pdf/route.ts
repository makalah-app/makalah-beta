/* @ts-nocheck */
/**
 * PDF EXPORT API ROUTE - PHASE 3 IMPLEMENTATION
 *
 * Server-side PDF generation using Puppeteer
 *
 * TECHNICAL SPECIFICATIONS:
 * - Uses Puppeteer for HTML to PDF conversion
 * - Vercel-compatible with @sparticuz/chromium
 * - Max duration: 60 seconds (PDF generation bisa lama)
 * - Memory: 1024MB recommended for Puppeteer
 *
 * COMPLIANCE:
 * - Follows global_policy.xml principles (simple, maintainable)
 * - Zero over-engineering
 * - Proper error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { getConversationDetails } from '@/lib/database/chat-store';
import { supabaseAdmin } from '@/lib/database/supabase-client';
import { generateConversationHTML } from '@/lib/export/conversation-to-html';

// Allow for long-running PDF generation
export const maxDuration = 60;

/**
 * POST /api/export/pdf
 *
 * Request Body:
 * - conversationId: string (required)
 *
 * Response:
 * - Success: PDF file (application/pdf)
 * - Error: JSON error message
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId required' },
        { status: 400 }
      );
    }

    // Load conversation from database
    const details = await getConversationDetails(conversationId, supabaseAdmin);

    if (!details) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Generate HTML content
    const htmlContent = generateConversationHTML(details.messages, {
      title: details.conversation.title || 'Untitled Chat',
      created_at: details.conversation.created_at,
      updated_at: details.conversation.updated_at,
      message_count: details.messages.length
    });

    // Determine if running in development or production
    const isDev = process.env.NODE_ENV === 'development';

    // Launch Puppeteer with appropriate configuration
    const browser = await puppeteer.launch({
      args: isDev
        ? puppeteer.defaultArgs()
        : chromium.args,
      defaultViewport: {
        width: 1280,
        height: 720
      },
      executablePath: isDev
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' // macOS local Chrome
        : await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // Set content and wait for it to be fully loaded
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF with proper formatting
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      preferCSSPageSize: true,
    });

    await browser.close();

    // Sanitize title for filename
    const sanitizedTitle = (details.conversation.title || 'untitled-chat')
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const filename = `percakapan-${sanitizedTitle}-${year}-${month}-${day}.pdf`;

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'PDF generation failed',
        code: 'PDF_GENERATION_FAILED'
      },
      { status: 500 }
    );
  }
}
