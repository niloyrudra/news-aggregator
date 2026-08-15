/**
 * Tests for useSearchFilters — verifies the URL is the source of truth,
 * and the typed getters/setters round-trip through `window.location.search`.
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useSearchFilters } from './useSearchFilters';

const URL_BASE = 'http://localhost:3000/';

/** Reset `window.location.search` between tests so each starts blank. */
function resetUrl() {
  window.history.replaceState(null, '', URL_BASE);
}

beforeEach(() => {
  resetUrl();
});

describe('useSearchFilters — initial URL state', () => {
  it('returns undefined for every field when the URL has no params', () => {
    const { result } = renderHook(() => useSearchFilters());
    expect(result.current.keyword).toBeUndefined();
    expect(result.current.dateFrom).toBeUndefined();
    expect(result.current.dateTo).toBeUndefined();
    expect(result.current.category).toBeUndefined();
    expect(result.current.sources).toBeUndefined();
    expect(result.current.authors).toBeUndefined();
  });

  it('reads pre-existing URL params on first render', () => {
    window.history.replaceState(
      null,
      '',
      `${URL_BASE}?keyword=climate&category=Environment&sources=newsapi&sources=guardian`,
    );

    const { result } = renderHook(() => useSearchFilters());
    expect(result.current.keyword).toBe('climate');
    expect(result.current.category).toBe('Environment');
    expect(result.current.sources).toEqual(['newsapi', 'guardian']);
  });
});

describe('useSearchFilters — mutations', () => {
  it('setKeyword writes to the URL and re-renders the hook', () => {
    const { result } = renderHook(() => useSearchFilters());

    act(() => {
      result.current.setKeyword('climate');
    });

    expect(result.current.keyword).toBe('climate');
    expect(window.location.search).toContain('keyword=climate');
  });

  it('setKeyword(null) clears the keyword from the URL', () => {
    window.history.replaceState(null, '', `${URL_BASE}?keyword=climate`);

    const { result } = renderHook(() => useSearchFilters());
    expect(result.current.keyword).toBe('climate');

    act(() => {
      result.current.setKeyword(null);
    });

    expect(result.current.keyword).toBeUndefined();
    expect(window.location.search).not.toContain('keyword=');
  });

  it('setSources stores an array as repeated keys (URL-safe)', () => {
    const { result } = renderHook(() => useSearchFilters());

    act(() => {
      result.current.setSources(['newsapi', 'guardian']);
    });

    expect(result.current.sources).toEqual(['newsapi', 'guardian']);
    // Repeated keys are the standard URL convention for arrays.
    const params = new URLSearchParams(window.location.search);
    expect(params.getAll('sources')).toEqual(['newsapi', 'guardian']);
  });

  it('setting one field preserves the others (no clobber)', () => {
    const { result } = renderHook(() => useSearchFilters());

    act(() => {
      result.current.setKeyword('climate');
      result.current.setCategory('Environment');
      result.current.setDateFrom('2026-08-01');
    });

    expect(result.current.keyword).toBe('climate');
    expect(result.current.category).toBe('Environment');
    expect(result.current.dateFrom).toBe('2026-08-01');
    expect(window.location.search).toContain('keyword=climate');
    expect(window.location.search).toContain('category=Environment');
    expect(window.location.search).toContain('dateFrom=2026-08-01');
  });

  it('resetAll clears every field', () => {
    window.history.replaceState(
      null,
      '',
      `${URL_BASE}?keyword=climate&category=Environment&dateFrom=2026-08-01`,
    );

    const { result } = renderHook(() => useSearchFilters());

    act(() => {
      result.current.resetAll();
    });

    expect(result.current.keyword).toBeUndefined();
    expect(result.current.category).toBeUndefined();
    expect(result.current.dateFrom).toBeUndefined();
    expect(window.location.search).toBe('');
  });
});

describe('useSearchFilters — asSearchParams bridge', () => {
  it('returns the canonical SearchParams shape for providers', () => {
    window.history.replaceState(
      null,
      '',
      `${URL_BASE}?keyword=climate&category=Environment&sources=newsapi&sources=guardian`,
    );

    const { result } = renderHook(() => useSearchFilters());
    const params = result.current.asSearchParams();

    expect(params).toEqual({
      keyword: 'climate',
      dateFrom: undefined,
      dateTo: undefined,
      category: 'Environment',
      sources: ['newsapi', 'guardian'],
      authors: undefined,
    });
  });
});
