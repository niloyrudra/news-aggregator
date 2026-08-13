import { useMemo, useState } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { useArticles } from '@/hooks/useArticles';
import { usePreferencesStore } from '@/features/preferences/store';
import { ArticleList } from './ArticleList';
import { SearchBar } from '@/features/search/SearchBar';
import { SourceStatusNotice } from './SourceStatusNotice';
import { FilterSidebar } from './FilterSidebar';
import { NewsApiProvider, GuardianProvider, NytProvider } from '@/services/providers';
import { FilterIcon } from 'lucide-react';

export function FeedPage() {
  const { asSearchParams } = useSearchFilters();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get user's preferred sources from preferences
  const { preferredSources, preferredCategories, preferredAuthors } = usePreferencesStore();

  // Initialize providers with proper source filtering
  const providers = useMemo(() => {
    const allProviders = [
      new NewsApiProvider(),
      new GuardianProvider(),
      new NytProvider()
    ];

    // If user has preferred sources, filter to only those
    if (preferredSources.length > 0) {
      return allProviders.filter(provider =>
        preferredSources.includes(provider.id)
      );
    }

    // Otherwise, return all providers
    return allProviders;
  }, [preferredSources]);

  // Apply preferences as defaults to search params if no explicit filters
  const effectiveParams = useMemo(() => {
    const searchParams = asSearchParams();
    
    // Only apply preferences as defaults if user hasn't explicitly set filters
    const hasExplicitFilters = Boolean(
      searchParams.keyword ||
      searchParams.dateFrom ||
      searchParams.dateTo ||
      searchParams.category ||
      (searchParams.sources && searchParams.sources.length > 0) ||
      (searchParams.authors && searchParams.authors.length > 0)
    );

    if (!hasExplicitFilters) {
      return {
        ...searchParams,
        category: searchParams.category || preferredCategories[0] || undefined,
        sources: searchParams.sources?.length ? searchParams.sources : preferredSources,
        authors: searchParams.authors?.length ? searchParams.authors : preferredAuthors,
      };
    }

    return searchParams;
  }, [asSearchParams, preferredCategories, preferredSources, preferredAuthors]);

  const { data, isLoading, isError } = useArticles(providers, effectiveParams);

  // Get source status for showing notices
  const sourceStatus = data?.sourceStatus || {};

  // Filter articles by preferences client-side as fallback
  const filteredArticles = useMemo(() => {
    const articles = data?.articles;
    if (!articles) return [];
    
    return articles.filter((article) => {
      // Filter by preferred categories if set and not overridden by explicit filter
      if (preferredCategories.length > 0 && !effectiveParams.category) {
        if (!article.category || !preferredCategories.includes(article.category)) {
          return false;
        }
      }
      
      // Filter by preferred sources if set and not overridden by explicit filter
      if (preferredSources.length > 0 && (!effectiveParams.sources || effectiveParams.sources.length === 0)) {
        if (!preferredSources.includes(article.source)) {
          return false;
        }
      }
      
      // Filter by preferred authors if set and not overridden by explicit filter
      if (preferredAuthors.length > 0 && (!effectiveParams.authors || effectiveParams.authors.length === 0)) {
        if (!article.author || !preferredAuthors.includes(article.author)) {
          return false;
        }
      }
      
      return true;
    });
  }, [data?.articles, effectiveParams, preferredCategories, preferredSources, preferredAuthors]);

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

            <ArticleList
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