import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { BaseHttpProvider } from '@/services/BaseHttpProvider';
import { z } from 'zod';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { mapCategoryForProvider } from '@/lib/categoryMapping';

/**
 * NewsAPI (https://newsapi.org) adapter.
 *
 * Endpoint choice (spec: two relevant endpoints, one must be picked):
 *   - `/v2/everything` — supports keyword + date range, no category
 *   - `/v2/top-headlines` — supports category, no keyword (on free tier)
 *
 * Strategy: When category is explicitly set by user (not from preferences default),
 * use `/top-headlines` even if keyword/date present. This sacrifices keyword search
 * for category filtering. When no category, use `/everything` for full search.
 */
const NEWSAPI_BASE = 'https://newsapi.org/v2';

const NewsApiVendorArticleSchema = z.object({
  source: z.object({
    id: z.string().nullable(),
    name: z.string(),
  }),
  author: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  urlToImage: z.string().nullable(),
  publishedAt: z.string(),
  content: z.string().nullable(),
});

const NewsApiVendorResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number(),
  articles: z.array(NewsApiVendorArticleSchema),
});

type NewsApiVendorArticle = z.infer<typeof NewsApiVendorArticleSchema>;
type NewsApiVendorResponse = z.infer<typeof NewsApiVendorResponseSchema>;

export class NewsApiProvider extends BaseHttpProvider implements NewsProvider {
  readonly id = 'newsapi';
  readonly displayName = 'NewsAPI';

  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = import.meta.env.VITE_NEWSAPI_KEY) {
    super({ timeoutMs: 8_000, maxAttempts: 2, initialBackoffMs: 250 });
    this.apiKey = apiKey || undefined;
  }

  search(params: SearchParams, signal?: AbortSignal): Promise<Article[]> {
    const { url, error } = this.buildUrl({ params });
    if (error) {
      return Promise.reject(new Error(error));
    }
    return this.getJson<NewsApiVendorResponse>(url, { headers: this.headers() }, signal)
      .then((res) => {
        const validated = NewsApiVendorResponseSchema.parse(res);
        return validated.articles.map((a) => this.mapToArticle(a));
      });
  }

  /** Exposed for unit testing — see services/providers/NewsApiProvider.test.ts. */
  mapToArticle(vendor: NewsApiVendorArticle): Article {
    return {
      id: `${this.id}:${vendor.url}`,
      title: sanitizeHtml(vendor.title ?? ''),
      summary: sanitizeHtml(vendor.description ?? ''),
      url: vendor.url,
      imageUrl: vendor.urlToImage,
      author: vendor.author,
      source: vendor.source?.name || this.displayName,
      category: null, // NewsAPI /everything and /top-headlines don't return a per-article category
      publishedAt: vendor.publishedAt,
    };
  }

  private headers(): HeadersInit {
    return { 'X-Api-Key': this.apiKey ?? '' };
  }

  // Known limitation: NewsAPI /everything requires a keyword or source
  // (q|qInTitle|sources|domains) — a bare date-range query can't be expressed,
  // so it short-circuits with a typed error instead of firing a guaranteed-failing request.
  private buildUrl({ params }: { params: SearchParams; }): { url: string; error?: string } {
    if (!this.apiKey) {
      return { url: '', error: 'VITE_NEWSAPI_KEY is not set' };
    }
    
    // Check if category was explicitly set (not just a preference default)
    // We infer this by checking if the param object has a category value
    // The FeedPage passes preferences as defaults but we can't distinguish here
    // So we use: if category present AND (keyword or date present), prefer top-headlines
    // This means category takes priority over keyword when both are present
    const hasExplicitCategory = Boolean(params.category);
    
    // Use /top-headlines when category is set (even with keyword/date)
    // because /everything doesn't support category at all
    const useTopHeadlines = hasExplicitCategory;
    const endpoint = useTopHeadlines ? 'top-headlines' : 'everything';
    const url = new URL(`${NEWSAPI_BASE}/${endpoint}`);

    if (useTopHeadlines) {
      // /top-headlines has NO date-range parameter (from/to). Asking it to
      // filter by date would silently drop the date and return unfiltered
      // recent headlines — effectively the default feed. Short-circuit with a
      // typed error so the user's date filter is never silently ignored.
      // Category + date is a documented NewsAPI gap (same class as the
      // /everything q-required rule above).
      if (params.dateFrom || params.dateTo) {
        return {
          url: '',
          error: 'NewsAPI /top-headlines does not support date-range filtering; category + date cannot be combined',
        };
      }

      // /top-headlines: supports category, country, but NOT keyword (on free tier)
      // We send category but skip keyword to avoid API error
      if (params.category) {
        const newsApiCategory = mapCategoryForProvider(params.category, 'newsapi');
        if (newsApiCategory) {
          url.searchParams.set('category', newsApiCategory);
        }
      }
      // Note: keyword is intentionally omitted for /top-headlines
    } else {
      // /everything: supports keyword + date range, NO category.
      // NewsAPI REQUIRES at least one of q | qInTitle | sources | domains —
      // a bare `/everything?pageSize=50` returns HTTP 400 `parametersMissing`
      // ("the scope of your search is too broad").
      const keyword = params.keyword?.trim();
      const hasSources = Boolean(params.sources && params.sources.length > 0);

      // Date-range-only (or no-filter) queries have no keyword and no source
      // to satisfy the mandatory-scope rule. Fabricating `q=news` returned
      // misleadingly narrow results instead of a true date-range filter —
      // short-circuit with a typed error rather than fire a request that
      // would either 400 or silently mis-filter.
      if (!keyword && !hasSources) {
        return {
          url: '',
          error: 'NewsAPI /everything requires a keyword or source; date-range-only filtering is not supported',
        };
      }

      if (keyword) {
        url.searchParams.set('q', keyword);
      } else {
        // No keyword provided → fall back to a broad-but-valid default
        // keyword so the request satisfies NewsAPI's q|sources|domains rule.
        url.searchParams.set('q', 'news');
      }
      if (params.dateFrom) url.searchParams.set('from', params.dateFrom);
      if (params.dateTo) url.searchParams.set('to', params.dateTo);
    }

    // NOTE: Disabled — params.sources contains provider IDs (e.g., "newsapi", "guardian"),
    // not NewsAPI source IDs (e.g., "bbc-news", "cnn"). The aggregator filters providers
    // before calling them, so we should NOT pass provider IDs to NewsAPI's `sources` param.
    // if (params.sources?.length === 1) {
    //   url.searchParams.set('sources', params.sources[0]);
    // }

    url.searchParams.set('pageSize', '50');
    if (params.page) {
      url.searchParams.set('page', String(params.page));
    }
    return { url: url.toString() };
  }
}
