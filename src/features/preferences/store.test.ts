/**
 * Tests for the preferences store — the highest-value reliability surface
 * (per agent-skills/03 § 3): "if stored data doesn't match, fall back to
 * defaults."
 *
 * The store reads from localStorage via Zustand `persist`. We stub it with
 * an in-memory mock so the tests run in jsdom without polluting real storage.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { createPreferencesStore } from './store';

/** In-memory localStorage stand-in — mirrors the parts of Web Storage we use. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
}

let testStore: ReturnType<typeof createPreferencesStore>;

beforeEach(() => {
  // Each test gets a fresh storage so cross-test leakage is impossible.
  const storage = memoryStorage();
  testStore = createPreferencesStore(storage);
});

afterEach(() => {
  testStore.persist.clearStorage();
});

describe('usePreferencesStore — defaults', () => {
  it('starts with all-empty preferences when nothing is persisted', () => {
    const { result } = renderHook(() => testStore());
    expect(result.current.preferredSources).toEqual([]);
    expect(result.current.preferredCategories).toEqual([]);
    expect(result.current.preferredAuthors).toEqual([]);
  });
});

describe('usePreferencesStore — mutations', () => {
  it('updates all three fields through setPreferences in one call', () => {
    const { result } = renderHook(() => testStore());

    act(() => {
      result.current.setPreferences({
        preferredSources: ['newsapi', 'guardian'],
        preferredCategories: ['Politics'],
        preferredAuthors: ['Alice'],
      });
    });

    expect(result.current.preferredSources).toEqual(['newsapi', 'guardian']);
    expect(result.current.preferredCategories).toEqual(['Politics']);
    expect(result.current.preferredAuthors).toEqual(['Alice']);
  });

  it('setPreferences preserves fields you do not pass', () => {
    const { result } = renderHook(() => testStore());
    act(() => {
      result.current.setPreferredSources(['newsapi']);
    });

    act(() => {
      result.current.setPreferences({ preferredCategories: ['Tech'] });
    });

    expect(result.current.preferredSources).toEqual(['newsapi']);
    expect(result.current.preferredCategories).toEqual(['Tech']);
    expect(result.current.preferredAuthors).toEqual([]);
  });

  it('resetPreferences returns every field to empty defaults', () => {
    const { result } = renderHook(() => testStore());
    act(() => {
      result.current.setPreferences({
        preferredSources: ['newsapi'],
        preferredCategories: ['Politics'],
        preferredAuthors: ['Alice'],
      });
    });

    act(() => {
      result.current.resetPreferences();
    });

    expect(result.current.preferredSources).toEqual([]);
    expect(result.current.preferredCategories).toEqual([]);
    expect(result.current.preferredAuthors).toEqual([]);
  });
});

describe('usePreferencesStore — Zod validation on load', () => {
  /**
   * The persist middleware round-trips localStorage through `merge`. We
   * simulate an old/stale/corrupted payload by writing one directly and
   * then calling `persist.rehydrate()` — the equivalent of "user reloads
   * the page after we shipped a breaking schema change."
   */

  it('falls back to defaults when stored data is the wrong shape', () => {
    // Plant garbage: a string where an array should be.
    const corruptedStore = createPreferencesStore({
      getItem: () => JSON.stringify({
        state: { preferredSources: 'not-an-array' },
        version: 1,
      }),
      setItem: () => {},
      removeItem: () => {},
    });

    const { result } = renderHook(() => corruptedStore());
    expect(result.current.preferredSources).toEqual([]);
    expect(result.current.preferredCategories).toEqual([]);
    expect(result.current.preferredAuthors).toEqual([]);
  });

  it('falls back to defaults when JSON is malformed', () => {
    const corruptedStore = createPreferencesStore({
      getItem: () => '{not json',
      setItem: () => {},
      removeItem: () => {},
    });

    const { result } = renderHook(() => corruptedStore());
    expect(result.current.preferredSources).toEqual([]);
    expect(result.current.preferredCategories).toEqual([]);
    expect(result.current.preferredAuthors).toEqual([]);
  });

  it('restores valid stored values', () => {
    const validStore = createPreferencesStore({
      getItem: () => JSON.stringify({
        state: {
          preferredSources: ['guardian'],
          preferredCategories: ['Business', 'Tech'],
          preferredAuthors: ['Carolyn Y. Johnson'],
        },
        version: 1,
      }),
      setItem: () => {},
      removeItem: () => {},
    });

    const { result } = renderHook(() => validStore());
    expect(result.current.preferredSources).toEqual(['guardian']);
    expect(result.current.preferredCategories).toEqual(['Business', 'Tech']);
    expect(result.current.preferredAuthors).toEqual(['Carolyn Y. Johnson']);
  });

  it('handles missing fields in stored payload without crashing', () => {
    const partialStore = createPreferencesStore({
      getItem: () => JSON.stringify({
        state: { preferredAuthors: ['Alice'] },
        version: 1,
      }),
      setItem: () => {},
      removeItem: () => {},
    });

    const { result } = renderHook(() => partialStore());
    expect(result.current.preferredAuthors).toEqual(['Alice']);
    expect(result.current.preferredSources).toEqual([]);
    expect(result.current.preferredCategories).toEqual([]);
  });
});
