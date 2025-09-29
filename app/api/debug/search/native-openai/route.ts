import { NextRequest, NextResponse } from 'next/server';
import { SearchProviderManager } from '@/lib/ai/tools/search/search-providers';

// Force dynamic rendering for debug endpoints
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Block access in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || 'AI research news this week';
    const maxResults = Number(searchParams.get('max') || 5);
    const timeout = Number(searchParams.get('timeout') || 10000);

    const manager = new SearchProviderManager();
    const results = await manager.search('native-openai' as any, q, {
      maxResults,
      timeout,
      language: 'en',
      region: 'US',
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] Native OpenAI search returned ${results.length} results for q="${q}"`);
    }
    return NextResponse.json({ success: true, q, results });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[DEBUG] Native OpenAI search error:', error);
    }
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

