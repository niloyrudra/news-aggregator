import { useMemo } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { useArticles } from '@/hooks/useArticles';
import { usePreferencesStore } from '@/features/preferences/store';
import { ArticleList } from './ArticleList';
import { SearchBar } from '@/features/search/SearchBar';
import { SourceStatusNotice } from './SourceStatusNotice';
import { NewsApiProvider, GuardianProvider, NytProvider } from '@/services/providers';

export function FeedPage() {
  const { asSearchParams } = useSearchFilters();
  const params = asSearchParams();

  // Get user's preferred sources from preferences
  const { preferredSources } = usePreferencesStore();

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

  const { data, isLoading, isError } = useArticles(providers, params);

  // Get source status for showing notices
  const sourceStatus = data?.sourceStatus || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">News Aggregator</h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <SearchBar />
        </div>
      </div>

      <div className="mb-6">
        <SourceStatusNotice sourceStatus={sourceStatus} />
      </div>

      <ArticleList
        articles={data?.articles || []}
        isLoading={isLoading}
        hasError={isError}
      />
    </div>
  );
}