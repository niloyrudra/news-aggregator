import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { BaseHttpProvider } from '@/services/BaseHttpProvider';

/**
 * NewsAPI (https://newsapi.org) adapter.
 *
 * Endpoint choice (spec: two relevant endpoints, one must be picked):
 *   - `/v2/everything` — supports keyword + date range, no category
 *   - `/v2/top-headlines` — supports category, no keyword
 *
 * We prefer `/everything` when a keyword is present (or any date filter is set),
 * otherwise `/top-headlines` for category browsing. This is the only way
 * `SearchParams` can be honored without dropping fields.
 */
const NEWSAPI_BASE = 'https://newsapi.org/v2';

interface NewsApiVendorArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsApiVendorResponse {
  status: string;
  totalResults: number;
  articles: NewsApiVendorArticle[];
}

export class NewsApiProvider extends BaseHttpProvider implements NewsProvider {
  readonly id = 'newsapi';
  readonly displayName = 'NewsAPI';

  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = import.meta.env.VITE_NEWSAPI_KEY) {
    // Tight timeout — NewsAPI's free tier is CORS-locked to localhost, so a
    // hung call is usually a CORS preflight failure or dead upstream, not
    // a slow network. 8s is plenty for a healthy call.
    super({ timeoutMs: 8_000, maxAttempts: 2, initialBackoffMs: 250 });
    this.apiKey = apiKey;
  }

  search(params: SearchParams, signal?: AbortSignal): Promise<Article[]> {
    const { url, error } = this.buildUrl(params);
    if (error) {
      // Missing key is a 4xx-class problem for the caller — short-circuit
      // with a typed error instead of issuing a request that will 401.
      return Promise.reject(new Error(error));
    }
    return this.getJson<NewsApiVendorResponse>(url, { headers: this.headers() }, signal).then(
      (res) => res.articles.map((a) => this.mapToArticle(a)),
    );
  }

  /** Exposed for unit testing — see services/providers/NewsApiProvider.test.ts. */
  mapToArticle(vendor: NewsApiVendorArticle): Article {
    return {
      id: `${this.id}:${vendor.url}`,
      title: vendor.title ?? '',
      summary: vendor.description ?? '',
      url: vendor.url,
      imageUrl: vendor.urlToImage,
      author: vendor.author,
      source: vendor.source?.name || 'NewsAPI',
      category: null, // NewsAPI /everything and /top-headlines don't return a per-article category
      publishedAt: vendor.publishedAt,
    };
  }

  private headers(): HeadersInit {
    return { 'X-Api-Key': this.apiKey ?? '' };
  }

  private buildUrl(params: SearchParams): { url: string; error?: string } {
    if (!this.apiKey) {
      return { url: '', error: 'VITE_NEWSAPI_KEY is not set' };
    }
    const useEverything = Boolean(params.keyword) || Boolean(params.dateFrom) || Boolean(params.dateTo);
    const endpoint = useEverything ? 'everything' : 'top-headlines';
    const url = new URL(`${NEWSAPI_BASE}/${endpoint}`);

    if (useEverything) {
      if (params.keyword) url.searchParams.set('q', params.keyword);
      if (params.dateFrom) url.searchParams.set('from', params.dateFrom);
      if (params.dateTo) url.searchParams.set('to', params.dateTo);
      // /everything requires either q, sources, or domains — we don't have those
      // in SearchParams, so the caller's `q` (or absence → empty-string error
      // from NewsAPI) drives that.
    } else {
      if (params.category) url.searchParams.set('category', params.category);
    }

    // NewsAPI has no native multi-source filter on /everything via this simple
    // path, but it does accept `sources` (comma-separated). Pass through.
    if (params.sources?.length === 1) {
      url.searchParams.set('sources', params.sources[0]);
    }

    url.searchParams.set('pageSize', '50');
    return { url: url.toString() };
  }
}
