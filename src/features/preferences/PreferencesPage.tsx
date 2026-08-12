import { usePreferencesStore } from './store';
import { SourceSelector } from './SourceSelector';
import { CategorySelector } from './CategorySelector';

export function PreferencesPage() {
  const { resetPreferences } = usePreferencesStore();

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all preferences to defaults?')) {
      resetPreferences();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Preferences</h1>
        <p className="text-gray-600">Customize your news feed experience</p>
      </div>

      <SourceSelector />

      <CategorySelector />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Reset Preferences</h3>
        <p className="text-gray-600 mb-4">Restore all preferences to their default values</p>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}