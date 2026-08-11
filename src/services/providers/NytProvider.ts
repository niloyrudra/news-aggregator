import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { BaseHttpProvider } from '@/services/BaseHttpProvider';

/**
 * New York Times Article Search API v2 adapter.
 *   https://developer.nytimes.com/docs/articlesearch-product/1/overview
 *
 * Auth is via the `api-key` query parameter (like Guardian).
 *
 * Date format gotcha: NYT expects `YYYYMMDD`, not the ISO `YYYY-MM-DD`
 * that `SearchParams` carries. We convert in `buildUrl`.
 *
 * Category gotcha: NYT uses Lucene-style `fq` instead of a simple field.
 * `section_name:("Politics")` is the standard filter for the section field.
 */
const NYT_BASE = 'https://api.nytimes.com/svc/search/v2';

interface NytVendorMultimedia {
  type: string;
  subtype?: string;
  url: string;
}

interface NytVendorArticle {
  _id: string;
  web_url: string;
  headline: { main?: string };
  abstract?: string | null;
  lead_paragraph?: string;
  byline: { original: string | null };
  pub_date: string;
  section_name?: string;
  subsection_name?: string | null;
  multimedia?: NytVendorMultimedia[];
}

interface NytVendorResponse {
  status: string;
  response: { docs: NytVendorArticle[] };
}

export class NytProvider extends BaseHttpProvider implements NewsProvider {
  readonly id = 'nyt';
  readonly displayName = 'The New York Times';

  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = import.meta.env.VITE_NYT_KEY) {
    super({ timeoutMs: 8_000, maxAttempts: 2, initialBackoffMs: 250 });
    this.apiKey = apiKey;
  }

  search(params: SearchParams, signal?: AbortSignal): Promise<Article[]> {
    const { url, error } = this.buildUrl(params);
    if (error) {
      return Promise.reject(new Error(error));
    }
    return this.getJson<NytVendorResponse>(url, undefined, signal).then((res) =>
      res.response.docs.map((d) => this.mapToArticle(d)),
    );
  }

  /** Exposed for unit testing — see services/providers/NytProvider.test.ts. */
  mapToArticle(vendor: NytVendorArticle): Article {
    return {
      id: `${this.id}:${vendor._id}`,
      title: vendor.headline?.main ?? '',
      summary: vendor.abstract ?? vendor.lead_paragraph ?? '',
      url: vendor.web_url,
      imageUrl: this.firstImage(vendor.multimedia),
      author: this.normalizeByline(vendor.byline?.original),
      source: this.displayName,
      category: vendor.section_name || null,
      publishedAt: vendor.pub_date,
    };
  }

  /** NYT's `byline.original` is usually "By Jane Doe" — strip the prefix once. */
  protected normalizeByline(raw: string | null | undefined): string | null {
    if (!raw) return null;
    return raw.startsWith('By ') ? raw.slice(3) : raw;
  }

  /** NYT returns image URLs as paths; prepend the canonical host. */
  private firstImage(multimedia: NytVendorMultimedia[] | undefined): string | null {
    if (!multimedia) return null;
    const image = multimedia.find((m) => m.type === 'image' && m.url);
    if (!image) return null;
    return image.url.startsWith('http') ? image.url : `https://www.nytimes.com/${image.url}`;
  }

  private buildUrl(params: SearchParams): { url: string; error?: string } {
    if (!this.apiKey) {
      return { url: '', error: 'VITE_NYT_KEY is not set' };
    }

    const url = new URL(`${NYT_BASE}/articlesearch.json`);
    if (params.keyword) url.searchParams.set('q', params.keyword);
    const from = toNytDate(params.dateFrom);
    const to = toNytDate(params.dateTo);
    if (from) url.searchParams.set('begin_date', from);
    if (to) url.searchParams.set('end_date', to);
    if (params.category) {
      // Lucene-style filter query. Quotes around the value to keep multi-word
      // categories intact (e.g. "Real Estate").
      url.searchParams.set('fq', `section_name:("${params.category}")`);
    }

    url.searchParams.set('page', '0');
    url.searchParams.set('api-key', this.apiKey);
    return { url: url.toString() };
  }
}

/**
 * Convert ISO date (`YYYY-MM-DD` or full ISO 8601) to NYT's `YYYYMMDD` form.
 * Returns null for falsy/unparseable input — the caller treats null as "no
 * filter set" rather than throwing.
 */
function toNytDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const digits = iso.replace(/-/g, '');
  if (digits.length < 8) return null;
  return digits.slice(0, 8);
}
