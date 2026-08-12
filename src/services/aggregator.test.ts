/**
 * Tests for AggregatorService — verifies the allSettled contract
 * (agent-skills/02 rule 5, agent-skills/04 rule 1) and the
 * { articles, sourceStatus } return shape (agent-skills/04 rule 2).
 *
 * These tests use lightweight stub providers rather than the real adapters.
 * The aggregators's job is fan-out/merge — wiring a real NewsApi/Guardian/NYT
 * here would re-test things the per-provider suites already cover.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { AggregatorService } from './aggregator';

const article = (id: string, source: string): Article => ({
  id,
  title: `${source} headline`,
  summary: `${source} summary`,
  url: `https://${source}.example/${id}`,
  imageUrl: null,
  author: null,
  source,
  category: null,
  publishedAt: '2026-08-12T00:00:00Z',
});

/**
 * The aggregator doesn't care about SearchParams values — most stubs just
 * return canned articles. This is the implementation shape for `NewsProvider.search`
 * so the stubs type-check against the contract without re-stating it per test.
 */
type SearchImpl = (params: SearchParams, signal?: AbortSignal) => Promise<Article[]>;

/**
 * Build a stub provider from a function so each test can shape its own
 * behavior (resolve vs reject, count of calls, etc.).
 */
function makeProvider(id: string, displayName: string, searchImpl: SearchImpl): NewsProvider {
  return {
    id,
    displayName,
    search: vi.fn(searchImpl),
  };
}

describe('AggregatorService — happy path', () => {
  it('merges articles from all providers and reports every source as ok', async () => {
    const newsapi = makeProvider('newsapi', 'NewsAPI', async () => [
      article('newsapi:1', 'NewsAPI'),
    ]);
    const guardian = makeProvider('guardian', 'The Guardian', async () => [
      article('guardian:1', 'The Guardian'),
      article('guardian:2', 'The Guardian'),
    ]);
    const nyt = makeProvider('nyt', 'The New York Times', async () => [
      article('nyt:1', 'The New York Times'),
    ]);

    const agg = new AggregatorService();
    const result = await agg.search([newsapi, guardian, nyt], { keyword: 'climate' });

    expect(result.articles).toHaveLength(4);
    expect(result.articles.map((a) => a.id)).toEqual([
      'newsapi:1',
      'guardian:1',
      'guardian:2',
      'nyt:1',
    ]);
    expect(result.sourceStatus).toEqual({
      newsapi: 'ok',
      guardian: 'ok',
      nyt: 'ok',
    });
  });

  it('preserves the order of providers in the output (stable for UI keys)', async () => {
    const a = makeProvider('a', 'A', async () => [article('a:1', 'A')]);
    const b = makeProvider('b', 'B', async () => [article('b:1', 'B')]);
    const c = makeProvider('c', 'C', async () => [article('c:1', 'C')]);

    const agg = new AggregatorService();
    const result = await agg.search([c, a, b], {});

    // Order matches input order, not completion order, not insertion order.
    expect(result.articles.map((x) => x.source)).toEqual(['C', 'A', 'B']);
  });

  it('forwards the AbortSignal to every provider', async () => {
    const seenSignals: (AbortSignal | undefined)[] = [];
    const providers = [0, 1, 2].map((i) =>
      makeProvider(`p${i}`, `P${i}`, (_params, signal) => {
        seenSignals.push(signal);
        return Promise.resolve([]);
      }),
    );

    const controller = new AbortController();
    const agg = new AggregatorService();
    await agg.search(providers, {}, controller.signal);

    expect(seenSignals).toHaveLength(3);
    seenSignals.forEach((s) => expect(s).toBe(controller.signal));
  });
});

describe('AggregatorService — partial failure (the allSettled contract)', () => {
  it('returns the two successful providers\' articles and flags the failed one as error', async () => {
    const newsapi = makeProvider('newsapi', 'NewsAPI', async () => [
      article('newsapi:1', 'NewsAPI'),
    ]);
    const guardian = makeProvider('guardian', 'The Guardian', async () => {
      // Simulate the documented Guardian CORS / NYT 5xx failure modes the
      // brief calls out as real, expected outcomes.
      throw new Error('CORS preflight failed');
    });
    const nyt = makeProvider('nyt', 'The New York Times', async () => [
      article('nyt:1', 'The New York Times'),
      article('nyt:2', 'The New York Times'),
    ]);

    const agg = new AggregatorService();
    const result = await agg.search([newsapi, guardian, nyt], { keyword: 'climate' });

    expect(result.articles.map((a) => a.id)).toEqual([
      'newsapi:1',
      'nyt:1',
      'nyt:2',
    ]);
    expect(result.sourceStatus).toEqual({
      newsapi: 'ok',
      guardian: 'error',
      nyt: 'ok',
    });
  });

  it('does not throw when the failing provider is in the middle of the array', async () => {
    const providers = [
      makeProvider('ok-1', 'OK1', async () => [article('ok-1:1', 'OK1')]),
      makeProvider('fails', 'Fails', async () => {
        throw new TypeError('Network down');
      }),
      makeProvider('ok-2', 'OK2', async () => [article('ok-2:1', 'OK2')]),
    ];

    const agg = new AggregatorService();
    // If the aggregator used Promise.all this would reject.
    const result = await agg.search(providers, {});

    expect(result.articles.map((a) => a.id)).toEqual(['ok-1:1', 'ok-2:1']);
    expect(result.sourceStatus).toEqual({
      'ok-1': 'ok',
      fails: 'error',
      'ok-2': 'ok',
    });
  });
});

describe('AggregatorService — degenerate inputs', () => {
  it('returns an empty result when given no providers — does not throw', async () => {
    const agg = new AggregatorService();
    const result = await agg.search([], { keyword: 'x' });
    expect(result).toEqual({ articles: [], sourceStatus: {} });
  });

  it('reports every source as error when all providers reject', async () => {
    const a = makeProvider('a', 'A', async () => {
      throw new Error('boom');
    });
    const b = makeProvider('b', 'B', async () => {
      throw new Error('boom');
    });

    const agg = new AggregatorService();
    const result = await agg.search([a, b], {});

    expect(result.articles).toEqual([]);
    expect(result.sourceStatus).toEqual({ a: 'error', b: 'error' });
  });
});
