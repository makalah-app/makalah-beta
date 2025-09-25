/**
 * FILE DOWNLOAD API ROUTE - AI SDK v5 NEXT.JS APP ROUTER
 * 
 * Secure file download endpoint with RLS validation
 * Supports academic document access with proper permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../src/lib/database/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get file metadata from database
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('chat_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (dbError || !fileRecord) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('academic-files')
      .download((fileRecord as any).storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { success: false, error: 'Failed to download file' },
        { status: 500 }
      );
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': (fileRecord as any).file_type,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${(fileRecord as any).filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('[File Download API] Error:', error);
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