/**
 * Tests for NewsApiProvider — the highest-value test in the spec:
 * "given a mocked vendor response, assert the adapter's mapToArticle()
 * output matches the canonical Article shape exactly."
 *
 * Two layers are exercised:
 *   1. Pure mapping: `mapToArticle()` is exported and tested directly.
 *   2. End-to-end via `search()` with msw intercepting the live fetch —
 *      proves the URL builder, headers, and the `getJson` pipeline all
 *      compose correctly against the real NewsAPI request shape.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { newsApiArticlesResponse } from '@/mocks/fixtures/newsapi';
import { NewsApiProvider } from './NewsApiProvider';
import type { Article } from '@/contracts/Article';

// The fixture's two articles map to these canonical Articles, by construction.
const EXPECTED: Article[] = [
  {
    id: 'newsapi:https://www.washingtonpost.com/health/2026/08/10/statins-study/',
    title: 'A new study changes what we know about statins',
    summary:
      'Researchers report a previously unknown effect of the widely prescribed cholesterol drugs.',
    url: 'https://www.washingtonpost.com/health/2026/08/10/statins-study/',
    imageUrl:
      'https://www.washingtonpost.com/wp-statins-study/wp-content/uploads/sites/2/2026/08/GettyImages-statins.jpg',
    author: 'Carolyn Y. Johnson',
    source: 'The Washington Post',
    category: null,
    publishedAt: '2026-08-10T13:04:15Z',
  },
  {
    id: 'newsapi:https://techcrunch.com/2026/08/11/open-source-ai-series-a/',
    title: 'Open-source AI tool lands Series A',
    summary: 'The startup raised $40M to expand the maintainer team.',
    url: 'https://techcrunch.com/2026/08/11/open-source-ai-series-a/',
    imageUrl: null,
    author: null,
    source: 'TechCrunch',
    category: null,
    publishedAt: '2026-08-11T09:00:00Z',
  },
];

describe('NewsApiProvider — mapToArticle', () => {
  it('produces the exact Article shape for a fully populated vendor article', () => {
    const provider = new NewsApiProvider('test-key');
    const [vendor] = newsApiArticlesResponse.articles;
    expect(provider.mapToArticle(vendor)).toEqual(EXPECTED[0]);
  });

  it('handles missing author and missing image without throwing', () => {
    const provider = new NewsApiProvider('test-key');
    const [, vendor] = newsApiArticlesResponse.articles;
    const mapped = provider.mapToArticle(vendor);

    expect(mapped.author).toBeNull();
    expect(mapped.imageUrl).toBeNull();
    // Source name is the human-readable field, not the id.
    expect(mapped.source).toBe('TechCrunch');
  });

  it('uses the provider id as the article id prefix to guarantee uniqueness across sources', () => {
    const provider = new NewsApiProvider('test-key');
    const [vendor] = newsApiArticlesResponse.articles;
    expect(provider.mapToArticle(vendor).id.startsWith('newsapi:')).toBe(true);
  });

  it('falls back to a placeholder source name when vendor.source.name is missing', () => {
    const provider = new NewsApiProvider('test-key');
    const orphan = { ...newsApiArticlesResponse.articles[0], source: { id: null, name: '' } };
    expect(provider.mapToArticle(orphan).source).toBe('NewsAPI');
  });
});

describe('NewsApiProvider — search()', () => {
  let provider: NewsApiProvider;

  beforeEach(() => {
    provider = new NewsApiProvider('test-key');
  });

  it('returns mapped articles from the /everything endpoint when a keyword is present', async () => {
    const seen: { url?: string; key?: string | null } = {};
    server.use(
      http.get('https://newsapi.org/v2/everything', ({ request }) => {
        seen.url = request.url;
        seen.key = request.headers.get('X-Api-Key');
        return HttpResponse.json(newsApiArticlesResponse);
      }),
    );

    const articles = await provider.search({ keyword: 'statins' });

    expect(articles).toEqual(EXPECTED);
    expect(seen.key).toBe('test-key');
    expect(seen.url).toContain('q=statins');
    expect(seen.url).toContain('pageSize=50');
  });

  it('uses /top-headlines when no keyword is given and forwards category', async () => {
    const seen: { url?: string } = {};
    server.use(
      http.get('https://newsapi.org/v2/top-headlines', ({ request }) => {
        seen.url = request.url;
        return HttpResponse.json(newsApiArticlesResponse);
      }),
    );

    // Send UI category format (capitalized) - provider will map to NewsAPI's expected format
    await provider.search({ category: 'Technology' });

    expect(seen.url).toBeDefined();
    // Category is mapped to NewsAPI's expected format (lowercase)
    expect(seen.url).toContain('category=technology');
  });

  it('short-circuits with a typed error when a date range is combined with a category — no network call', async () => {
    // Regression test for the date + category bug: /top-headlines has NO
    // date-range parameter, so asking it to combine category + date would
    // silently drop the date and return unfiltered recent headlines — the
    // "default feed" symptom. The provider must reject with a typed error and
    // never touch the network, so Guardian/NYT results display cleanly.
    const spy = vi.spyOn(globalThis, 'fetch');

    await expect(provider.search({ category: 'Technology', dateFrom: '2026-08-01', dateTo: '2026-08-15' }))
      .rejects.toThrow(/top-headlines does not support date-range/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('still allows a category without a date range through to /top-headlines', async () => {
    const seen: { url?: string } = {};
    server.use(
      http.get('https://newsapi.org/v2/top-headlines', ({ request }) => {
        seen.url = request.url;
        return HttpResponse.json(newsApiArticlesResponse);
      }),
    );

    await provider.search({ category: 'Sports' });

    expect(seen.url).toBeDefined();
    expect(seen.url).toContain('/top-headlines');
    expect(seen.url).toContain('category=sports');
  });

  it('short-circuits with a typed error when keyword + date + category are all set — no network call', async () => {
    // Regression test for diagnostic case (c): keyword + dateFrom/dateTo +
    // category all set. NewsAPI has no single endpoint that supports all three:
    //   - /everything supports keyword + date, but NO category
    //   - /top-headlines supports category, but NO keyword (free tier) and NO date
    // The provider must reject with a typed error rather than silently drop any
    // of the user's filters. Confirmed via diagnostic: buildUrl() returns
    // { url: '', error: 'NewsAPI /top-headlines does not support date-range...' }
    // — no URL is built, so category is never silently dropped.
    const spy = vi.spyOn(globalThis, 'fetch');

    await expect(provider.search({
      keyword: 'climate',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-15',
      category: 'Technology',
    })).rejects.toThrow(/top-headlines does not support date-range/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('short-circuits with a typed error for a query with no keyword and no sources — no network call', async () => {
    // Regression test for the date-range-only bug: NewsAPI /everything
    // requires at least one of q | qInTitle | sources | domains on /everything.
    // A bare date range can't satisfy that, so instead of fabricating `q=news`
    // (which mis-filters the result set to only "news"-keyword articles) or
    // firing a request that would 400, the provider must reject with a typed
    // error and never touch the network.
    const spy = vi.spyOn(globalThis, 'fetch');

    await expect(provider.search({ dateFrom: '2026-08-01', dateTo: '2026-08-15' }))
      .rejects.toThrow(/NewsAPI \/everything requires a keyword or source/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('short-circuits with a typed error for a completely empty query — no network call', async () => {
    // Initial page load with no URL params and no preferences: no keyword,
    // no sources — NewsAPI can't express "all news". Reject with a typed
    // error instead of fabricating `q=news` (which silently narrows results
    // to only articles matching the literal word "news").
    const spy = vi.spyOn(globalThis, 'fetch');

    await expect(provider.search({})).rejects.toThrow(/NewsAPI \/everything requires a keyword or source/);
    expect(spy).not.toHaveBeenCalled();
  });

  // NOTE: Disabled — the old test assumed params.sources could be used as NewsAPI source IDs.
  // In reality, params.sources contains PROVIDER IDs (e.g., "newsapi", "guardian"), not
  // NewsAPI source IDs (e.g., "bbc-news", "cnn"). The aggregator filters providers before
  // calling them, so we don't pass provider IDs to NewsAPI's `sources` param.
  // it('does not add the fallback q when a single source satisfies the required-param rule', async () => {
  //   const seen: { url?: string } = {};
  //   server.use(
  //     http.get('https://newsapi.org/v2/everything', ({ request }) => {
  //       seen.url = request.url;
  //       return HttpResponse.json(newsApiArticlesResponse);
  //     }),
  //   );
  //
  //   await provider.search({ sources: ['cnn'] });
  //
  //   expect(seen.url).toBeDefined();
  //   expect(seen.url).toContain('sources=cnn');
  //   // `sources` already satisfies NewsAPI's required-param rule — no fallback q.
  //   expect(seen.url).not.toContain('q=');
  // });

  it('always includes fallback q=news when no keyword is provided (params.sources is provider IDs, not NewsAPI sources)', async () => {
    const seen: { url?: string } = {};
    server.use(
      http.get('https://newsapi.org/v2/everything', ({ request }) => {
        seen.url = request.url;
        return HttpResponse.json(newsApiArticlesResponse);
      }),
    );

    // Simulate the real app: sources=['newsapi'] means user selected NewsAPI provider
    await provider.search({ sources: ['newsapi'] });

    expect(seen.url).toBeDefined();
    expect(seen.url).toContain('/everything');
    // Provider IDs are NOT passed to NewsAPI's sources param
    expect(seen.url).not.toContain('sources=');
    // Fallback q is always used when no keyword
    expect(seen.url).toContain('q=news');
  });

  it('uses the trimmed keyword as q when present', async () => {
    const seen: { url?: string } = {};
    server.use(
      http.get('https://newsapi.org/v2/everything', ({ request }) => {
        seen.url = request.url;
        return HttpResponse.json(newsApiArticlesResponse);
      }),
    );

    await provider.search({ keyword: '  climate  ' });

    expect(seen.url).toBeDefined();
    expect(seen.url).toContain('q=climate');
    expect(seen.url).not.toContain('q=news');
  });

  it('rejects with a typed error when the API key is missing — no network call', async () => {
    vi.stubEnv('VITE_NEWSAPI_KEY', '');
    const spy = vi.spyOn(globalThis, 'fetch');
    const unkeyed = new NewsApiProvider(undefined);

    await expect(unkeyed.search({ keyword: 'anything' })).rejects.toThrow(/VITE_NEWSAPI_KEY/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces 4xx as HttpError without retrying — protects the daily quota', async () => {
    const spy = vi.fn(() => HttpResponse.json({ status: 'error', message: 'apiKeyInvalid' }, { status: 401 }));
    server.use(http.get('https://newsapi.org/v2/everything', spy));

    await expect(provider.search({ keyword: 'x' })).rejects.toMatchObject({
      name: 'HttpError',
      status: 401,
      isClientError: true,
    });
    // 4xx must not retry — single attempt.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
});
