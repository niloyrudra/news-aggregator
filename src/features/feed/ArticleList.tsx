import { useState, useMemo } from 'react';
import type { Article } from '@/contracts/Article';
import { ArticleCard } from './ArticleCard';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
  hasError: boolean;
}

const ARTICLES_PER_PAGE = 20;

export function ArticleList({ articles, isLoading, hasError }: ArticleListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => Math.ceil(articles.length / ARTICLES_PER_PAGE), [articles.length]);
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * ARTICLES_PER_PAGE;
    return articles.slice(start, start + ARTICLES_PER_PAGE);
  }, [articles, currentPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedArticles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed bg-white border border-gray-300 rounded-lg transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed bg-white border border-gray-300 rounded-lg transition-colors"
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </nav>
      )}

      <div className="mt-4 text-center text-sm text-gray-500">
        Showing {(currentPage - 1) * ARTICLES_PER_PAGE + 1} to {Math.min(currentPage * ARTICLES_PER_PAGE, articles.length)} of {articles.length} articles
      </div>
    </div>
  );
}