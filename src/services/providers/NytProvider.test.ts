/**
 * Tests for NytProvider — mirrors the GuardianProvider/NewsApiProvider test layout.
 *
 * Two layers:
 *   1. Pure mapping: `mapToArticle()` is exported and tested directly.
 *   2. End-to-end via `search()` with msw intercepting the live fetch.
 *
 * NYT-specific mapping rules worth pinning down:
 *   - `byline.original` is prefixed with "By " — strip it once, but never
 *     double-strip a name that doesn't have the prefix
 *   - `multimedia[].url` is a *relative* path; the canonical image URL is
 *     prefixed with `https://www.nytimes.com/`
 *   - `summary` prefers `abstract`, falls back to `lead_paragraph`, then ''
 *   - Date params use `YYYYMMDD`, not ISO; `SearchParams` gives ISO and the
 *     provider must convert
 *   - Category is filtered via Lucene-style `fq`, not a simple field
 *   - `id` is namespaced with the provider id (cross-source uniqueness)
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { nytArticleSearchResponse } from '@/mocks/fixtures/nyt';
import { NytProvider } from './NytProvider';
import type { Article } from '@/contracts/Article';

const EXPECTED: Article[] = [
  {
    id: 'nyt:nyt://article/abc-123-def-456',
    title: 'Global Supply Chain Slowdown Reaches Retail Shelves',
    summary:
      'A worldwide slowdown in shipping has begun to ripple through retail inventories, raising the prospect of shortages ahead of the holiday season.',
    url: 'https://www.nytimes.com/2026/08/10/world/economy/global-supply-chain.html',
    imageUrl: 'https://www.nytimes.com/images/2026/08/10/world/10supply-1/10supply-1-articleLarge.jpg',
    author: 'Ana Swanson and Jordyn Holman',
    source: 'The New York Times',
    category: 'Business',
    publishedAt: '2026-08-10T14:00:09+0000',
  },
  {
    id: 'nyt:nyt://article/ghi-789-jkl-012',
    title: 'Europe Is Quietly Winning the AI Regulation Race',
    summary: 'The draft directive could reshape how the largest systems are deployed.',
    url: 'https://www.nytimes.com/2026/08/11/opinion/ai-regulation-eu.html',
    imageUrl: null,
    author: null, // opinion piece — no byline
    source: 'The New York Times',
    category: 'Opinion',
    publishedAt: '2026-08-11T09:30:00+0000',
  },
  {
    id: 'nyt:nyt://article/mno-345-pqr-678',
    title: 'Yankees Swing for a Frontline Starter at the Deadline',
    summary: 'With hours to go before the deadline, the Yankees made a bold move.',
    url: 'https://www.nytimes.com/2026/08/11/sports/baseball/yankees-trade-deadline.html',
    imageUrl: 'https://www.nytimes.com/images/2026/08/11/sports/11yankees/11yankees-articleLarge.jpg',
    // Byline lacked "By " prefix in the fixture — must not double-strip.
    author: 'James Wagner',
    source: 'The New York Times',
    category: 'Sports',
    publishedAt: '2026-08-11T20:15:00+0000',
  },
];

describe('NytProvider — mapToArticle', () => {
  it('produces the exact Article shape for a fully populated vendor article', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticleSearchResponse.response.docs;
    expect(provider.mapToArticle(vendor)).toEqual(EXPECTED[0]);
  });

  it('strips the "By " prefix from byline.original exactly once', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticleSearchResponse.response.docs;
    expect(provider.mapToArticle(vendor).author).toBe('Ana Swanson and Jordyn Holman');
  });

  it('does not double-strip a byline that already lacks the "By " prefix', () => {
    const provider = new NytProvider('test-key');
    const [, , vendor] = nytArticleSearchResponse.response.docs;
    expect(provider.mapToArticle(vendor).author).toBe('James Wagner');
  });

  it('returns null author for an opinion piece with no byline', () => {
    const provider = new NytProvider('test-key');
    const [, vendor] = nytArticleSearchResponse.response.docs;
    expect(provider.mapToArticle(vendor).author).toBeNull();
  });

  it('prefers `abstract` over `lead_paragraph` for `summary`, falling back to the latter', () => {
    const provider = new NytProvider('test-key');
    const abstractOnly = provider.mapToArticle(nytArticleSearchResponse.response.docs[0]);
    expect(abstractOnly.summary.startsWith('A worldwide slowdown')).toBe(true);

    const abstractCleared = {
      ...nytArticleSearchResponse.response.docs[0],
      abstract: null,
    };
    expect(provider.mapToArticle(abstractCleared).summary).toBe(
      'Port operators from Long Beach to Rotterdam are reporting record backlogs.',
    );
  });

  it('picks the first image from `multimedia` and prefixes the relative URL with the host', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticleSearchResponse.response.docs;
    expect(provider.mapToArticle(vendor).imageUrl).toBe(
      'https://www.nytimes.com/images/2026/08/10/world/10supply-1/10supply-1-articleLarge.jpg',
    );
  });

  it('returns null image when `multimedia` is empty or absent', () => {
    const provider = new NytProvider('test-key');
    const noImages = provider.mapToArticle(nytArticleSearchResponse.response.docs[1]);
    expect(noImages.imageUrl).toBeNull();

    const absent = provider.mapToArticle({ ...nytArticleSearchResponse.response.docs[1], multimedia: undefined });
    expect(absent.imageUrl).toBeNull();
  });

  it('namespaces the article id with the provider id for cross-source uniqueness', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticleSearchResponse.response.docs;
    expect(provider.mapToArticle(vendor).id.startsWith('nyt:')).toBe(true);
  });

  it('uses the provider displayName as the source rather than a vendor-specific label', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticleSearchResponse.response.docs;
    expect(provider.mapToArticle(vendor).source).toBe('The New York Times');
  });

  it('uses `section_name` as the category', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticleSearchResponse.response.docs;
    expect(provider.mapToArticle(vendor).category).toBe('Business');
  });
});

describe('NytProvider — search()', () => {
  it('returns mapped articles and forwards the api-key as a query param', async () => {
    const seen: { url?: string } = {};
    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', ({ request }) => {
        seen.url = request.url;
        return HttpResponse.json(nytArticleSearchResponse);
      }),
    );

    const provider = new NytProvider('test-key');
    const articles = await provider.search({ keyword: 'supply chain' });

    expect(articles).toEqual(EXPECTED);
    expect(seen.url).toBeDefined();
    expect(seen.url).toContain('api-key=test-key');
    expect(seen.url).toContain('q=supply+chain');
  });

  it('converts ISO date params to NYT YYYYMMDD format', async () => {
    let seenUrl: string | undefined;
    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(nytArticleSearchResponse);
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

  it('sends the category as a Lucene-style `fq` filter', async () => {
    let seenUrl: string | undefined;
    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(nytArticleSearchResponse);
      }),
    );

    const provider = new NytProvider('test-key');
    await provider.search({ category: 'Politics' });

    expect(seenUrl).toContain('fq=section_name%3A%28%22Politics%22%29');
  });

  it('rejects with a typed error when the API key is missing — no network call', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const unkeyed = new NytProvider(undefined);

    await expect(unkeyed.search({ keyword: 'anything' })).rejects.toThrow(/VITE_NYT_KEY/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces 4xx as HttpError without retrying — protects the daily quota', async () => {
    const spy = vi.fn(() =>
      HttpResponse.json({ faults: [{ faultstring: 'Invalid API Key' }] }, { status: 401 }),
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
