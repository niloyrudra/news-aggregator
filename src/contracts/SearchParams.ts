export interface SearchParams {
  keyword?: string;
  dateFrom?: string;        // ISO date
  dateTo?: string;
  category?: string;
  sources?: string[];
  authors?: string[];
  /** 1-based page number. Adapters translate to their own convention (NYT is 0-based). */
  page?: number;
}