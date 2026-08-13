/**
 * Regression tests for the shared HTTP base provider.
 *
 * These pin down two fixes that are easy to break silently:
 *   1. Timeout vs caller-abort labeling — when the timeout fires and the
 *      caller aborts in the same tick, the error must be `cause: 'timeout'`,
 *      not `'aborted'`. The old code inferred the cause from
 *      `externalSignal?.aborted`, which mislabels this race.
 *   2. Backoff listener cleanup — when backoff resolves normally, its abort
 *      listener must be removed. The old code leaked it, so a later abort
 *      fired a stale handler against an already-settled promise.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaseHttpProvider } from './BaseHttpProvider';

/** Exposes the protected `getJson` for direct testing. */
class TestProvider extends BaseHttpProvider {
  fetchJson<T>(url: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
    return this.getJson<T>(url, init, signal);
  }
}

describe('BaseHttpProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timeout vs caller abort', () => {
    it('labels a timeout as cause "timeout" even when the caller aborts in the same tick', async () => {
      vi.useFakeTimers();
      const external = new AbortController();
      const provider = new TestProvider({ timeoutMs: 100, maxAttempts: 1 });

      // fetch that never settles on its own, but rejects with AbortError when
      // the signal fires.
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('The operation was aborted.', 'AbortError')),
              { once: true },
            );
          }),
      );

      const promise = provider.fetchJson('https://example.com', undefined, external.signal);

      // Fire the timeout, then abort the caller's signal in the same tick —
      // before the rejection microtask is processed.
      vi.advanceTimersByTime(100);
      external.abort();

      await expect(promise).rejects.toMatchObject({ cause: 'timeout' });
    });
  });

  describe('backoff listener cleanup', () => {
    it('removes the abort listener when backoff resolves normally', async () => {
      const external = new AbortController();
      const signal = external.signal;
      const provider = new TestProvider({ initialBackoffMs: 1, maxAttempts: 2 });

      // Install spies BEFORE the call so they capture the add/remove that
      // happens during attempt() and backoff().
      const addSpy = vi.spyOn(signal, 'addEventListener');
      const removeSpy = vi.spyOn(signal, 'removeEventListener');

      // First attempt fails with a retryable 500 → getJson enters backoff(1, signal).
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      await provider.fetchJson('https://example.com', undefined, signal);

      // Every abort listener added during the call must have been removed by
      // the time it resolved — including the one backoff() registered.
      const abortAdds = addSpy.mock.calls.filter(([type]) => type === 'abort').length;
      const abortRemoves = removeSpy.mock.calls.filter(([type]) => type === 'abort').length;
      expect(abortAdds).toBeGreaterThan(0);
      expect(abortRemoves).toBe(abortAdds);

      // Aborting now must not fire any stale handler.
      external.abort();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});