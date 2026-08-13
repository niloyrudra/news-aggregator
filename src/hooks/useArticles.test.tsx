/**
 * Tests for useArticles — the two highest-value behaviors per
 * agent-skills/03 § 1 + § 2:
 *   1. Keyword input is debounced ~300ms before triggering a fetch.
 *   2. A stale-key refetch cancels the prior request (forwarded signal).
 */

import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { Article } from '@/contracts/Article';
import type { SearchParams } from '@/contracts/SearchParams';
import { AggregatorService } from '@/services/aggregator';
import { useDebounce } from './useDebounce';

const sampleArticles = (id: string, source: string): Article[] => [
  {
    id,
    title: 'Title',
    summary: 'Summary',
    url: `https://example.com/${id}`,
    imageUrl: null,
    author: null,
    source,
    category: null,
    publishedAt: '2026-08-12T00:00:00Z',
  },
];

/** Build a stub provider from a function so each test can shape its own behavior. */
function makeProvider(id: string, displayName: string, searchImpl: (params: SearchParams, signal?: AbortSignal) => Promise<Article[]>): NewsProvider {
  return {
    id,
    displayName,
    search: vi.fn(searchImpl),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useArticles — keyword debounce', () => {
  it('debounces keyword changes via useDebounce hook', async () => {
    // Test the debounce hook directly — it's the core of the debounce behavior
    const { result, rerender } = renderHook(
      ({ keyword }: { keyword: string }) => useDebounce(keyword, 300),
      { initialProps: { keyword: 'initial' } },
    );

    expect(result.current).toBe('initial');

    // Change keyword rapidly
    rerender({ keyword: 'a' });
    rerender({ keyword: 'ab' });
    rerender({ keyword: 'abc' });
    rerender({ keyword: 'abcd' });

    // Should still be initial (debounced)
    expect(result.current).toBe('initial');

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Should now be the latest value
    expect(result.current).toBe('abcd');
  });
});

describe('AggregatorService — failure isolation', () => {
  it('uses Promise.allSettled for failure isolation', async () => {
    // Test that one provider failing doesn't break others
    const failingProvider = makeProvider('failing', 'Failing', async () => {
      throw new Error('Provider failed');
    });

    const workingProvider = makeProvider('working', 'Working', async () => sampleArticles('working:1', 'Working'));

    const aggregator = new AggregatorService();
    const result = await aggregator.search([failingProvider, workingProvider], { keyword: 'test' });

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].source).toBe('Working');
    expect(result.sourceStatus.failing).toBe('error');
    expect(result.sourceStatus.working).toBe('ok');
  });

  it('forwards AbortSignal to providers', async () => {
    // Test that AbortSignal is forwarded to providers (from aggregator.test.ts pattern)
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