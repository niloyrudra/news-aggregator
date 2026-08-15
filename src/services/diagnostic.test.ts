import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { newsApiArticlesResponse } from '@/mocks/fixtures/newsapi';
import { NewsApiProvider } from './providers/NewsApiProvider';
import { GuardianProvider } from './providers/GuardianProvider';
import { NytProvider } from './providers/NytProvider';
import { AggregatorService } from './aggregator';
import type { SearchParams } from '@/contracts/SearchParams';

const guardianResponse = {
  response: {
    status: 'ok', total: 1,
    results: [{ id: 'g/1', webTitle: 'G', webUrl: 'https://g', webPublicationDate: '2026-08-10T10:00:00Z', sectionName: 'Technology', fields: { trailText: 'S', thumbnail: null }, tags: [] }],
  },
};
const nytResponse = {
  status: 'OK',
  response: { docs: [{ _id: 'n/1', headline: { main: 'N' }, abstract: 'S', web_url: 'https://n', pub_date: '2026-08-10T10:00:00Z', news_desk: 'Technology', section_name: 'Technology', byline: null, multimedia: null }] },
};

function setupHandlers() {
  server.use(
    http.get('https://newsapi.org/v2/everything', ({ request }) => {
      console.log('[DIAG] NewsAPI /everything:', request.url);
      return HttpResponse.json(newsApiArticlesResponse);
    }),
    http.get('https://newsapi.org/v2/top-headlines', ({ request }) => {
      console.log('[DIAG] NewsAPI /top-headlines:', request.url);
      return HttpResponse.json(newsApiArticlesResponse);
    }),
    http.get('https://content.guardianapis.com/search', ({ request }) => {
      console.log('[DIAG] Guardian:', request.url);
      return HttpResponse.json(guardianResponse);
    }),
    http.get('https://api.nytimes.com/svc/search/v2/articlesearch.json', ({ request }) => {
      console.log('[DIAG] NYT:', request.url);
      return HttpResponse.json(nytResponse);
    }),
  );
}

async function runCase(params: SearchParams, label: string) {
  setupHandlers();
  const providers = [new NewsApiProvider('k'), new GuardianProvider('k'), new NytProvider('k')];
  const agg = new AggregatorService();
  const result = await agg.search(providers, params);
  console.log(`[DIAG] ${label} status:`, JSON.stringify(result.sourceStatus));
  console.log(`[DIAG] ${label} errors:`, JSON.stringify(result.sourceErrors));
  console.log(`[DIAG] ${label} count:`, result.articles.length);
}

// Introspect the (private) URL builder directly so the diagnostic reports the
// ACTUAL { url, error } the provider would produce — not an inference from the
// short-circuit conditions in the source.
function buildUrlFor(provider: NewsApiProvider, params: SearchParams): { url: string; error?: string } {
  const build = (provider as unknown as {
    buildUrl(p: { params: SearchParams }): { url: string; error?: string };
  }).buildUrl;
  return build.call(provider, { params });
}

describe('DIAGNOSTIC', () => {
  it('Case (c): keyword + date + category all set', async () => {
    const params: SearchParams = {
      keyword: 'climate',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-15',
      category: 'Technology',
    };
    await runCase(params, 'kw+date+cat');

    // Direct boundary check: do all three values reach buildUrl() and what URL
    // does it ACTUALLY return (vs. what we'd infer from the source)?
    const newsApi = new NewsApiProvider('k');
    const built = buildUrlFor(newsApi, params);
    console.log(`[DIAG] kw+date+cat buildUrl actual result:`, JSON.stringify(built));

    expect(true).toBe(true);
  });
});
