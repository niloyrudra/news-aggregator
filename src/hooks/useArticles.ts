import { useMemo } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import type { NewsProvider } from '@/contracts/NewsProvider';
import type { SearchParams } from '@/contracts/SearchParams';
import { AggregatorService, type AggregatorResult } from '@/services/aggregator';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * Article feed query — see agent-skills/03 § 2.
 *
 * - Query key: `['articles', filters]` so the same filter set is deduped
 *   across components and the cache survives navigation.
 * - Keyword is debounced ~300ms before it enters the key — see § 1, the
 *   single biggest protection against burning NewsAPI's 100 req/day quota.
 * - Stale request cancellation: TanStack Query v5 passes an `AbortSignal`
 *   into `queryFn` whenever a refetch races a stale key. We forward that
 *   signal to `AggregatorService.search`, which in turn forwards to every
 *   provider (see `BaseHttpProvider.getJson`). The provider's
 *   `HttpError(cause: 'aborted')` is surfaced cleanly instead of landing
 *   in the React Query error state.
 *
 * Default stale-time is 2 minutes — news doesn't need live refetch, and
 * promoting the user's window focus away shouldn't burn the daily quota.
 */

const KEYWORD_DEBOUNCE_MS = 300;
const STALE_TIME_MS = 2 * 60_000;

export function useArticles(
  providers: NewsProvider[],
  filters: SearchParams,
  aggregator: AggregatorService = defaultAggregator,
) {
  // Debounce only the keyword — date/category/sources/authors are filter
  // changes the user commits explicitly, not per-keystroke.
  const debouncedKeyword = useDebounce(filters.keyword, KEYWORD_DEBOUNCE_MS);

  const debouncedFilters = useMemo<SearchParams>(
    () => ({
      ...filters,
      keyword: debouncedKeyword,
    }),
    [
      filters,
      filters.dateFrom,
      filters.dateTo,
      filters.category,
      filters.sources,
      filters.authors,
      debouncedKeyword,
    ],
  );

  // Use the JSON-stringified form as the cache discriminator so array-valued
  // filters (`sources`, `authors`) get a stable key even when the input
  // reference changes but the contents don't.
  const filterKey = useMemo(() => JSON.stringify(debouncedFilters), [debouncedFilters]);

  const queryKey = useMemo<QueryKey>(() => ['articles', filterKey], [filterKey]);

  return useQuery<AggregatorResult>({
    queryKey,
    queryFn: ({ signal }) => aggregator.search(providers, debouncedFilters, signal),
    staleTime: STALE_TIME_MS,
    // Disable the query when no providers are configured (e.g. before the
    // app has wired up any).
    enabled: providers.length > 0,
  });
}

/** Default singleton — the aggregator has no state itself, sharing one is fine. */
const defaultAggregator = new AggregatorService();

