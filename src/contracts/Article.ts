export interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  imageUrl: string | null;
  author: string | null;
  source: string;          // human-readable, e.g. "The Guardian"
  category: string | null;
  publishedAt: string;     // ISO 8601
}
