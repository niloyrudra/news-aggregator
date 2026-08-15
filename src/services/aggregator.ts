import type { Article } from '@/contracts/Article';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';

/**
 * Per-source status surfaced alongside merged results. The UI uses this to
 * render a small "Guardian unavailable" notice instead of blanking the whole
 * feed when one upstream fails.
 *
 * Indexed by `provider.id` so the UI can look up status without holding a
 * reference to the provider object.
 */
export type SourceStatus = 'ok' | 'error';

export interface AggregatorResult {
  articles: Article[];
  sourceStatus: Record<string, SourceStatus>;
  /**
   * Per-provider error messages for sources that failed. Keyed by `provider.id`.
   * Lets the UI show *why* a source is unavailable (e.g. "NYT: response schema
   * mismatch") instead of a silent "no data, no error" failure.
   */
  sourceErrors: Record<string, string>;
}

/**
 * Fan-out aggregator across N news providers.
 *
 * **Always `Promise.allSettled`, never `Promise.all`.** A rejected provider
 * must not reject the whole call — the user gets partial results plus
 * per-source status so the UI can degrade gracefully.
 *
 * Depends on the `NewsProvider` interface, not concrete classes. Wire it once
 * with `[new NewsApiProvider(), new GuardianProvider(), new NytProvider()]`
 * and it never needs to know which class is which.
 *
 * Forwards the `AbortSignal` to every provider so the caller (TanStack Query,
 * etc.) can cancel a stale request when the user types again or changes a
 * filter.
 */
export class AggregatorService {
  /**
   * Search every provider in parallel and merge the successful results.
   *
   * Order of `articles` follows the order of `providers` in the input —
   * makes the result stable across calls (until a provider's actual order
   * changes), which matters for keys/animations in the UI.
   */
  async search(providers: NewsProvider[], params: SearchParams, signal?: AbortSignal): Promise<AggregatorResult> {
    // Pre-seed every known source as 'error' so a provider that throws
    // synchronously (before allSettled sees it) still shows up in the status
    // map — callers shouldn't have to guess which ids were attempted.
    const sourceStatus: Record<string, SourceStatus> = {};
    const sourceErrors: Record<string, string> = {};
    for (const provider of providers) {
      sourceStatus[provider.id] = 'error';
    }

    if (providers.length === 0) {
      return { articles: [], sourceStatus, sourceErrors };
    }

    const results = await Promise.allSettled(
      providers.map((provider) => provider.search(params, signal)),
    );

    const articles: Article[] = [];
    results.forEach((settled, idx) => {
      const provider = providers[idx];
      if (settled.status === 'fulfilled') {
        sourceStatus[provider.id] = 'ok';
        articles.push(...settled.value);
      } else {
        // 'rejected' leaves the 'error' status we pre-seeded, but now we also
        // capture the reason so the UI can surface it instead of failing silently.
        sourceErrors[provider.id] =
          settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      }
    });

    return { articles, sourceStatus, sourceErrors };
  }
}