// import { useState, useEffect } from 'react';
import { usePreferencesStore } from './store';
import { SettingsCard } from '@/components/ui/SettingsCard';

export function SourceSelector() {
  const { preferredSources, setPreferredSources } = usePreferencesStore();

  // Available sources
  const sources = [
    { id: 'newsapi', name: 'NewsAPI' },
    { id: 'guardian', name: 'The Guardian' },
    { id: 'nyt', name: 'The New York Times' }
  ];

  const handleToggleSource = (sourceId: string) => {
    const newSelected = preferredSources.includes(sourceId)
      ? preferredSources.filter(id => id !== sourceId)
      : [...preferredSources, sourceId];

    setPreferredSources(newSelected);
  };

  return (
    <SettingsCard title="News Sources" description="Select which news sources to include in your feed">
      <div className="space-y-3">
        {sources.map((source) => (
          <div key={source.id} className="flex items-center">
            <input
              type="checkbox"
              id={`source-${source.id}`}
              checked={preferredSources.includes(source.id)}
              onChange={() => handleToggleSource(source.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`source-${source.id}`} className="ml-3 block text-sm font-medium text-gray-700">
              {source.name}
            </label>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}