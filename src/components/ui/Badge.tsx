interface BadgeProps {
  children: string;
  variant?: 'blue' | 'gray';
}

const variantStyles = {
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-800',
} as const;

export function Badge({ children, variant = 'blue' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}