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
import { usePreferencesStore } from './store';

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

beforeEach(() => {
  // Each test gets a fresh storage so cross-test leakage is impossible.
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage(),
    writable: true,
    configurable: true,
  });
  // Zustand `persist` survives between tests only if state is re-initialised
  // — `createJSONStorage(() => localStorage)` is captured at first call,
  // and the store's initial state is captured at module load. Reload its
  // storage handle by re-setting localStorage BEFORE the test reads; the
  // store's in-memory state remains separately influenced by `reset()`.
  usePreferencesStore.setState({
    preferredSources: [],
    preferredCategories: [],
    preferredAuthors: [],
  });
  usePreferencesStore.persist.clearStorage();
});

afterEach(() => {
  usePreferencesStore.persist.clearStorage();
});

describe('usePreferencesStore — defaults', () => {
  it('starts with all-empty preferences when nothing is persisted', () => {
    const { result } = renderHook(() => usePreferencesStore());
    expect(result.current.preferredSources).toEqual([]);
    expect(result.current.preferredCategories).toEqual([]);
    expect(result.current.preferredAuthors).toEqual([]);
  });
});

describe('usePreferencesStore — mutations', () => {
  it('updates all three fields through setPreferences in one call', () => {
    const { result } = renderHook(() => usePreferencesStore());

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
    const { result } = renderHook(() => usePreferencesStore());
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
    const { result } = renderHook(() => usePreferencesStore());
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
    window.localStorage.setItem(
      'innoscripta.preferences.v1',
      JSON.stringify({
        state: { preferredSources: 'not-an-array' },
        version: 1,
      }),
    );

    act(() => {
      usePreferencesStore.persist.rehydrate();
    });

    const state = usePreferencesStore.getState();
    expect(state.preferredSources).toEqual([]);
    expect(state.preferredCategories).toEqual([]);
    expect(state.preferredAuthors).toEqual([]);
  });

  it('falls back to defaults when JSON is malformed', () => {
    window.localStorage.setItem('innoscripta.preferences.v1', '{not json');

    act(() => {
      usePreferencesStore.persist.rehydrate();
    });

    const state = usePreferencesStore.getState();
    expect(state.preferredSources).toEqual([]);
  });

  it('restores valid stored values', () => {
    window.localStorage.setItem(
      'innoscripta.preferences.v1',
      JSON.stringify({
        state: {
          preferredSources: ['guardian'],
          preferredCategories: ['Business', 'Tech'],
          preferredAuthors: ['Carolyn Y. Johnson'],
        },
        version: 1,
      }),
    );

    act(() => {
      usePreferencesStore.persist.rehydrate();
    });

    const state = usePreferencesStore.getState();
    expect(state.preferredSources).toEqual(['guardian']);
    expect(state.preferredCategories).toEqual(['Business', 'Tech']);
    expect(state.preferredAuthors).toEqual(['Carolyn Y. Johnson']);
  });

  it('handles missing fields in stored payload without crashing', () => {
    // Plant a payload with only one of the three fields set; the rest
    // should fall back to defaults.
    window.localStorage.setItem(
      'innoscripta.preferences.v1',
      JSON.stringify({
        state: { preferredAuthors: ['Alice'] },
        version: 1,
      }),
    );

    act(() => {
      usePreferencesStore.persist.rehydrate();
    });

    const state = usePreferencesStore.getState();
    expect(state.preferredAuthors).toEqual(['Alice']);
    expect(state.preferredSources).toEqual([]);
    expect(state.preferredCategories).toEqual([]);
  });
});
