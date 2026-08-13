import { useState } from 'react';
import { XCircleIcon, AlertTriangleIcon } from 'lucide-react';

interface SourceStatus {
  [key: string]: 'ok' | 'error';
}

interface SourceStatusNoticeProps {
  sourceStatus: SourceStatus;
}

export function SourceStatusNotice({ sourceStatus }: SourceStatusNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

   // Find all providers that are in error state
   const errorSources = Object.entries(sourceStatus)
     // eslint-disable-next-line @typescript-eslint/no-unused-vars
     .filter(([_, status]) => status === 'error')
     .map(([sourceId]) => sourceId);

   if (errorSources.length === 0 || dismissed) {
     return null;
   }

   const handleDismiss = () => {
     setDismissed(true);
   };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertTriangleIcon  // ExclamationTriangleIcon
          className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0"
          aria-hidden="true"
        />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Some news sources are temporarily unavailable</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc pl-5 space-y-1">
              {errorSources.map((sourceId) => (
                <li key={sourceId} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    {sourceId === 'newsapi' && 'NewsAPI'}
                    {sourceId === 'guardian' && 'The Guardian'}
                    {sourceId === 'nyt' && 'The New York Times'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-4 flex-shrink-0 text-yellow-400 hover:text-yellow-600 focus:outline-none"
          aria-label="Dismiss notice"
        >
          <XCircleIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}