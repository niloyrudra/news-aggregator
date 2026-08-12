// import { useState, useEffect } from 'react';
import { usePreferencesStore } from './store';

export function CategorySelector() {
  const { preferredCategories, setPreferredCategories } = usePreferencesStore();
  // const [selectedCategories, setSelectedCategories] = useState<string[]>(preferredCategories);

  // Available categories (these would come from an API or be hardcoded)
  const categories = [
    'Politics',
    'Business',
    'Technology',
    'Science',
    'Health',
    'Sports',
    'Entertainment'
  ];

  // useEffect(() => {
  //   setSelectedCategories(preferredCategories);
  // }, [preferredCategories]);

  const handleToggleCategory = (category: string) => {
    const newSelected = preferredCategories.includes(category)
      ? preferredCategories.filter(c => c !== category)
      : [...preferredCategories, category];

    // setSelectedCategories(newSelected);
    setPreferredCategories(newSelected);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">News Categories</h3>
      <p className="text-gray-600 mb-4">Select which news categories to include in your feed</p>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => handleToggleCategory(category)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              preferredCategories.includes(category)
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}