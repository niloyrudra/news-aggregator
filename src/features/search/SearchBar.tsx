import { useState, useEffect } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { SearchIcon, XCircleIcon } from 'lucide-react';

export function SearchBar() {
  const { keyword, setKeyword } = useSearchFilters();
  const [inputValue, setInputValue] = useState(keyword ?? '');

  useEffect(() => {
    setInputValue(keyword ?? '');
  }, [keyword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(inputValue || null);
  };

  const handleClear = () => {
    setInputValue('');
    setKeyword(null);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <SearchIcon
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5"
          aria-hidden="true"
        />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search news..."
          className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Clear search"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Search
      </button>
    </form>
  );
}