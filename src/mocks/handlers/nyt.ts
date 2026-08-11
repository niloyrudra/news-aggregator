import { http, HttpResponse } from 'msw';
import { nytArticleSearchResponse } from '../fixtures/nyt';

const NYT_BASE = 'https://api.nytimes.com/svc/search/v2';

export const nytHandlers = [
  http.get(`${NYT_BASE}/articlesearch.json`, () => HttpResponse.json(nytArticleSearchResponse)),
];
