import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { BaseHttpProvider } from '@/services/BaseHttpProvider';

/**
 * The Guardian Open Platform adapter — https://open-platform.theguardian.com
 *
 * Single endpoint (`/search`) handles keyword + date range + section (category).
 * Auth is via the `api-key` query parameter, not a header.
 *
 * Reliability note: Guardian's CORS support from the browser is undocumented.
 * Per agent-skills/04, this provider may be unreachable from the deployed
 * origin — the AggregatorService's `Promise.allSettled` strategy is what
 * makes that tolerable, not anything in this file.
 */
const GUARDIAN_BASE = 'https://content.guardianapis.com';

interface GuardianVendorTag {
  webTitle: string;
  type: string; // 'contributor' | 'keyword' | 'tone' | 'type' | ...
}

interface GuardianVendorArticle {
  id: string;
  webTitle: string;
  webUrl: string;
  webPublicationDate: string;
  sectionName: string;
  /** Present only when `show-fields` is requested. */
  fields?: {
    trailText?: string;
    thumbnail?: string;
  };
  tags?: GuardianVendorTag[];
}

interface GuardianVendorResponse {
  response: {
    status: string;
    total: number;
    results: GuardianVendorArticle[];
  };
}

export class GuardianProvider extends BaseHttpProvider implements NewsProvider {
  readonly id = 'guardian';
  readonly displayName = 'The Guardian';

  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = import.meta.env.VITE_GUARDIAN_KEY) {
    // Same tight budget as NewsAPI. Guardian's free tier is reliable when
    // reachable; a slow call usually means CORS preflight is hanging, which
    // this timeout surfaces as a clean error rather than blocking the UI.
    super({ timeoutMs: 8_000, maxAttempts: 2, initialBackoffMs: 250 });
    this.apiKey = apiKey;
  }

  search(params: SearchParams, signal?: AbortSignal): Promise<Article[]> {
    const { url, error } = this.buildUrl(params);
    if (error) {
      return Promise.reject(new Error(error));
    }
    return this.getJson<GuardianVendorResponse>(url, undefined, signal).then((res) =>
      res.response.results.map((a) => this.mapToArticle(a)),
    );
  }

  /** Exposed for unit testing — see services/providers/GuardianProvider.test.ts. */
  mapToArticle(vendor: GuardianVendorArticle): Article {
    return {
      id: `${this.id}:${vendor.id}`,
      title: vendor.webTitle ?? '',
      summary: vendor.fields?.trailText ?? '',
      url: vendor.webUrl,
      imageUrl: vendor.fields?.thumbnail ?? null,
      author: this.firstContributor(vendor.tags),
      source: this.displayName,
      category: vendor.sectionName || null,
      publishedAt: vendor.webPublicationDate,
    };
  }

  private firstContributor(tags: GuardianVendorTag[] | undefined): string | null {
    if (!tags) return null;
    const contributor = tags.find((t) => t.type === 'contributor');
    return contributor?.webTitle ?? null;
  }

  private buildUrl(params: SearchParams): { url: string; error?: string } {
    if (!this.apiKey) {
      return { url: '', error: 'VITE_GUARDIAN_KEY is not set' };
    }

    const url = new URL(`${GUARDIAN_BASE}/search`);
    if (params.keyword) url.searchParams.set('q', params.keyword);
    if (params.dateFrom) url.searchParams.set('from-date', params.dateFrom);
    if (params.dateTo) url.searchParams.set('to-date', params.dateTo);
    if (params.category) url.searchParams.set('section', params.category);

    // Required: trailText + thumbnail live in `fields` and only come back if
    // we ask for them. `show-fields` is comma-separated.
    url.searchParams.set('show-fields', 'trailText,thumbnail');

    // Tags include `type: contributor` which is how we identify the author.
    url.searchParams.set('show-tags', 'contributor');

    url.searchParams.set('page-size', '50');
    url.searchParams.set('api-key', this.apiKey);
    return { url: url.toString() };
  }
}
