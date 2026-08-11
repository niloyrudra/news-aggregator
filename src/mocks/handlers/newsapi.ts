import { http, HttpResponse } from 'msw';
import { newsApiArticlesResponse } from '../fixtures/newsapi';

const NEWSAPI_BASE = 'https://newsapi.org/v2';

export const newsApiHandlers = [
  http.get(`${NEWSAPI_BASE}/everything`, () =>
    HttpResponse.json(newsApiArticlesResponse),
  ),
  http.get(`${NEWSAPI_BASE}/top-headlines`, () =>
    HttpResponse.json(newsApiArticlesResponse),
  ),
];
