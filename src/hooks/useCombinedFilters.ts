import { useMemo } from 'react';
import { usePreferencesStore } from '@/features/preferences/store';
import type { SearchParams } from '@/contracts/SearchParams';
import { useSearchFilters } from './useSearchFilters';

/**
 * Unified filter state combining URL params (explicit, shareable) with
 * preferences (persistent defaults). URL params take precedence when present.
 * Components consume this for display/logic; providers receive the merged params.
 * Preferences are only updated from the Preferences page, not from filters.
 *
 * Three independent services:
 * 1. Search (SearchBar) - manages keyword via URL
 * 2. Filters (FilterSidebar) - manages dateFrom, dateTo, category, sources, authors via URL
 * 3. Preferences (PreferencesPage) - manages preferredSources, preferredCategories, preferredAuthors via localStorage
 *
 * When fetching articles, we combine: keyword (URL) + explicit filters (URL) + preferences as defaults
 */
export function useCombinedFilters() {
  const {
    keyword,
    dateFrom,
    dateTo,
    category,
    sources,
    authors,
    setKeyword,
    setDateFrom,
    setDateTo,
    setCategory,
    setSources,
    setAuthors,
    resetFilters,
  } = useSearchFilters();

  const {
    preferredSources,
    preferredCategories,
    preferredAuthors,
  } = usePreferencesStore();

  // Effective filters: explicit URL param wins, otherwise preference default
  const effectiveCategory = category || preferredCategories[0];
  const effectiveSources = (sources && sources.length > 0) ? sources : preferredSources;
  const effectiveAuthors = (authors && authors.length > 0) ? authors : preferredAuthors;

  // Active filters are ONLY the sidebar filters (not keyword, not preferences)
  const hasActiveFilters = Boolean(
    dateFrom ||
    dateTo ||
    category ||
    (sources && sources.length > 0) ||
    (authors && authors.length > 0)
  );

  const activeFilterCount = [
    dateFrom ? 1 : 0,
    dateTo ? 1 : 0,
    category ? 1 : 0,
    sources?.length || 0,
    authors?.length || 0,
  ].reduce((a, b) => a + b, 0);

  return useMemo(
    () => ({
      // Raw URL params (for shareable links)
      keyword,
      dateFrom,
      dateTo,
      category,
      sources,
      authors,

      // Effective filters (URL param wins, then preference)
      effectiveCategory,
      effectiveSources,
      effectiveAuthors,

      // Derived state
      hasActiveFilters,
      activeFilterCount,

      // Setters (update URL params)
      setKeyword,
      setDateFrom,
      setDateTo,
      setCategory,
      setSources,
      setAuthors,

      // Reset only filters (sidebar) - keeps keyword and preferences intact
      resetFilters,

      // Aggregated SearchParams for providers (raw URL params)
      asSearchParams: (): SearchParams => ({
        keyword,
        dateFrom,
        dateTo,
        category,
        sources,
        authors,
      }),

      // Aggregated effective SearchParams for providers (with preferences as defaults)
      asEffectiveSearchParams: (): SearchParams => ({
        keyword,
        dateFrom,
        dateTo,
        category: effectiveCategory,
        sources: effectiveSources,
        authors: effectiveAuthors,
      }),
    }),
    [
      keyword,
      dateFrom,
      dateTo,
      category,
      sources,
      authors,
      effectiveCategory,
      effectiveSources,
      effectiveAuthors,
      hasActiveFilters,
      activeFilterCount,
      setKeyword,
      setDateFrom,
      setDateTo,
      setCategory,
      setSources,
      setAuthors,
      resetFilters,
    ],
  );
}