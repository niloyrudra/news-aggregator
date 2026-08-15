import { useSearchFilters } from '@/hooks/useSearchFilters';
import { usePreferencesStore } from '@/features/preferences/store';
import { CalendarIcon, TagIcon, NewspaperIcon, UserIcon, XIcon } from 'lucide-react';
import { FilterSection } from '@/components/ui/FilterSection';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  availableAuthors: string[];
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

function FilterHeader({ activeFilterCount, onClose }: { activeFilterCount: number; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        Filters
        {activeFilterCount > 0 && (
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            ({activeFilterCount})
          </span>
        )}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        aria-label="Close filters"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export function FilterSidebar({ isOpen, onClose, availableAuthors }: FilterSidebarProps) {
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
    resetFilters,
  } = useSearchFilters();

  const { preferredSources, preferredCategories, preferredAuthors } = usePreferencesStore();

  // Active filter count: only sidebar filters (dateFrom, dateTo, category, sources, authors)
  const activeFilterCount = [
    dateFrom ? 1 : 0,
    dateTo ? 1 : 0,
    category ? 1 : 0,
    sources?.length || 0,
    authors?.length || 0,
  ].reduce((a, b) => a + b, 0);

  const hasActiveFilters = activeFilterCount > 0;

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
          <FilterHeader activeFilterCount={activeFilterCount} onClose={onClose} />

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <FilterSection title="Date Range" icon={<CalendarIcon className="h-4 w-4 text-gray-500" />}>
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
            </FilterSection>

            <FilterSection title="Category" icon={<TagIcon className="h-4 w-4 text-gray-500" />}>
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
            </FilterSection>

            <FilterSection title="Sources" icon={<NewspaperIcon className="h-4 w-4 text-gray-500" />}>
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
            </FilterSection>

            <FilterSection title="Authors" icon={<UserIcon className="h-4 w-4 text-gray-500" />}>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableAuthors.map((author) => (
                  <label key={author} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={`author-${author.replace(/\s+/g, '-').toLowerCase()}`}
                      checked={authors?.includes(author) || false}
                      onChange={() => handleAuthorToggle(author)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">{author}</span>
                  </label>
                ))}
                {(availableAuthors.length === 0) && (
                  <p className="text-sm text-gray-500">No authors in current results</p>
                )}
              </div>
              {preferredAuthors.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Preferred: {preferredAuthors.join(', ')}
                </p>
              )}
            </FilterSection>

            {hasActiveFilters && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}