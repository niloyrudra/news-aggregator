import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { BaseHttpProvider } from '@/services/BaseHttpProvider';
import { z } from 'zod';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import { mapCategoryForProvider } from '@/lib/categoryMapping';

/**
 * The Guardian Open Platform adapter — https://open-platform.theguardian.com
 *
 * Single endpoint (`/search`) handles keyword + date range + section (category).
 * Auth is via the `api-key` query parameter, not a header.
 *
 * Reliability note: Guardian's CORS support from the browser is undocumented.
 * This provider may be unreachable from the deployed origin — the
 * AggregatorService's `Promise.allSettled` strategy is what makes that
 * tolerable, not anything in this file.
 */
const GUARDIAN_BASE = 'https://content.guardianapis.com';

const GuardianVendorTagSchema = z.object({
  webTitle: z.string(),
  type: z.string(), // 'contributor' | 'keyword' | 'tone' | 'type' | ...
});

const GuardianVendorArticleSchema = z.object({
  id: z.string(),
  webTitle: z.string(),
  webUrl: z.string(),
  webPublicationDate: z.string(),
  sectionName: z.string(),
  /** Present only when `show-fields` is requested. */
  fields: z
    .object({
      // Real Guardian responses omit `thumbnail` when an article has no
      // image, and `trailText` is not guaranteed either — each is optional.
      trailText: z.string().nullable().optional(),
      thumbnail: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  tags: z.array(GuardianVendorTagSchema).nullable().optional(),
});

const GuardianVendorResponseSchema = z.object({
  response: z.object({
    status: z.string(),
    total: z.number(),
    results: z.array(GuardianVendorArticleSchema),
  }),
});

type GuardianVendorTag = z.infer<typeof GuardianVendorTagSchema>;
type GuardianVendorArticle = z.infer<typeof GuardianVendorArticleSchema>;
type GuardianVendorResponse = z.infer<typeof GuardianVendorResponseSchema>;

export class GuardianProvider extends BaseHttpProvider implements NewsProvider {
  readonly id = 'guardian';
  readonly displayName = 'The Guardian';

  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined = import.meta.env.VITE_GUARDIAN_KEY) {
    // Same tight budget as NewsAPI. Guardian's free tier is reliable when
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
    return this.getJson<GuardianVendorResponse>(url, undefined, signal).then((res) => {
      const validated = GuardianVendorResponseSchema.parse(res);
      return validated.response.results.map((a) => this.mapToArticle(a));
    });
  }

  /** Exposed for unit testing — see services/providers/GuardianProvider.test.ts. */
  mapToArticle(vendor: GuardianVendorArticle): Article {
    return {
      id: `${this.id}:${vendor.id}`,
      title: sanitizeHtml(vendor.webTitle ?? ''),
      summary: sanitizeHtml(vendor.fields?.trailText ?? ''),
      url: vendor.webUrl,
      imageUrl: vendor.fields?.thumbnail ?? null,
      author: this.firstContributor(vendor.tags || undefined),
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
    
    // Map UI category to Guardian's section parameter
    if (params.category) {
      const guardianCategory = mapCategoryForProvider(params.category, 'guardian');
      if (guardianCategory) {
        url.searchParams.set('section', guardianCategory);
      }
    }

    // Required: trailText + thumbnail live in `fields` and only come back if
    // we ask for them. `show-fields` is comma-separated.
    url.searchParams.set('show-fields', 'trailText,thumbnail');

    // Tags include `type: contributor` which is how we identify the author.
    url.searchParams.set('show-tags', 'contributor');

    url.searchParams.set('page-size', '50');
    if (params.page) {
      url.searchParams.set('page', String(params.page));
    }
    url.searchParams.set('api-key', this.apiKey);
    return { url: url.toString() };
  }
}
