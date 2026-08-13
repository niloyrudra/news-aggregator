import { Link, useLocation } from 'react-router-dom';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { NavigationItem } from './ui/NavigationItem';
import { FilterIcon, HomeIcon } from 'lucide-react';

export function Navigation() {
  const location = useLocation();
  const { keyword, category, dateFrom, dateTo, sources, authors, resetAll } = useSearchFilters();
  
  const hasActiveFilters = Boolean(
    keyword || category || dateFrom || dateTo || (sources && sources.length > 0) || (authors && authors.length > 0)
  );

  const activeFilterCount = [
    keyword && 1,
    category && 1,
    dateFrom && 1,
    dateTo && 1,
    sources?.length || 0,
    authors?.length || 0,
  ].filter(Boolean).length;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <HomeIcon className="h-6 w-6" />
              News Aggregator
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <NavigationItem
              link="/"
              label={hasActiveFilters ? `Feed (${activeFilterCount})` : 'Feed'}
              icon={<FilterIcon className="h-4 w-4" />}
              isActive={location.pathname === '/'}
            />
            <NavigationItem
              link="/preferences"
              label="Preferences"
              isActive={location.pathname === '/preferences'}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-yellow-100 border border-yellow-300 rounded-lg hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}