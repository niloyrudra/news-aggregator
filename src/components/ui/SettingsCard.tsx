import type { ReactNode } from 'react';

interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ title, description, children, className = '' }: SettingsCardProps) {
  return (
    <section className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`.trim()}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {children}
    </section>
  );
}