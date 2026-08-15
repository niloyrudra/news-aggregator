// import { useState, useEffect } from 'react';
import { usePreferencesStore } from './store';
import { SettingsCard } from '@/components/ui/SettingsCard';

export function CategorySelector() {
  const { preferredCategories, setPreferredCategories } = usePreferencesStore();

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

  const handleToggleCategory = (category: string) => {
    const newSelected = preferredCategories.includes(category)
      ? preferredCategories.filter(c => c !== category)
      : [...preferredCategories, category];

    setPreferredCategories(newSelected);
  };

  return (
    <SettingsCard
      title="News Categories"
      description="Select which news categories to include in your feed"
      className="mt-6"
    >
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
    </SettingsCard>
  );
}