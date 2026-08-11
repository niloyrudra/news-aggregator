import { http, HttpResponse } from 'msw';
import { guardianSearchResponse } from '../fixtures/guardian';

const GUARDIAN_BASE = 'https://content.guardianapis.com';

export const guardianHandlers = [
  http.get(`${GUARDIAN_BASE}/search`, () => HttpResponse.json(guardianSearchResponse)),
];
