import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { z } from 'zod';

/**
 * User preferences store — see agent-skills/03 § 3.
 *
 * Source/category/author preferences feed the feed page as *defaults*; the
 * URL params (from `useSearchFilters`) win when present. Persisted to
 * localStorage via Zustand's `persist` middleware.
 *
 * Loaded data is validated with a Zod schema on hydrate (see
 * `agent-skills/03-state-management.md` § 3, the "shape change survives"
 * rule): if the stored JSON doesn't match — older version, manual edit,
 * a different app sharing the key — we throw it away and fall back to
 * defaults. Cheaper and safer than a migration on day one of any
 * deployed users.
 */

export interface PreferencesState {
  preferredSources: string[];
  preferredCategories: string[];
  preferredAuthors: string[];
  /**
   * Bulk update — multiple fields at once. Implemented with `Partial<...>`
   * so callers can pass only the fields they're changing.
   */
  setPreferences: (patch: Partial<Pick<
    PreferencesState,
    'preferredSources' | 'preferredCategories' | 'preferredAuthors'
  >>) => void;
  /** Direct setter for a single field — convenience for editors/pickers. */
  setPreferredSources: (sources: string[]) => void;
  setPreferredCategories: (categories: string[]) => void;
  setPreferredAuthors: (authors: string[]) => void;
  /** Reset all preferences to defaults. */
  resetPreferences: () => void;
}

const DEFAULTS = {
  preferredSources: [] as string[],
  preferredCategories: [] as string[],
  preferredAuthors: [] as string[],
};

/**
 * Shape of the *persisted* blob. We keep this as a constant array of strings
 * per field so a corrupted/stale type never silently survives a Zod parse.
 *
 * NOTE: Zustand `persist` round-trips through `JSON.stringify`, which means
 * `string[]` survives losslessly and Zod's `array(z.string())` is a perfect
 * match for what comes back.
 */
const persistedSchema = z
  .object({
    preferredSources: z.array(z.string()),
    preferredCategories: z.array(z.string()),
    preferredAuthors: z.array(z.string()),
  })
  .partial(); // any missing key → defaults; we don't want a hard failure on upgrade

const STORAGE_KEY = 'innoscripta.preferences.v1';

/**
 * Coerce the persisted shape into the full `PreferencesState` (so direct
 * field access in components gets a non-undefined array even if the user
 * has never interacted with a preference). Returns DEFAULTS when input fails
 * validation — see `agent-skills/03` § 3 rule.
 */
function parsePersisted(raw: unknown): Pick<
  PreferencesState,
  'preferredSources' | 'preferredCategories' | 'preferredAuthors'
> {
  const result = persistedSchema.safeParse(raw);
  if (!result.success) {
    if (typeof console !== 'undefined') {
      console.warn(
        '[preferences] Stored preferences did not match the expected shape; falling back to defaults.',
      );
    }
    return { ...DEFAULTS };
  }
  return {
    preferredSources: result.data.preferredSources ?? DEFAULTS.preferredSources,
    preferredCategories: result.data.preferredCategories ?? DEFAULTS.preferredCategories,
    preferredAuthors: result.data.preferredAuthors ?? DEFAULTS.preferredAuthors,
  };
}

/**
 * Factory function to create a preferences store with custom storage.
 * Used by tests to inject a mock storage.
 */
export function createPreferencesStore(storage?: StateStorage) {
  return create<PreferencesState>()(
    persist(
      (set) => ({
        ...DEFAULTS,
        setPreferences: (patch) =>
          set((prev) => ({
            preferredSources: patch.preferredSources ?? prev.preferredSources,
            preferredCategories: patch.preferredCategories ?? prev.preferredCategories,
            preferredAuthors: patch.preferredAuthors ?? prev.preferredAuthors,
          })),
        setPreferredSources: (sources) => set({ preferredSources: sources }),
        setPreferredCategories: (categories) => set({ preferredCategories: categories }),
        setPreferredAuthors: (authors) => set({ preferredAuthors: authors }),
        resetPreferences: () => set({ ...DEFAULTS }),
      }),
      {
        name: STORAGE_KEY,
        storage: storage
          ? createJSONStorage(() => storage)
          : createJSONStorage(() => localStorage),
        // Persist only the user's selections — not the action functions.
        partialize: (state) => ({
          preferredSources: state.preferredSources,
          preferredCategories: state.preferredCategories,
          preferredAuthors: state.preferredAuthors,
        }),
        // On hydrate, validate; if it doesn't match, fall back to defaults.
        merge: (persisted: unknown, current) => ({
          ...current,
          ...parsePersisted(persisted),
        }),
        // `version` documents the persisted shape; bump it when changing the schema.
        version: 1,
      },
    ),
  );
}

/** Default singleton store using real localStorage. */
export const usePreferencesStore = createPreferencesStore();
