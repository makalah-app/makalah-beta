/**
 * Domain Classification for Academic Source Quality Control
 *
 * Implements tier-based filtering to ensure only credible academic and
 * reputable sources appear in search results for MAKALAH AI research.
 */

export interface DomainQuality {
  tier: 'tier1' | 'tier2' | 'tier3' | 'excluded';
  reasoning: string;
}

/**
 * TIER 1: Premium Academic Sources (ALWAYS INCLUDE)
 * Highest credibility - scholarly journals, university repositories, research databases
 */
export const TIER1_ACADEMIC = [
  // Indonesian Academic
  '.ac.id',
  'sinta.kemdiktisaintek.go.id',
  'garuda.kemdikbud.go.id',
  'repository.ui.ac.id',
  'repository.ugm.ac.id',
  'repository.its.ac.id',
  'repository.unair.ac.id',
  'repository.ipb.ac.id',
  'repository.undip.ac.id',
  'repository.unpad.ac.id',

  // International Academic
  '.edu',
  '.ac.uk',
  '.edu.au',
  'pubmed.ncbi.nlm.nih.gov',
  'scholar.google.com',
  'arxiv.org',
  'researchgate.net',
  'academia.edu',
  'ssrn.com',

  // Publishers & Databases
  'ieee.org',
  'springer.com',
  'sciencedirect.com',
  'jstor.org',
  'nature.com',
  'science.org',
  'dl.acm.org',
  'tandfonline.com',
  'wiley.com',
  'elsevier.com',
  'plos.org',
];

/**
 * TIER 2: Reputable News & Government (INCLUDE for factual data)
 * Good for current events, official statistics, policy information
 */
export const TIER2_NEWS_GOV = [
  // Indonesian Government
  '.go.id',
  'kemendikbud.go.id',
  'kemdikbud.go.id',
  'bps.go.id', // Statistics Indonesia
  'kemenristekdikti.go.id',

  // International Government
  '.gov',
  '.gov.uk',
  '.gov.au',

  // Indonesian Reputable News
  'kompas.com',
  'tempo.co',
  'detik.com',
  'tirto.id',
  'theconversation.com',

  // International Reputable News
  'reuters.com',
  'bbc.com',
  'bbc.co.uk',
  'nytimes.com',
  'theguardian.com',
  'economist.com',
  'apnews.com',
];

/**
 * TIER 3: Generic Web (DEPRIORITIZE but allow)
 * Use with caution - may lack academic rigor
 */
export const TIER3_WEB = [
  // Professional organizations
  '.org',

  // Industry bodies (case-by-case basis)
];

/**
 * EXCLUDED: Entertainment, Social, Forums (NEVER INCLUDE)
 * Not suitable for academic research - low credibility or off-topic
 */
export const EXCLUDED_DOMAINS = [
  // Social Media
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'linkedin.com', // Profiles are not research sources
  'pinterest.com',
  'snapchat.com',

  // Entertainment Platforms
  'youtube.com',
  'youtu.be',
  'spotify.com',
  'open.spotify.com',
  'music.apple.com',
  'music.amazon.com',
  'play.google.com',
  'soundcloud.com',
  'vimeo.com',

  // Discussion Forums & Q&A
  'reddit.com',
  'quora.com',
  'italki.com',
  'stackexchange.com',
  'stackoverflow.com', // Tech Q&A, not research
  'answers.yahoo.com',

  // Wikipedia (per user requirement: not primary source)
  'wikipedia.org',
  'en.wikipedia.org',
  'id.wikipedia.org',
  'wiki.org',

  // E-commerce
  'amazon.com',
  'tokopedia.com',
  'shopee.co.id',
  'bukalapak.com',
  'lazada.co.id',
  'ebay.com',

  // Entertainment News & Blogs
  'buzzfeed.com',
  'medium.com', // Mixed quality, exclude for safety
  'wordpress.com', // Personal blogs
  'blogger.com',
  'tumblr.com',
];

/**
 * Classify domain quality for academic research
 *
 * @param url - Full URL to classify
 * @returns DomainQuality object with tier and reasoning
 */
export function classifyDomain(url: string): DomainQuality {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check exclusions FIRST (highest priority)
    for (const excluded of EXCLUDED_DOMAINS) {
      if (hostname.includes(excluded.toLowerCase())) {
        return {
          tier: 'excluded',
          reasoning: `Entertainment/social/forum site (${excluded}) not suitable for academic research`
        };
      }
    }

    // Check Tier 1 (premium academic sources)
    for (const academic of TIER1_ACADEMIC) {
      if (hostname.includes(academic.toLowerCase())) {
        return {
          tier: 'tier1',
          reasoning: `Academic/scholarly source (${academic}) - highest credibility`
        };
      }
    }

    // Check Tier 2 (reputable news/government)
    for (const newsGov of TIER2_NEWS_GOV) {
      if (hostname.includes(newsGov.toLowerCase())) {
        return {
          tier: 'tier2',
          reasoning: `Reputable news/government source (${newsGov}) - good for factual data`
        };
      }
    }

    // Check Tier 3 (generic web)
    for (const web of TIER3_WEB) {
      if (hostname.includes(web.toLowerCase()) || hostname.endsWith(web.toLowerCase())) {
        return {
          tier: 'tier3',
          reasoning: `Professional organization (.org) - use with caution`
        };
      }
    }

    // Default: Unknown domain = Tier 3 (generic web)
    return {
      tier: 'tier3',
      reasoning: 'Unknown domain - use with caution, verify credibility'
    };

  } catch (error) {
    return {
      tier: 'excluded',
      reasoning: 'Invalid URL format'
    };
  }
}

/**
 * Filter search results by domain quality
 * Only keeps Tier 1 (academic) and Tier 2 (news/gov) sources
 *
 * @param results - Array of search results with urls
 * @returns Filtered array with only quality sources
 */
export function filterByDomainQuality<T extends { url: string }>(
  results: T[],
  options: {
    allowTier3?: boolean; // Default: false
    logFiltered?: boolean; // Default: false
  } = {}
): T[] {
  const { allowTier3 = false, logFiltered = false } = options;

  return results.filter(result => {
    const quality = classifyDomain(result.url);

    // Always exclude
    if (quality.tier === 'excluded') {
      if (logFiltered) {
        console.log(`[DomainFilter] ❌ Excluded: ${result.url} - ${quality.reasoning}`);
      }
      return false;
    }

    // Always include Tier 1 & 2
    if (quality.tier === 'tier1' || quality.tier === 'tier2') {
      return true;
    }

    // Tier 3: optional based on settings
    if (quality.tier === 'tier3' && allowTier3) {
      if (logFiltered) {
        console.log(`[DomainFilter] ⚠️ Tier 3 included: ${result.url} - ${quality.reasoning}`);
      }
      return true;
    }

    // Filter out Tier 3 by default
    if (logFiltered) {
      console.log(`[DomainFilter] ⚠️ Filtered Tier 3: ${result.url} - ${quality.reasoning}`);
    }
    return false;
  });
}
