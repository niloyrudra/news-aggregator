import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { SearchParams } from '@/contracts/SearchParams';
import {
  getCachedSearchFiltersFromUrl,
  writeSearchFiltersToUrl,
  type UrlSearchFiltersPatch,
} from '@/lib/urlSearchFilters';

/**
 * URL-backed search/filter state — see agent-skills/03-state-management.md § 1.
 *
 * The URL is the source of truth (so results are shareable, bookmarkable, and
 * survive a refresh). Components never call `useSearchParams` directly; they
 * consume this typed wrapper and pass typed values around.
 *
 * Returns the typed getters/setters for every supported filter plus a
 * `resetAll()` helper. The `set*` functions accept a value or `null` —
 * passing `null` clears that param from the URL.
 */
export function useSearchFilters() {
  // useSyncExternalStore keeps us in sync with URL changes from any source
  // (back/forward, programmatic push, manual edit) without an effect.
  const snapshot = useSyncExternalStore(
    subscribeToUrlChanges,
    getCachedSearchFiltersFromUrl,
    getCachedSearchFiltersFromUrl,
  );

  const setParam = useCallback(
    (name: keyof UrlSearchFiltersPatch, value: string | string[] | null) => {
      writeSearchFiltersToUrl({ [name]: value } as UrlSearchFiltersPatch);
    },
    [],
  );

  const resetAll = useCallback(() => {
    writeSearchFiltersToUrl({
      keyword: null,
      dateFrom: null,
      dateTo: null,
      category: null,
      sources: null,
      authors: null,
    });
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      setKeyword: (value: string | null) => setParam('keyword', value),
      setDateFrom: (value: string | null) => setParam('dateFrom', value),
      setDateTo: (value: string | null) => setParam('dateTo', value),
      setCategory: (value: string | null) => setParam('category', value),
      setSources: (value: string[] | null) => setParam('sources', value),
      setAuthors: (value: string[] | null) => setParam('authors', value),
      resetAll,
      /** The aggregated `SearchParams` shape consumed by the providers. */
      asSearchParams: (): SearchParams => ({
        keyword: snapshot.keyword,
        dateFrom: snapshot.dateFrom,
        dateTo: snapshot.dateTo,
        category: snapshot.category,
        sources: snapshot.sources,
        authors: snapshot.authors,
      }),
    }),
    [snapshot, setParam, resetAll],
  );
}

/** Subscribes to URL changes. Listens to both `popstate` (back/forward) and
 * our own `pushState` writes (which fire a custom event so other components
 * using this hook re-render in the same tick). */
function subscribeToUrlChanges(callback: () => void): () => void {
  window.addEventListener('popstate', callback);
  window.addEventListener('app:urlchange', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('app:urlchange', callback);
  };
}
