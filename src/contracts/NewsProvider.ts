import type { Article } from "./Article";
import type { SearchParams } from "./SearchParams";

export interface NewsProvider {
  readonly id: string;       // 'newsapi' | 'guardian' | 'nyt'
  readonly displayName: string;
  /**
   * Search this source.
   *
   * `signal` is optional. Callers (TanStack Query, etc.) should pass the
   * controller from a query hook so stale requests don't overwrite fresh
   * ones — see agent-skills/04-security-and-reliability.md rule 4. The
   * aggregator also forwards one when supplied.
   */
  search(params: SearchParams, signal?: AbortSignal): Promise<Article[]>;
}
