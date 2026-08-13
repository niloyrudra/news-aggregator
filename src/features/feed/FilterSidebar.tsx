import { useSearchFilters } from '@/hooks/useSearchFilters';
import { usePreferencesStore } from '@/features/preferences/store';
import { CalendarIcon, TagIcon, NewspaperIcon, UserIcon, XIcon } from 'lucide-react';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'Politics',
  'Business',
  'Technology',
  'Science',
  'Health',
  'Sports',
  'Entertainment',
];

const SOURCES = [
  { id: 'newsapi', name: 'NewsAPI' },
  { id: 'guardian', name: 'The Guardian' },
  { id: 'nyt', name: 'The New York Times' },
];

export function FilterSidebar({ isOpen, onClose }: FilterSidebarProps) {
  const {
    dateFrom,
    dateTo,
    category,
    sources,
    authors,
    setDateFrom,
    setDateTo,
    setCategory,
    setSources,
    setAuthors,
    resetAll,
  } = useSearchFilters();

  const { preferredSources, preferredCategories, preferredAuthors } = usePreferencesStore();

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value || null);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value || null);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value || null);
  };

  const handleSourceToggle = (sourceId: string) => {
    const newSources = sources?.includes(sourceId)
      ? sources.filter((id) => id !== sourceId)
      : [...(sources || []), sourceId];
    setSources(newSources.length > 0 ? newSources : null);
  };

  const handleAuthorToggle = (author: string) => {
    const newAuthors = authors?.includes(author)
      ? authors.filter((a) => a !== author)
      : [...(authors || []), author];
    setAuthors(newAuthors.length > 0 ? newAuthors : null);
  };

  const hasActiveFilters = Boolean(
    dateFrom || dateTo || category || (sources && sources.length > 0) || (authors && authors.length > 0)
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
        aria-hidden="true"
        style={{ pointerEvents: 'auto' }}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:static lg:shadow-none lg:border-r lg:border-gray-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Filters"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label="Close filters"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                Date Range
              </h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="date-from" className="block text-xs font-medium text-gray-700 mb-1">
                    From
                  </label>
                  <input
                    type="date"
                    id="date-from"
                    value={dateFrom || ''}
                    onChange={handleDateFromChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="date-to" className="block text-xs font-medium text-gray-700 mb-1">
                    To
                  </label>
                  <input
                    type="date"
                    id="date-to"
                    value={dateTo || ''}
                    onChange={handleDateToChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-gray-500" />
                Category
              </h3>
              <select
                value={category || ''}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {preferredCategories.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Preferred: {preferredCategories.join(', ')}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <NewspaperIcon className="h-4 w-4 text-gray-500" />
                Sources
              </h3>
              <div className="space-y-2">
                {SOURCES.map((source) => (
                  <label key={source.id} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={`source-${source.id}`}
                      checked={sources?.includes(source.id) || false}
                      onChange={() => handleSourceToggle(source.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">{source.name}</span>
                    {preferredSources.includes(source.id) && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Preferred</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                Authors
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {authors?.map((author) => (
                  <label key={author} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={`author-${author.replace(/\s+/g, '-').toLowerCase()}`}
                      checked={true}
                      onChange={() => handleAuthorToggle(author)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">{author}</span>
                  </label>
                ))}
                {(!authors || authors.length === 0) && (
                  <p className="text-sm text-gray-500">No authors in current results</p>
                )}
              </div>
              {preferredAuthors.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Preferred: {preferredAuthors.join(', ')}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAll}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}