/**
 * Search Result Filtering System
 * Content filtering dan relevance scoring dengan academic source prioritization
 */

import { SearchResult, SearchFilters } from './search-schemas';

interface EnhancedSearchResult extends SearchResult {
  relevanceScore: number;
  academicScore: number;
  trustScore: number;
}

export class SearchResultFilter {
  async applyFilters(
    results: EnhancedSearchResult[],
    filters: SearchFilters
  ): Promise<EnhancedSearchResult[]> {
    let filteredResults = [...results];

    // Apply domain filters
    if (filters.domains?.length) {
      filteredResults = filteredResults.filter(result =>
        filters.domains!.some(domain => result.url.includes(domain))
      );
    }

    // Apply exclude domain filters
    if (filters.excludeDomains?.length) {
      filteredResults = filteredResults.filter(result =>
        !filters.excludeDomains!.some(domain => result.url.includes(domain))
      );
    }

    // Apply file type filters
    if (filters.fileTypes?.length) {
      filteredResults = filteredResults.filter(result =>
        filters.fileTypes!.some(type => result.url.includes(`.${type}`))
      );
    }

    // Apply academic only filter
    if (filters.academicOnly) {
      filteredResults = filteredResults.filter(result =>
        this.isAcademicSource(result)
      );
    }

    // Apply free access filter
    if (filters.freeAccessOnly) {
      filteredResults = filteredResults.filter(result =>
        result.accessType === 'open' || !result.accessType
      );
    }

    // Apply peer reviewed filter
    if (filters.peerReviewedOnly) {
      filteredResults = filteredResults.filter(result =>
        this.isPeerReviewed(result)
      );
    }

    // Apply citation count filter
    if (filters.minimumCitations !== undefined) {
      filteredResults = filteredResults.filter(result =>
        (result.citationCount || 0) >= filters.minimumCitations!
      );
    }

    // Apply relevance score filter
    if (filters.minimumRelevanceScore !== undefined) {
      filteredResults = filteredResults.filter(result =>
        result.relevanceScore >= filters.minimumRelevanceScore!
      );
    }

    // Apply language filter
    if (filters.languageFilter?.length) {
      filteredResults = filteredResults.filter(result =>
        !result.language || filters.languageFilter!.includes(result.language)
      );
    }

    // Apply date filter
    if (filters.dateFilter?.start || filters.dateFilter?.end) {
      filteredResults = filteredResults.filter(result => {
        if (!result.publishedDate) return true;
        
        const pubDate = new Date(result.publishedDate);
        if (filters.dateFilter!.start && pubDate < filters.dateFilter!.start) return false;
        if (filters.dateFilter!.end && pubDate > filters.dateFilter!.end) return false;
        
        return true;
      });
    }

    // Apply content type filter
    if (filters.contentTypeFilter?.length) {
      filteredResults = filteredResults.filter(result =>
        !result.contentType || filters.contentTypeFilter!.includes(result.contentType)
      );
    }

    return filteredResults;
  }

  private isAcademicSource(result: SearchResult): boolean {
    const academicIndicators = [
      // Indonesian academic sources (Priority 2)
      'sinta.kemdiktisaintek.go.id', 'garuda.kemdikbud.go.id',
      // International academic sources (Priority 3)
      '.edu', '.ac.', 'scholar.google', 'pubmed', 'arxiv', 'jstor',
      'springer', 'wiley', 'elsevier', 'ieee', 'acm.org'
    ];
    
    const url = result.url.toLowerCase();
    const source = result.source?.toLowerCase() || '';
    
    // Check URL indicators
    const urlMatch = academicIndicators.some(indicator => url.includes(indicator));
    
    // Check source indicators for Indonesian academic sources
    const sourceMatch = source.includes('sinta') || source.includes('garuda') || 
                       source.includes('kemdiktisaintek') || source.includes('kemdikbud');
    
    return urlMatch || sourceMatch;
  }

  private isPeerReviewed(result: SearchResult): boolean {
    const peerReviewIndicators = [
      'peer-reviewed', 'journal', 'conference', 'proceedings',
      'published', 'doi:', 'volume', 'issue'
    ];
    
    const text = `${result.title} ${result.snippet || ''}`.toLowerCase();
    return peerReviewIndicators.some(indicator => text.includes(indicator)) ||
           this.isAcademicSource(result);
  }
}