/**
 * Tests for GuardianProvider — mirrors the NewsApiProvider test layout.
 *
 * Two layers:
 *   1. Pure mapping: `mapToArticle()` is exported and tested directly.
 *   2. End-to-end via `search()` with msw intercepting the live fetch.
 *
 * The Guardian-specific mapping rules worth pinning down:
 *   - `id` is namespaced with the provider id so it can't collide with
 *     NewsAPI/NYT ids when results are merged in the aggregator
 *   - `author` is derived from the first `type: 'contributor'` tag
 *   - `category` comes from `sectionName` (Guardian's "section" is its
 *     closest equivalent to a category)
 *   - `summary` and `imageUrl` come from `fields.*`, which the provider
 *     must request via `show-fields` — if Guardian returns no `fields`,
 *     they should default to '' and null respectively
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { guardianSearchResponse } from '@/mocks/fixtures/guardian';
import { GuardianProvider } from './GuardianProvider';
import type { Article } from '@/contracts/Article';

const EXPECTED: Article[] = [
  {
    id: 'guardian:environment/2026/aug/10/heat-dome-pacific-northwest',
    title: 'Heat dome settles over Pacific Northwest for fifth day',
    summary:
      'Temperature records continue to fall as the region enters an extended heat event.',
    url: 'https://www.theguardian.com/environment/2026/aug/10/heat-dome-pacific-northwest',
    imageUrl: 'https://i.guim.co.uk/img/media/heat-dome.jpg',
    author: 'Oliver Milman',
    source: 'The Guardian',
    category: 'Environment',
    publishedAt: '2026-08-10T17:30:00Z',
  },
  {
    id: 'guardian:politics/2026/aug/11/budget-pension-triple-lock',
    title: 'Treasury signals shift on pension triple lock',
    summary: 'A review is expected before the autumn statement.',
    url: 'https://www.theguardian.com/politics/2026/aug/11/budget-pension-triple-lock',
    imageUrl: null,
    author: null, // no contributor tag in this fixture
    source: 'The Guardian',
    category: 'Politics',
    publishedAt: '2026-08-11T08:15:00Z',
  },
  {
    id: 'guardian:technology/2026/aug/11/fusion-startup-funding',
    title: 'Fusion startup raises record Series C',
    summary: '', // fields not requested on this article
    url: 'https://www.theguardian.com/technology/2026/aug/11/fusion-startup-funding',
    imageUrl: null,
    author: null,
    source: 'The Guardian',
    category: 'Technology',
    publishedAt: '2026-08-11T12:00:00Z',
  },
];

describe('GuardianProvider — mapToArticle', () => {
  it('produces the exact Article shape for a fully populated vendor article', () => {
    const provider = new GuardianProvider('test-key');
    const [vendor] = guardianSearchResponse.response.results;
    expect(provider.mapToArticle(vendor)).toEqual(EXPECTED[0]);
  });

  it('maps `sectionName` to `category` (Guardian has no separate category field)', () => {
    const provider = new GuardianProvider('test-key');
    const [vendor] = guardianSearchResponse.response.results;
    expect(provider.mapToArticle(vendor).category).toBe('Environment');
  });

  it('uses the first contributor tag as the author', () => {
    const provider = new GuardianProvider('test-key');
    const [vendor] = guardianSearchResponse.response.results;
    expect(provider.mapToArticle(vendor).author).toBe('Oliver Milman');
  });

  it('returns null author when there is no contributor tag', () => {
    const provider = new GuardianProvider('test-key');
    const [, vendor] = guardianSearchResponse.response.results;
    expect(provider.mapToArticle(vendor).author).toBeNull();
  });

  it('returns null image and empty summary when `fields` is missing', () => {
    const provider = new GuardianProvider('test-key');
    const [, , vendor] = guardianSearchResponse.response.results;
    const mapped = provider.mapToArticle(vendor);
    expect(mapped.imageUrl).toBeNull();
    expect(mapped.summary).toBe('');
  });

  it('namespaces the article id with the provider id for cross-source uniqueness', () => {
    const provider = new GuardianProvider('test-key');
    const [vendor] = guardianSearchResponse.response.results;
    expect(provider.mapToArticle(vendor).id.startsWith('guardian:')).toBe(true);
  });

  it('uses the provider displayName as the source rather than a vendor-specific label', () => {
    const provider = new GuardianProvider('test-key');
    const [vendor] = guardianSearchResponse.response.results;
    expect(provider.mapToArticle(vendor).source).toBe('The Guardian');
  });
});

describe('GuardianProvider — search()', () => {
  it('returns mapped articles and forwards the api-key as a query param', async () => {
    const seen: { url?: string } = {};
    server.use(
      http.get('https://content.guardianapis.com/search', ({ request }) => {
        seen.url = request.url;
        return HttpResponse.json(guardianSearchResponse);
      }),
    );

    const provider = new GuardianProvider('test-key');
    const articles = await provider.search({ keyword: 'climate' });

    expect(articles).toEqual(EXPECTED);
    expect(seen.url).toBeDefined();
    // Auth is via query param, not header.
    expect(seen.url).toContain('api-key=test-key');
    expect(seen.url).toContain('q=climate');
  });

  it('requests `show-fields` so trailText + thumbnail come back', async () => {
    let seenUrl: string | undefined;
    server.use(
      http.get('https://content.guardianapis.com/search', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(guardianSearchResponse);
      }),
    );

    const provider = new GuardianProvider('test-key');
    await provider.search({});

    expect(seenUrl).toContain('show-fields=trailText%2Cthumbnail');
  });

  it('forwards section and date range to the query string', async () => {
    let seenUrl: string | undefined;
    server.use(
      http.get('https://content.guardianapis.com/search', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(guardianSearchResponse);
      }),
    );

    const provider = new GuardianProvider('test-key');
    await provider.search({
      category: 'Politics',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-12',
    });

    // Category is mapped to Guardian's expected format (lowercase)
    expect(seenUrl).toContain('section=politics');
    expect(seenUrl).toContain('from-date=2026-08-01');
    expect(seenUrl).toContain('to-date=2026-08-12');
  });

  it('rejects with a typed error when the API key is missing — no network call', async () => {
    vi.stubEnv('VITE_GUARDIAN_KEY', '');
    const spy = vi.spyOn(globalThis, 'fetch');
    const unkeyed = new GuardianProvider(undefined);

    await expect(unkeyed.search({ keyword: 'anything' })).rejects.toThrow(/VITE_GUARDIAN_KEY/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('surfaces 4xx as HttpError without retrying — protects the daily quota', async () => {
    const spy = vi.fn(() =>
      HttpResponse.json({ response: { status: 'error', message: 'apiKeyInvalid' } }, { status: 401 }),
    );
    server.use(http.get('https://content.guardianapis.com/search', spy));

    const provider = new GuardianProvider('test-key');
    await expect(provider.search({ keyword: 'x' })).rejects.toMatchObject({
      name: 'HttpError',
      status: 401,
      isClientError: true,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
});
