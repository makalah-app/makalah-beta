import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../src/lib/database/supabase-client';
import { getServerSessionUserId } from '../../../src/lib/database/supabase-server-auth';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getServerSessionUserId();
    if (!userId) {
      return NextResponse.json({
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (requesterError || !requester || requester.role !== 'superadmin') {
      return NextResponse.json({
        error: 'Superadmin access required',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { email } = await request.json();

    // Get current auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authData.users?.find(u => u.email === email);
    
    if (!authUser) {
      return NextResponse.json({ 
        error: 'Auth user not found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }
    
    // Update users table to match auth.users ID
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('users')
      // @ts-ignore - Type issue with Supabase update
      .update({ id: authUser.id })
      .eq('email', email)
      .select();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update users table: ' + updateError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User IDs synchronized successfully',
      authUserId: authUser.id,
      updatedRecord: updateResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
