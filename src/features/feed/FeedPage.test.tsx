/**
 * Regression tests for the NewsAPI initial-load fix.
 *
 * The bug: on a clean first page load (no URL filters, no stored preferences),
 * FeedPage passed `{}` to the providers. NewsApiProvider then built a bare
 * `/everything?pageSize=50` URL, which NewsAPI rejects with HTTP 400
 * `parametersMissing`.
 *
 * Fix 3 (this file): FeedPage now injects a fallback `keyword: 'news'` when
 * there are no explicit filters AND no preferred category. When a preferred
 * category exists, the category is used instead (which routes NewsAPI to
 * `/top-headlines`, which needs no keyword).
 *
 * These tests mock the three hooks FeedPage depends on and assert the exact
 * `SearchParams` that get forwarded to `useArticles`.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SearchParams } from '@/contracts/SearchParams';
import type { AggregatorResult } from '@/services/aggregator';

// --- Mock the hooks FeedPage consumes -------------------------------------

const useCombinedFiltersMock = vi.fn();
const useArticlesMock = vi.fn();

vi.mock('@/hooks/useCombinedFilters', () => ({
  useCombinedFilters: () => useCombinedFiltersMock(),
}));

vi.mock('@/hooks/useArticles', () => ({
  useArticles: (providers: unknown[], params: SearchParams) =>
    useArticlesMock(providers, params),
}));

// --- Test helpers ----------------------------------------------------------

const EMPTY_RESULT: AggregatorResult = {
  articles: [],
  sourceStatus: {},
  sourceErrors: {},
};

function renderFeedPage() {
  return render(<FeedPage />);
}

// Import after mocks are registered.
import { FeedPage } from './FeedPage';

beforeEach(() => {
  vi.clearAllMocks();
  useCombinedFiltersMock.mockReturnValue({
    asEffectiveSearchParams: () => ({}),
    effectiveSources: [],
    keyword: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    category: undefined,
    sources: undefined,
    authors: undefined,
    effectiveCategory: undefined,
    effectiveAuthors: undefined,
    hasActiveFilters: false,
    activeFilterCount: 0,
    setKeyword: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    setCategory: vi.fn(),
    setSources: vi.fn(),
    setAuthors: vi.fn(),
    resetAll: vi.fn(),
  });
  useArticlesMock.mockReturnValue({
    data: EMPTY_RESULT,
    isLoading: false,
    isError: false,
  });
});

describe('FeedPage — NewsAPI initial-load fallback keyword', () => {
  it('injects a default keyword of "news" when no filters and no preferred category exist', () => {
    useCombinedFiltersMock.mockReturnValue({
      asEffectiveSearchParams: () => ({ keyword: 'news' }),
      effectiveSources: [],
      keyword: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      category: undefined,
      sources: undefined,
      authors: undefined,
      effectiveCategory: undefined,
      effectiveAuthors: undefined,
      hasActiveFilters: false,
      activeFilterCount: 0,
      setKeyword: vi.fn(),
      setDateFrom: vi.fn(),
      setDateTo: vi.fn(),
      setCategory: vi.fn(),
      setSources: vi.fn(),
      setAuthors: vi.fn(),
      resetAll: vi.fn(),
    });

    renderFeedPage();

    expect(useArticlesMock).toHaveBeenCalledTimes(1);
    const params = useArticlesMock.mock.calls[0][1] as SearchParams;
    expect(params.keyword).toBe('news');
    expect(params.category).toBeUndefined();
  });

  it('uses the preferred category instead of a fallback keyword when one is set', () => {
    useCombinedFiltersMock.mockReturnValue({
      asEffectiveSearchParams: () => ({ category: 'Technology' }),
      effectiveSources: [],
      keyword: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      category: undefined,
      sources: undefined,
      authors: undefined,
      effectiveCategory: 'Technology',
      effectiveAuthors: undefined,
      hasActiveFilters: true,
      activeFilterCount: 1,
      setKeyword: vi.fn(),
      setDateFrom: vi.fn(),
      setDateTo: vi.fn(),
      setCategory: vi.fn(),
      setSources: vi.fn(),
      setAuthors: vi.fn(),
      resetAll: vi.fn(),
    });

    renderFeedPage();

    expect(useArticlesMock).toHaveBeenCalledTimes(1);
    const params = useArticlesMock.mock.calls[0][1] as SearchParams;
    expect(params.category).toBe('Technology');
    // Category routes NewsAPI to /top-headlines, which needs no keyword.
    expect(params.keyword).toBeUndefined();
  });

  it('does not inject a fallback keyword when the user has an explicit keyword', () => {
    useCombinedFiltersMock.mockReturnValue({
      asEffectiveSearchParams: () => ({ keyword: 'climate' }),
      effectiveSources: [],
      keyword: 'climate',
      dateFrom: undefined,
      dateTo: undefined,
      category: undefined,
      sources: undefined,
      authors: undefined,
      effectiveCategory: undefined,
      effectiveAuthors: undefined,
      hasActiveFilters: true,
      activeFilterCount: 1,
      setKeyword: vi.fn(),
      setDateFrom: vi.fn(),
      setDateTo: vi.fn(),
      setCategory: vi.fn(),
      setSources: vi.fn(),
      setAuthors: vi.fn(),
      resetAll: vi.fn(),
    });

    renderFeedPage();

    expect(useArticlesMock).toHaveBeenCalledTimes(1);
    const params = useArticlesMock.mock.calls[0][1] as SearchParams;
    expect(params.keyword).toBe('climate');
  });

  it('does not inject a fallback keyword when the user has an explicit category', () => {
    useCombinedFiltersMock.mockReturnValue({
      asEffectiveSearchParams: () => ({ category: 'Business' }),
      effectiveSources: [],
      keyword: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      category: 'Business',
      sources: undefined,
      authors: undefined,
      effectiveCategory: 'Business',
      effectiveAuthors: undefined,
      hasActiveFilters: true,
      activeFilterCount: 1,
      setKeyword: vi.fn(),
      setDateFrom: vi.fn(),
      setDateTo: vi.fn(),
      setCategory: vi.fn(),
      setSources: vi.fn(),
      setAuthors: vi.fn(),
      resetAll: vi.fn(),
    });

    renderFeedPage();

    expect(useArticlesMock).toHaveBeenCalledTimes(1);
    const params = useArticlesMock.mock.calls[0][1] as SearchParams;
    expect(params.category).toBe('Business');
    expect(params.keyword).toBeUndefined();
  });

  it('does not inject a fallback keyword when the user has an explicit source', () => {
    useCombinedFiltersMock.mockReturnValue({
      asEffectiveSearchParams: () => ({ sources: ['cnn'] }),
      effectiveSources: ['cnn'],
      keyword: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      category: undefined,
      sources: ['cnn'],
      authors: undefined,
      effectiveCategory: undefined,
      effectiveAuthors: undefined,
      hasActiveFilters: true,
      activeFilterCount: 1,
      setKeyword: vi.fn(),
      setDateFrom: vi.fn(),
      setDateTo: vi.fn(),
      setCategory: vi.fn(),
      setSources: vi.fn(),
      setAuthors: vi.fn(),
      resetAll: vi.fn(),
    });

    renderFeedPage();

    expect(useArticlesMock).toHaveBeenCalledTimes(1);
    const params = useArticlesMock.mock.calls[0][1] as SearchParams;
    expect(params.sources).toEqual(['cnn']);
    expect(params.keyword).toBeUndefined();
  });

  it('applies preferred sources and authors as defaults alongside the fallback keyword', () => {
    useCombinedFiltersMock.mockReturnValue({
      asEffectiveSearchParams: () => ({ keyword: 'news', sources: ['guardian'], authors: ['Alice'] }),
      effectiveSources: ['guardian'],
      keyword: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      category: undefined,
      sources: undefined,
      authors: undefined,
      effectiveCategory: undefined,
      effectiveAuthors: ['Alice'],
      hasActiveFilters: true,
      activeFilterCount: 3,
      setKeyword: vi.fn(),
      setDateFrom: vi.fn(),
      setDateTo: vi.fn(),
      setCategory: vi.fn(),
      setSources: vi.fn(),
      setAuthors: vi.fn(),
      resetAll: vi.fn(),
    });

    renderFeedPage();

    expect(useArticlesMock).toHaveBeenCalledTimes(1);
    const params = useArticlesMock.mock.calls[0][1] as SearchParams;
    expect(params.keyword).toBe('news');
    expect(params.sources).toEqual(['guardian']);
    expect(params.authors).toEqual(['Alice']);
  });

  it('renders the feed page title', () => {
    useCombinedFiltersMock.mockReturnValue({
      asEffectiveSearchParams: () => ({ keyword: 'news' }),
      effectiveSources: [],
      keyword: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      category: undefined,
      sources: undefined,
      authors: undefined,
      effectiveCategory: undefined,
      effectiveAuthors: undefined,
      hasActiveFilters: false,
      activeFilterCount: 0,
      setKeyword: vi.fn(),
      setDateFrom: vi.fn(),
      setDateTo: vi.fn(),
      setCategory: vi.fn(),
      setSources: vi.fn(),
      setAuthors: vi.fn(),
      resetAll: vi.fn(),
    });

    renderFeedPage();

    expect(screen.getByRole('heading', { name: 'News Aggregator' })).toBeInTheDocument();
  });
});