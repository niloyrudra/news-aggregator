export interface SearchParams {
  keyword?: string;
  dateFrom?: string;        // ISO date
  dateTo?: string;
  category?: string;
  sources?: string[];
  authors?: string[];
}
