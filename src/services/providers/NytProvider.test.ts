/**
 * Tests for NytProvider — mirrors the GuardianProvider test layout.
 *
 * Two layers:
 *   1. Pure mapping: `mapToArticle()` is exported and tested directly.
 *   2. End-to-end via `search()` with msw intercepting the live fetch.
 *
 * The NYT-specific mapping rules worth pinning down:
 *   - `id` is namespaced with the provider id so it can't collide with
 *     NewsAPI/Guardian ids when results are merged in the aggregator
 *   - `author` is parsed from `byline.original` with the leading "By " stripped
 *   - `category` prefers `news_desk` (granular desk) over `section_name`
 *   - `summary` prefers `abstract` (short) over `lead_paragraph` (long),
 *     defaulting to '' if neither is present
 *   - `imageUrl` picks `multimedia[].type === 'default'` first, then `'thumb'`,
 *     and prepends the NYT image host so the path-only URL becomes usable
 *   - Date filters are translated from ISO `YYYY-MM-DD` to NYT's `YYYYMMDD`
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { nytArticlesResponse } from '@/mocks/fixtures/nyt';
import { NytProvider } from './NytProvider';
import type { Article } from '@/contracts/Article';

const EXPECTED: Article[] = [
  {
    id: 'nyt:nyt://article/2026-08-11T12:30:00Z/climate-summit-2026',
    title: 'Climate summit closes with surprise methane pledge',
    summary:
      'Forty nations signed a nonbinding agreement to slash methane emissions faster than planned.',
    url: 'https://www.nytimes.com/2026/08/11/world/climate/climate-summit-2026.html',
    imageUrl: 'https://www.nytimes.com/images/2026/08/11/climate-summit/merlin-123456-default.jpg',
    author: 'Lisa Friedman and Max Bearak',
    source: 'The New York Times',
    category: 'Climate',
    publishedAt: '2026-08-11T12:30:00Z',
  },
  {
    id: 'nyt:nyt://article/2026-08-12T08:00:00Z/fed-rate-decision',
    title: 'Fed signals a pause as inflation cools',
    summary:
      'Policymakers held rates steady and hinted at the end of the tightening cycle.',
    url: 'https://www.nytimes.com/2026/08/12/business/fed-rate-decision.html',
    imageUrl: 'https://www.nytimes.com/images/2026/08/12/fed/thumb-789.jpg',
    author: null, // no byline on this fixture
    source: 'The New York Times',
    category: 'Business',
    publishedAt: '2026-08-12T08:00:00Z',
  },
  {
    id: 'nyt:nyt://article/2026-08-12T15:45:00Z/op-ed-ai-policy',
    title: 'Opinion: AI policy needs less theater, more substance',
    summary:
      'A short abstract is enough — the article did not include a lead_paragraph either.',
    url: 'https://www.nytimes.com/2026/08/12/opinion/ai-policy.html',
    imageUrl: null, // multimedia empty on this fixture
    author: 'Ezra Klein',
    source: 'The New York Times',
    category: 'Opinion',
    publishedAt: '2026-08-12T15:45:00Z',
  },
];

describe('NytProvider — mapToArticle', () => {
  it('produces the exact Article shape for a fully populated vendor doc', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor)).toEqual(EXPECTED[0]);
  });

  it('prefers `news_desk` over `section_name` for category', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).category).toBe('Climate');
  });

  it('strips the leading "By " from byline.original', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).author).toBe('Lisa Friedman and Max Bearak');
  });

  it('returns null author when there is no byline', () => {
    const provider = new NytProvider('test-key');
    const [, vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).author).toBeNull();
  });

  it('returns null imageUrl when `multimedia` is missing or empty', () => {
    const provider = new NytProvider('test-key');
    const [, , vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).imageUrl).toBeNull();
  });

  it('prepends the NYT image host to multimedia[].url', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).imageUrl).toMatch(/^https:\/\/www\.nytimes\.com\//);
  });

  it('falls back to `thumb` when no `default` image is present', () => {
    const provider = new NytProvider('test-key');
    const doc = {
      ...nytArticlesResponse.response.docs[0],
      multimedia: [
        { url: '/images/x.jpg', type: 'thumb' },
        { url: '/images/y.jpg', type: 'image' },
      ],
    };
    expect(provider.mapToArticle(doc).imageUrl).toBe(
      'https://www.nytimes.com/images/x.jpg',
    );
  });

  it('prefers `abstract` over `lead_paragraph` for summary', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).summary).toBe(
      'Forty nations signed a nonbinding agreement to slash methane emissions faster than planned.',
    );
  });

  it('namespaces the article id with the provider id for cross-source uniqueness', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).id.startsWith('nyt:')).toBe(true);
  });

  it('uses the provider displayName as the source rather than a vendor-specific label', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).source).toBe('The New York Times');
  });
});

describe('NytProvider — search()', () => {
  it('returns mapped articles and forwards the api-key as a query param', async () => {
    const seen: { url?: string } = {};
    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', ({ request }) => {
        seen.url = request.url;
        return HttpResponse.json(nytArticlesResponse);
      }),
    );

    const provider = new NytProvider('test-key');
    const articles = await provider.search({ keyword: 'climate' });

    expect(articles).toEqual(EXPECTED);
    expect(seen.url).toBeDefined();
    // Auth is via query param, not header.
    expect(seen.url).toContain('api-key=test-key');
    expect(seen.url).toContain('q=climate');
  });

  it('translates ISO date range to NYT YYYYMMDD and forwards as begin_date/end_date', async () => {
    let seenUrl: string | undefined;
    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(nytArticlesResponse);
      }),
    );

    const provider = new NytProvider('test-key');
    await provider.search({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-12',
    });

    expect(seenUrl).toContain('begin_date=20260801');
    expect(seenUrl).toContain('end_date=20260812');
  });

  it('forwards category as an fq=news_desk:(...) filter', async () => {
    let seenUrl: string | undefined;
    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(nytArticlesResponse);
      }),
    );

    const provider = new NytProvider('test-key');
    await provider.search({ category: 'Business' });

    expect(seenUrl).toContain('fq=news_desk%3A%28Business%29');
  });

  it('rejects with a typed error when the API key is missing — no network call', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const unkeyed = new NytProvider(undefined);

    await expect(unkeyed.search({ keyword: 'anything' })).rejects.toThrow(/VITE_NYT_KEY/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces 4xx as HttpError without retrying — protects the daily quota', async () => {
    const spy = vi.fn(() =>
      HttpResponse.json({ fault: { faultstring: 'Invalid api-key' } }, { status: 401 }),
    );
    server.use(http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', spy));

    const provider = new NytProvider('test-key');
    await expect(provider.search({ keyword: 'x' })).rejects.toMatchObject({
      name: 'HttpError',
      status: 401,
      isClientError: true,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
