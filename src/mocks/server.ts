import { setupServer } from 'msw/node';
import { newsApiHandlers } from './handlers/newsapi';
import { guardianHandlers } from './handlers/guardian';
import { nytHandlers } from './handlers/nyt';

export const server = setupServer(...newsApiHandlers, ...guardianHandlers, ...nytHandlers);
