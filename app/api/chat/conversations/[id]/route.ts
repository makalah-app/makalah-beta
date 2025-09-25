/* @ts-nocheck */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getServerSessionUserId } from '../../../../../src/lib/database/supabase-server-auth';

export const maxDuration = 30;

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params?.id;
    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 });
    }

    // Try multiple auth extraction approaches
    let userId: string | null = null;

    // Approach 1: Standard server session extraction
    const { userId: sessionUserId } = await getServerSessionUserId();
    if (sessionUserId) {
      userId = sessionUserId;
      console.log('[DELETE] Auth via server session:', userId);
    }

    // Approach 2: Fallback to request headers if no session
    if (!userId) {
      // Check for user ID in headers (set by frontend)
      const headerUserId = req.headers.get('x-user-id');
      if (headerUserId) {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(headerUserId)) {
          userId = headerUserId;
          console.log('[DELETE] Auth via header fallback:', userId);
        }
      }
    }

    // Approach 3: Extract from URL query params as last resort
    if (!userId) {
      const url = new URL(req.url);
      const queryUserId = url.searchParams.get('userId');
      if (queryUserId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(queryUserId)) {
          userId = queryUserId;
          console.log('[DELETE] Auth via query param fallback:', userId);
        }
      }
    }

    if (!userId) {
      console.error('[DELETE] No valid user ID found in session, headers, or query params');
      return NextResponse.json({ error: 'Unauthorized - no user session' }, { status: 401 });
    }

    // Use admin client to verify ownership and delete
    const { supabaseAdmin } = await import('../../../../../src/lib/database/supabase-client');

    // Verify ownership
    const { data: conv, error: convErr } = await (supabaseAdmin as any)
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) {
      console.error('[DELETE] Conversation not found:', conversationId, convErr);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conv.user_id !== userId) {
      console.error('[DELETE] User does not own conversation:', { userId, ownerId: conv.user_id });
      return NextResponse.json({ error: 'Forbidden - not owner' }, { status: 403 });
    }

    // Delete messages first (foreign key constraint)
    const { error: delMsgErr } = await (supabaseAdmin as any)
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (delMsgErr) {
      console.error('[DELETE] Failed to delete messages:', delMsgErr);
      return NextResponse.json({ error: 'Failed to delete messages' }, { status: 500 });
    }

    // Delete conversation
    const { error: delConvErr } = await (supabaseAdmin as any)
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (delConvErr) {
      console.error('[DELETE] Failed to delete conversation:', delConvErr);
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }

    console.log('[DELETE] Successfully deleted conversation:', conversationId);
    return NextResponse.json({ id: conversationId, deleted: true });

  } catch (error) {
    console.error('[DELETE] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
