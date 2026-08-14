import { useMemo, useState } from 'react';
import { useCombinedFilters } from '@/hooks/useCombinedFilters';
import { useArticles } from '@/hooks/useArticles';
import { ArticleList } from './ArticleList';
import { SearchBar } from '@/features/search/SearchBar';
import { SourceStatusNotice } from './SourceStatusNotice';
import { FilterSidebar } from './FilterSidebar';
import { NewsApiProvider, GuardianProvider, NytProvider } from '@/services/providers';
import { FilterIcon, AlertCircleIcon } from 'lucide-react';

export function FeedPage() {
  const { asEffectiveSearchParams, effectiveSources } = useCombinedFilters();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize providers with proper source filtering
  const providers = useMemo(() => {
    const allProviders = [
      new NewsApiProvider(),
      new GuardianProvider(),
      new NytProvider()
    ];

    if (effectiveSources.length > 0) {
      return allProviders.filter(provider =>
        effectiveSources.includes(provider.id)
      );
    }

    // Otherwise, return all providers
    return allProviders;
  }, [effectiveSources]);

  // Use effective params (URL params with preferences as defaults)
  const effectiveParams = asEffectiveSearchParams();

  const { data, isLoading, isError } = useArticles(providers, effectiveParams);

  // Get source status for showing notices
  const sourceStatus = data?.sourceStatus || {};

  // Check if NewsAPI will ignore category filter (when keyword or date also present)
  const newsApiIgnoresCategory = Boolean(
    effectiveParams.category && 
    (effectiveParams.keyword || effectiveParams.dateFrom || effectiveParams.dateTo)
  );

  // Filter articles by effective params (URL params with preferences as defaults) client-side as fallback
  const filteredArticles = useMemo(() => {
    const articles = data?.articles;
    if (!articles) return [];
    
    return articles.filter((article) => {
      // Filter by effective category
      if (effectiveParams.category && article.category) {
        if (!effectiveParams.category.includes(article.category)) {
          return false;
        }
      }
      
      // Filter by effective authors
      if (effectiveParams.authors && effectiveParams.authors.length > 0) {
        if (!article.author || !effectiveParams.authors.includes(article.author)) {
          return false;
        }
      }
      
      return true;
    });
  }, [data?.articles, effectiveParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:flex">
        <FilterSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 lg:pl-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">News Aggregator</h1>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg"
                aria-label="Open filters"
              >
                <FilterIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <SearchBar />
            </div>

            <div className="mb-6">
              <SourceStatusNotice sourceStatus={sourceStatus} />
            </div>

            {/* Warning when NewsAPI will ignore category filter */}
            {newsApiIgnoresCategory && (
              <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <AlertCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">NewsAPI limitation</h4>
                  <p className="mt-1 text-sm text-amber-700">
                    NewsAPI cannot filter by category when keyword or date range is also set.
                    Category filter will be ignored for NewsAPI results. Guardian and NYT will still apply it.
                  </p>
                </div>
              </div>
            )}

            <ArticleList
              key={JSON.stringify(effectiveParams)}
              articles={filteredArticles}
              isLoading={isLoading}
              hasError={isError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}