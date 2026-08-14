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
 *   - `imageUrl` picks `multimedia.default` first, then `multimedia.thumbnail`,
 *     and passes through ABSOLUTE URLs unchanged (real API returns
 *     `https://static01.nyt.com/...`); path-only URLs get the host prepended
 *     as a safety net
 *   - Date filters are translated from ISO `YYYY-MM-DD` to NYT's `YYYYMMDD`
 *
 * Regression coverage (2026-08-14, verified live):
 *   - Real NYT API returns `multimedia` as an OBJECT with `default`/`thumbnail`
 *     keys, NOT an array. The old array-shaped schema caused every real response
 *     to fail Zod validation → silent "no data, no error" via Promise.allSettled.
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
    imageUrl: 'https://static01.nyt.com/images/2026/08/11/climate-summit/merlin-123456-default.jpg',
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
    imageUrl: 'https://static01.nyt.com/images/2026/08/12/fed/merlin-789-default.jpg',
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

  it('passes through absolute multimedia URLs unchanged (real API shape)', () => {
    const provider = new NytProvider('test-key');
    const [vendor] = nytArticlesResponse.response.docs;
    expect(provider.mapToArticle(vendor).imageUrl).toBe(
      'https://static01.nyt.com/images/2026/08/11/climate-summit/merlin-123456-default.jpg',
    );
  });

  it('falls back to `thumbnail` when no `default` image is present', () => {
    const provider = new NytProvider('test-key');
    const doc = {
      ...nytArticlesResponse.response.docs[0],
      multimedia: {
        caption: 'Thumbnail only',
        credit: 'Test',
        thumbnail: {
          url: 'https://static01.nyt.com/images/x-thumbStandard.jpg',
          height: 75,
          width: 75,
        },
      },
    };
    expect(provider.mapToArticle(doc).imageUrl).toBe(
      'https://static01.nyt.com/images/x-thumbStandard.jpg',
    );
  });

  it('prepends the NYT image host only for path-only URLs (safety net)', () => {
    const provider = new NytProvider('test-key');
    const doc = {
      ...nytArticlesResponse.response.docs[0],
      multimedia: {
        default: { url: '/images/path-only.jpg', height: 400, width: 600 },
      },
    };
    expect(provider.mapToArticle(doc).imageUrl).toBe(
      'https://www.nytimes.com/images/path-only.jpg',
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

  it('handles multimedia as an object with only caption/credit (no images)', () => {
    const provider = new NytProvider('test-key');
    const doc = {
      ...nytArticlesResponse.response.docs[0],
      multimedia: {
        caption: 'No image available',
        credit: 'Test',
      },
    };
    expect(provider.mapToArticle(doc).imageUrl).toBeNull();
  });

  it('handles multimedia: null without throwing', () => {
    const provider = new NytProvider('test-key');
    const doc = {
      ...nytArticlesResponse.response.docs[0],
      multimedia: null,
    };
    expect(provider.mapToArticle(doc).imageUrl).toBeNull();
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

  it('parses a real-shape NYT response with object multimedia without Zod errors', async () => {
    // Regression test for the "no data, no error" bug: the old schema expected
    // `multimedia` to be an array, but the real API returns an object. This
    // test uses the exact real wire shape (object with default/thumbnail keys).
    const realShapeResponse = {
      status: 'OK',
      response: {
        docs: [
          {
            _id: 'nyt://article/e2feea58-78f6-5554-8384-3252d653a729',
            headline: {
              main: 'Top Science Body Deletes Climate Chapter From Judges Manual',
              kicker: '',
              print_headline: 'A Science Body Cuts a Chapter On Climate For Judges',
            },
            abstract:
              'The National Academies of Sciences, Engineering and Medicine had been under pressure from Republican leaders, including President Trump.',
            web_url:
              'https://www.nytimes.com/2026/08/10/climate/national-academies-climate-chapter-judges.html',
            pub_date: '2026-08-10T18:06:34Z',
            news_desk: 'Climate',
            section_name: 'Climate',
            byline: { original: 'By Karen Zraick' },
            multimedia: {
              caption:
                'Several months ago the Federal Judicial Center, a government agency, also removed the climate chapter from its website under Republican pressure.',
              credit: 'Andrew Kelly/Reuters',
              default: {
                url: 'https://static01.nyt.com/images/2026/08/10/climate/00CLI-JUDGES-CHAPTER-01/00CLI-JUDGES-CHAPTER-01-articleLarge.jpg',
                height: 400,
                width: 600,
              },
              thumbnail: {
                url: 'https://static01.nyt.com/images/2026/08/10/climate/00CLI-JUDGES-CHAPTER-01/00CLI-JUDGES-CHAPTER-01-thumbStandard.jpg',
                height: 75,
                width: 75,
              },
            },
          },
        ],
      },
    };

    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', () =>
        HttpResponse.json(realShapeResponse),
      ),
    );

    const provider = new NytProvider('test-key');
    const articles = await provider.search({ keyword: 'climate' });

    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Top Science Body Deletes Climate Chapter From Judges Manual');
    expect(articles[0].imageUrl).toBe(
      'https://static01.nyt.com/images/2026/08/10/climate/00CLI-JUDGES-CHAPTER-01/00CLI-JUDGES-CHAPTER-01-articleLarge.jpg',
    );
    expect(articles[0].author).toBe('Karen Zraick');
    expect(articles[0].category).toBe('Climate');
  });

  it('treats a `docs: null` response as an empty result set (no Zod error)', async () => {
    // Regression test: NYT returns `docs: null` (with hits: 0) when a filter
    // matches no results — a valid "no results" response, not an error. The
    // adapter must return [] instead of throwing a Zod validation error.
    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', () =>
        HttpResponse.json({
          status: 'OK',
          response: {
            docs: null,
            metadata: { hits: 0, offset: 0, time: 148 },
          },
        }),
      ),
    );

    const provider = new NytProvider('test-key');
    const articles = await provider.search({ category: 'Business' });

    expect(articles).toEqual([]);
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

  it('forwards category in q parameter (NYT fq filter returns 0 hits)', async () => {
    let seenUrl: string | undefined;
    server.use(
      http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json(nytArticlesResponse);
      }),
    );

    const provider = new NytProvider('test-key');
    await provider.search({ category: 'Business' });

    expect(seenUrl).toContain('q=Business');
  });

  it('rejects with a typed error when the API key is missing — no network call', async () => {
    vi.stubEnv('VITE_NYT_KEY', '');
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
    vi.unstubAllEnvs();
  });
});