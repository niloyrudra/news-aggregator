import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { BaseHttpProvider } from '@/services/BaseHttpProvider';
import { z } from 'zod';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { mapCategoryForProvider } from '@/lib/categoryMapping';

/**
 * The New York Times Article Search API adapter — https://developer.nytimes.com/docs/articlesearch-product/1/overview
 *
 * Single endpoint (`/articlesearch.json`) handles keyword + date range + section/news-desk filter.
 * Auth is via the `api-key` query parameter, not a header — same shape as Guardian.
 *
 * Real API returns `multimedia` as an OBJECT with `default`/`thumbnail` keys
 * containing ABSOLUTE URLs (`https://static01.nyt.com/...`). The host-prepend
 * safety net below only applies to path-only URLs from edge-case responses.
 *
 * Reliability note: like Guardian, NYT's CORS support from the browser is not
 * guaranteed. The AggregatorService's `Promise.allSettled` strategy is what
 * makes a dead upstream tolerable, not anything in this file.
 */
const NYT_BASE = 'https://api.nytimes.com/svc/search/v2';
const NYT_IMAGE_HOST = 'https://www.nytimes.com';

/**
 * Real NYT Article Search API returns `multimedia` as an OBJECT, not an array:
 *
 *   multimedia: {
 *     caption: "...",
 *     credit: "...",
 *     default:  { url: "https://static01.nyt.com/...", height: 400, width: 600 },
 *     thumbnail: { url: "https://static01.nyt.com/...", height: 75, width: 75 }
 *   }
 *
 * Verified live against the production API (2026-08-14). The earlier array
 * shape was a fixture artifact — every real response uses this object shape.
 */
const NytVendorMultimediaSchema = z.object({
  caption: z.string().nullable().optional(),
  credit: z.string().nullable().optional(),
  /** 'default' — large image. */
  default: z
    .object({
      url: z.string(),
      height: z.number().optional(),
      width: z.number().optional(),
    })
    .nullable()
    .optional(),
  /** 'thumbnail' — square thumbnail. */
  thumbnail: z
    .object({
      url: z.string(),
      height: z.number().optional(),
      width: z.number().optional(),
    })
    .nullable()
    .optional(),
});

const NytVendorHeadlineSchema = z.object({
  main: z.string(),
  print_headline: z.string().nullable().optional(),
});

const NytVendorBylineSchema = z.object({
  original: z.string().nullable().optional(),
});

const NytVendorDocSchema = z.object({
  _id: z.string(),
  headline: NytVendorHeadlineSchema,
  abstract: z.string().nullable().optional(),
  lead_paragraph: z.string().nullable().optional(),
  web_url: z.string(),
  pub_date: z.string(),
  news_desk: z.string().nullable().optional(),
  section_name: z.string().nullable().optional(),
  byline: NytVendorBylineSchema.nullable().optional(),
  multimedia: NytVendorMultimediaSchema.nullable().optional(),
});

const NytVendorResponseSchema = z.object({
  status: z.string(),
  response: z.object({
    // NYT returns `docs: null` (with hits: 0) when a filter matches no
    // results — a valid "no results" response, not an error. Treat null as
    // an empty array so the adapter returns [] instead of throwing.
    docs: z.array(NytVendorDocSchema).nullable().default([]),
  }),
});

type NytVendorMultimedia = z.infer<typeof NytVendorMultimediaSchema>;
// type NytVendorHeadline = z.infer<typeof NytVendorHeadlineSchema>;
type NytVendorByline = z.infer<typeof NytVendorBylineSchema>;
type NytVendorDoc = z.infer<typeof NytVendorDocSchema>;
type NytVendorResponse = z.infer<typeof NytVendorResponseSchema>;

export class NytProvider extends BaseHttpProvider implements NewsProvider {
  readonly id = 'nyt';
  readonly displayName = 'The New York Times';

  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = import.meta.env.VITE_NYT_KEY) {
    // Same tight budget as NewsAPI/Guardian. NYT's free tier is reliable when
    // reachable; a slow call usually means CORS preflight is hanging, which
    // this timeout surfaces as a clean error rather than blocking the UI.
    super({ timeoutMs: 8_000, maxAttempts: 2, initialBackoffMs: 250 });
    // Treat empty string the same as undefined so a missing/blank env var
    // short-circuits in buildUrl() instead of firing a keyless request.
    this.apiKey = apiKey || undefined;
  }

  search(params: SearchParams, signal?: AbortSignal): Promise<Article[]> {
    const { url, error } = this.buildUrl(params);
    if (error) {
      return Promise.reject(new Error(error));
    }
    return this.getJson<NytVendorResponse>(url, undefined, signal).then((res) => {
      const validated = NytVendorResponseSchema.parse(res);
      // NYT returns `docs: null` when a filter matches no results — treat as [].
      return (validated.response.docs ?? []).map((d) => this.mapToArticle(d));
    });
  }

  /** Exposed for unit testing — see services/providers/NytProvider.test.ts. */
  mapToArticle(vendor: NytVendorDoc): Article {
    return {
      id: `${this.id}:${vendor._id}`,
      title: sanitizeHtml(vendor.headline?.main ?? ''),
      summary: sanitizeHtml(vendor.abstract ?? vendor.lead_paragraph ?? ''),
      url: vendor.web_url,
      imageUrl: this.pickImage(vendor.multimedia ?? undefined),
      author: this.parseByline(vendor.byline || undefined),
      source: this.displayName,
      category: vendor.news_desk || vendor.section_name || null,
      publishedAt: vendor.pub_date,
    };
  }

  /**
   * NYT's `multimedia` object has `default` (large) and `thumbnail` (square)
   * keys. Prefer `default`, fall back to `thumbnail`.
   *
   * Real API returns ABSOLUTE URLs (`https://static01.nyt.com/...`). The host
   * prepend is kept only as a safety net for any path-only URLs that may
   * appear in older/edge-case responses.
   */
  private pickImage(multimedia: NytVendorMultimedia | undefined): string | null {
    if (!multimedia) return null;
    const preferred = multimedia.default ?? multimedia.thumbnail;
    if (!preferred?.url) return null;
    return preferred.url.startsWith('http')
      ? preferred.url
      : `${NYT_IMAGE_HOST}${preferred.url}`;
  }

  /** `By Some Author` → `Some Author`. Returns null if no byline. */
  private parseByline(byline: NytVendorByline | undefined): string | null {
    const original = byline?.original?.trim();
    if (!original) return null;
    return original.replace(/^By\s+/i, '');
  }

  private buildUrl(params: SearchParams): { url: string; error?: string } {
    if (!this.apiKey) {
      return { url: '', error: 'VITE_NYT_KEY is not set' };
    }

    const url = new URL(`${NYT_BASE}/articlesearch.json`);
    
    // Build query: combine keyword and category (NYT's fq filter returns 0 hits)
    const queryParts: string[] = [];
    if (params.keyword) queryParts.push(params.keyword);
    if (params.category) {
      const nytCategory = mapCategoryForProvider(params.category, 'nyt');
      if (nytCategory) queryParts.push(nytCategory);
    }
    if (queryParts.length > 0) {
      url.searchParams.set('q', queryParts.join(' '));
    }

    if (params.dateFrom) url.searchParams.set('begin_date', toNytDate(params.dateFrom));
    if (params.dateTo) url.searchParams.set('end_date', toNytDate(params.dateTo));

    url.searchParams.set('api-key', this.apiKey);
    if (params.page) {
      // NYT uses 0-based page index
      url.searchParams.set('page', String(params.page - 1));
    }
    return { url: url.toString() };
  }
}

/**
 * NYT's date filter is `YYYYMMDD`, not ISO. `SearchParams` is ISO (`YYYY-MM-DD`)
 * so we strip the dashes. If the input is malformed, we pass it through and let
 * NYT's own validation surface the error — keeps the adapter's behavior simple
 * and the boundary explicit.
 */
function toNytDate(iso: string): string {
  return iso.replace(/-/g, '');
}
