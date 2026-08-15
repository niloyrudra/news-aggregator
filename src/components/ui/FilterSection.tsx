import type { ReactNode } from 'react';

interface FilterSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

export function FilterSection({ title, icon, children }: FilterSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}