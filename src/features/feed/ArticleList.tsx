import type { Article } from '@/contracts/Article';
import { ArticleCard } from './ArticleCard';

interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
  hasError: boolean;
}

export function ArticleList({ articles, isLoading, hasError }: ArticleListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error loading articles</h3>
        <p className="text-red-600">Please try again later.</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
        <p className="text-gray-600">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}