import { useState } from 'react';
import { Notice } from '@/components/ui/Notice';

interface SourceStatus {
  [key: string]: 'ok' | 'error';
}

interface SourceStatusNoticeProps {
  sourceStatus: SourceStatus;
}

const SOURCE_NAMES: Record<string, string> = {
  newsapi: 'NewsAPI',
  guardian: 'The Guardian',
  nyt: 'The New York Times',
};

export function SourceStatusNotice({ sourceStatus }: SourceStatusNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  const errorSources = Object.entries(sourceStatus)
    .filter(([, status]) => status === 'error')
    .map(([sourceId]) => sourceId);

  if (errorSources.length === 0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <Notice title="Some news sources are temporarily unavailable" onClose={handleDismiss}>
      <ul className="list-disc pl-5 space-y-1">
        {errorSources.map((sourceId) => (
          <li key={sourceId}>{SOURCE_NAMES[sourceId] ?? ''}</li>
        ))}
      </ul>
    </Notice>
  );
}