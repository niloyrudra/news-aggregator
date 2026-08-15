/**
 * URL-backed state for search filters.
 *
 * This is a thin wrapper over `window.location.search` + `history.pushState`
 * that keeps filters in the URL — shareable, bookmarkable, refresh-surviving —
 * without coupling the hook to the router.
 *
 * Array values are serialized as repeated keys (`?sources=a&sources=b`),
 * which is the standard URL convention and survives a round-trip through
 * `URLSearchParams` losslessly.
 */

export interface UrlSearchFilters {
  keyword: string | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  category: string | undefined;
  sources: string[] | undefined;
  authors: string[] | undefined;
}

export type UrlSearchFiltersPatch = {
  [K in keyof UrlSearchFilters]?: UrlSearchFilters[K] | null;
};

const PARAM_KEYS: (keyof UrlSearchFilters)[] = [
  'keyword',
  'dateFrom',
  'dateTo',
  'category',
  'sources',
  'authors',
];

/** Read the current filters from `window.location.search`. */
function getSearchFiltersFromUrl(): UrlSearchFilters {
  const params = new URLSearchParams(window.location.search);
  const result: UrlSearchFilters = {
    keyword: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    category: undefined,
    sources: undefined,
    authors: undefined,
  };
  for (const key of PARAM_KEYS) {
    if (key === 'sources' || key === 'authors') {
      const values = params.getAll(key);
      result[key] = values.length > 0 ? values : undefined;
    } else {
      const value = params.get(key);
      result[key] = value ? value : undefined;
    }
  }
  return result;
}

let cachedSearch: string | undefined;
let cachedFilters: UrlSearchFilters | undefined;

/**
 * Like `getSearchFiltersFromUrl`, but returns a **stable reference** when the
 * URL search string hasn't changed. `useSyncExternalStore` requires
 * `getSnapshot` to return a cached value — a fresh object every call makes
 * React think the store changed on every render and loop forever.
 */
export function getCachedSearchFiltersFromUrl(): UrlSearchFilters {
  const search = window.location.search;
  if (cachedSearch === search && cachedFilters) {
    return cachedFilters;
  }
  cachedSearch = search;
  cachedFilters = getSearchFiltersFromUrl();
  return cachedFilters;
}

/**
 * Merge `patch` into the current URL search params and `pushState` the result.
 * Passing `null` for a key removes it. Other keys are preserved unchanged.
 */
export function writeSearchFiltersToUrl(patch: UrlSearchFiltersPatch): void {
  const params = new URLSearchParams(window.location.search);
  for (const key of PARAM_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    params.delete(key);
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  // pushState so the user can hit Back to undo a filter change.
  window.history.pushState(null, '', nextUrl);
  // Notify same-tab subscribers (pushState does not fire popstate).
  window.dispatchEvent(new Event('app:urlchange'));
}
