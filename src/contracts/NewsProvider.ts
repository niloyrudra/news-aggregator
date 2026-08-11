import type { Article } from "./Article";
import type { SearchParams } from "./SearchParams";

export interface NewsProvider {
  readonly id: string;       // 'newsapi' | 'guardian' | 'nyt'
  readonly displayName: string;
  search(params: SearchParams): Promise<Article[]>;
}
