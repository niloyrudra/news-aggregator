import type { ReactNode } from 'react';
import { AlertTriangleIcon, AlertCircleIcon } from 'lucide-react';
import { CloseButton } from './CloseButton';

interface NoticeProps {
  title: string;
  children: ReactNode;
  tone?: 'warning' | 'info';
  onClose?: () => void;
  className?: string;
}

const toneStyles = {
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    title: 'text-yellow-800',
    body: 'text-yellow-700',
    icon: AlertTriangleIcon,
    iconColor: 'text-yellow-400',
    closeIconColor: 'text-yellow-400 hover:text-yellow-600',
  },
  info: {
    container: 'bg-amber-50 border-amber-200',
    title: 'text-amber-800',
    body: 'text-amber-700',
    icon: AlertCircleIcon,
    iconColor: 'text-amber-600',
    closeIconColor: 'text-amber-400 hover:text-amber-600',
  },
} as const;

export function Notice({ title, children, tone = 'warning', onClose, className = '' }: NoticeProps) {
  const styles = toneStyles[tone];
  const Icon = styles.icon;

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`} aria-hidden="true" />
        <div className="flex-1">
          <h2 className={`text-sm font-medium ${styles.title}`}>{title}</h2>
          <div className={`mt-1 text-sm ${styles.body}`}>{children}</div>
        </div>
        {onClose && (
          <CloseButton onClick={onClose} className={`flex-shrink-0 ${styles.closeIconColor}`} />
        )}
      </div>
    </div>
  );
}