import { XCircleIcon } from 'lucide-react';

interface CloseButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  iconClassName?: string;
}

export function CloseButton({
  onClick,
  label = 'Dismiss notice',
  className = 'ml-4 flex-shrink-0 text-yellow-400 hover:text-yellow-600 focus:outline-none',
  iconClassName = 'h-5 w-5',
}: CloseButtonProps) {
  return (
    <button type="button" onClick={onClick} className={className} aria-label={label}>
      <XCircleIcon className={iconClassName} />
    </button>
  );
}