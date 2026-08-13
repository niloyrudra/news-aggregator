import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { BaseHttpProvider } from '@/services/BaseHttpProvider';
import { z } from 'zod';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

/**
 * The New York Times Article Search API adapter — https://developer.nytimes.com/docs/articlesearch-product/1/overview
 *
 * Single endpoint (`/articlesearch.json`) handles keyword + date range + section/news-desk filter.
 * Auth is via the `api-key` query parameter, not a header — same shape as Guardian.
 *
 * NYT returns relative URLs in `multimedia[].url` (e.g. `/images/...`); we prepend
 * the NYT image host (`https://www.nytimes.com/`) so the mapped `imageUrl` is
 * ready to drop into an `<img src>`.
 *
 * Reliability note: like Guardian, NYT's CORS support from the browser is not
 * guaranteed. The AggregatorService's `Promise.allSettled` strategy is what
 * makes a dead upstream tolerable, not anything in this file.
 */
const NYT_BASE = 'https://api.nytimes.com/svc/search/v2';
const NYT_IMAGE_HOST = 'https://www.nytimes.com';

const NytVendorMultimediaSchema = z.object({
  url: z.string(),
  /** 'default' — large image; 'thumb' — square thumbnail. */
  type: z.string().nullable().optional(),
  subtype: z.string().nullable().optional(),
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
  multimedia: z.array(NytVendorMultimediaSchema).nullable().optional(),
});

const NytVendorResponseSchema = z.object({
  status: z.string(),
  response: z.object({
    docs: z.array(NytVendorDocSchema),
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
      return validated.response.docs.map((d) => this.mapToArticle(d));
    });
  }

  /** Exposed for unit testing — see services/providers/NytProvider.test.ts. */
  mapToArticle(vendor: NytVendorDoc): Article {
    return {
      id: `${this.id}:${vendor._id}`,
      title: sanitizeHtml(vendor.headline?.main ?? ''),
      summary: sanitizeHtml(vendor.abstract ?? vendor.lead_paragraph ?? ''),
      url: vendor.web_url,
      imageUrl: this.pickImage(vendor.multimedia || []),
      author: this.parseByline(vendor.byline || undefined),
      source: this.displayName,
      category: vendor.news_desk || vendor.section_name || null,
      publishedAt: vendor.pub_date,
    };
  }

  /** NYT's multimedia array is unsorted; prefer `default`, fall back to `thumb`. */
  private pickImage(multimedia: NytVendorMultimedia[] | undefined): string | null {
    if (!multimedia || multimedia.length === 0) return null;
    const preferred =
      multimedia.find((m) => m.type === 'default') ??
      multimedia.find((m) => m.type === 'thumb') ??
      multimedia[0];
    if (!preferred?.url) return null;
    // NYT returns paths like `/images/...` — prepend the host so the URL is usable.
    return `${NYT_IMAGE_HOST}${preferred.url}`;
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
    if (params.keyword) url.searchParams.set('q', params.keyword);
    if (params.dateFrom) url.searchParams.set('begin_date', toNytDate(params.dateFrom));
    if (params.dateTo) url.searchParams.set('end_date', toNytDate(params.dateTo));
    if (params.category) url.searchParams.set('fq', `news_desk:(${params.category})`);

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
