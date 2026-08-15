interface StateMessageProps {
  title: string;
  children: string;
  tone?: 'error' | 'empty';
}

const toneStyles = {
  error: {
    container: 'bg-red-50 border-red-200 p-6',
    title: 'text-red-800',
    body: 'text-red-600',
  },
  empty: {
    container: 'bg-gray-50 border-gray-200 p-8',
    title: 'text-gray-900',
    body: 'text-gray-600',
  },
} as const;

export function StateMessage({ title, children, tone = 'empty' }: StateMessageProps) {
  const styles = toneStyles[tone];
  return (
    <div className={`rounded-lg text-center border ${styles.container}`}>
      <h3 className={`text-lg font-medium mb-2 ${styles.title}`}>{title}</h3>
      <p className={styles.body}>{children}</p>
    </div>
  );
}