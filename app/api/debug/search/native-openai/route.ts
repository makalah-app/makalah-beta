import { NextRequest, NextResponse } from 'next/server';
import { SearchProviderManager } from '@/lib/ai/tools/search/search-providers';

export async function GET(request: NextRequest) {
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

    console.log(`[DEBUG] Native OpenAI search returned ${results.length} results for q="${q}"`);
    return NextResponse.json({ success: true, q, results });
  } catch (error) {
    console.error('[DEBUG] Native OpenAI search error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

