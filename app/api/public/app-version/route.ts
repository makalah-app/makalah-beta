/**
 * Public API Endpoint - App Version
 *
 * Returns the current application version from admin_settings.
 * This endpoint is public (no authentication required) and can be called
 * by the GlobalHeader component to display the version dynamically.
 *
 * GET /api/public/app-version
 * Response: { success: true, version: "Beta 0.1" }
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';

export async function GET() {
  try {
    // Fetch app_version from admin_settings
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'app_version')
      .single();

    if (error) {
      console.error('[Public API] Failed to fetch app_version:', error);
      // Return default version on error
      return NextResponse.json({
        success: true,
        version: 'Beta 0.1' // Fallback default
      });
    }

    const version = data?.setting_value || 'Beta 0.1';

    return NextResponse.json({
      success: true,
      version
    });

  } catch (error) {
    console.error('[Public API] Unexpected error fetching app_version:', error);

    // Return default version on any error (graceful degradation)
    return NextResponse.json({
      success: true,
      version: 'Beta 0.1'
    });
  }
}

// Cache configuration for performance
export const revalidate = 30; // Cache for 30 seconds (ISR)
