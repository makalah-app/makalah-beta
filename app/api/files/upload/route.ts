/**
 * FILE UPLOAD API ROUTE - AI SDK v5 NEXT.JS APP ROUTER
 * 
 * Next.js App Router API endpoint for file uploads following AI SDK patterns
 * Implements secure file handling with academic workflow integration
 * 
 * INTEGRATION: Supports useChat file attachment workflow
 * following patterns from docs/02-getting-started/02-nextjs-app-router.mdx
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';
// Simple file validation utility (replaces removed file-message-integration)
function validateFileAttachment(filename: string, fileType: string, fileSize: number) {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }

  if (!ALLOWED_TYPES.includes(fileType)) {
    return { valid: false, error: 'Unsupported file type. Only PDF, DOC, DOCX, and TXT files are allowed.' };
  }

  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long. Maximum 255 characters.' };
  }

  return { valid: true };
}
import { generateUUID } from '../../../../src/lib/utils/uuid-generator';

// Request validation schema
const FileUploadRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  file_type: z.string().min(1, 'File type is required'),
  file_size: z.number().min(1, 'File size must be positive'),
  file_data: z.string().min(1, 'File data is required'), // Base64 encoded
  conversation_id: z.string().uuid().optional(),
  message_id: z.string().uuid().optional(),
  document_metadata: z.object({
    document_type: z.enum(['research_paper', 'thesis', 'article', 'book', 'report', 'other']),
    subject_area: z.string().optional(),
    author: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
});

type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json() as FileUploadRequest;
    const validatedData = FileUploadRequestSchema.parse(body);

    // Validate file constraints
    const fileValidation = validateFileAttachment(
      validatedData.filename,
      validatedData.file_type,
      validatedData.file_size
    );

    if (!fileValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'File validation failed',
          details: fileValidation.error,
        },
        { status: 400 }
      );
    }

    // Generate unique file ID and storage path
    const fileId = generateUUID();
    const storagePath = `academic-documents/${fileId}/${validatedData.filename}`;

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(validatedData.file_data, 'base64');

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('academic-files')
      .upload(storagePath, fileBuffer, {
        contentType: validatedData.file_type
      });

    if (uploadError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Storage upload failed',
          details: uploadError.message,
        },
        { status: 500 }
      );
    }

    // Create file metadata record
    const fileMetadata = {
      id: fileId,
      conversation_id: validatedData.conversation_id || null,
      message_id: validatedData.message_id || null,
      filename: validatedData.filename,
      file_type: validatedData.file_type,
      file_size: validatedData.file_size,
      storage_path: storagePath,
      upload_date: new Date().toISOString(),
      academic_content: validatedData.document_metadata || {},
      processing_status: 'pending',
      processing_results: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('chat_files')
      .insert(fileMetadata as any)
      .select()
      .single();

    if (dbError) {
      // Clean up storage if database insert fails
      await supabaseAdmin.storage
        .from('academic-files')
        .remove([storagePath]);

      return NextResponse.json(
        {
          success: false,
          error: 'Database insert failed',
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    // Return success response with file info
    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        filename: validatedData.filename,
        file_type: validatedData.file_type,
        file_size: validatedData.file_size,
        upload_status: 'completed',
        processing_status: 'pending',
        storage_path: storagePath,
        academic_metadata: validatedData.document_metadata,
        upload_date: fileMetadata.upload_date,
      },
      message: `File '${validatedData.filename}' uploaded successfully`,
    });

  } catch (error) {
    console.error('[File Upload API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversation_id');
    const messageId = searchParams.get('message_id');

    if (!conversationId && !messageId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either conversation_id or message_id is required',
        },
        { status: 400 }
      );
    }

    // Build query
    let query = supabaseAdmin.from('chat_files').select('*');

    if (messageId) {
      query = query.eq('message_id', messageId);
    } else if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data: files, error } = await query.order('upload_date', { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch files',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      files: files || [],
      count: files?.length || 0,
    });

  } catch (error) {
    console.error('[File Get API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}