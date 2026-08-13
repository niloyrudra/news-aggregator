// import { http, HttpResponse } from 'msw';
// import { newsApiArticlesResponse } from './fixtures/newsapi';
import { newsApiHandlers } from './handlers/newsapi';

// Real vendor base URLs — handlers intercept without any rewrite layer.
// const NEWSAPI_BASE = 'https://newsapi.org/v2';

// export const newsApiHandlers = [
//   http.get(`${NEWSAPI_BASE}/everything`, () =>
//     HttpResponse.json(newsApiArticlesResponse),
//   ),
//   http.get(`${NEWSAPI_BASE}/top-headlines`, () =>
//     HttpResponse.json(newsApiArticlesResponse),
//   ),
// ];

// Guardian + NYT handlers are wired up by their own test files when those
// providers land — keeps each provider test's mock surface minimal.
export const handlers = [...newsApiHandlers];
