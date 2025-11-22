import { StatsGrid } from '../stats-grid';

export default function StatsGridExample() {
  const stats = [
    { label: 'Done', value: 42, color: 'success' as const },
    { label: 'Active', value: 8, color: 'warning' as const },
    { label: 'Failed', value: 3, color: 'destructive' as const },
    { label: 'Total', value: 53, color: 'primary' as const },
  ];

  return (
    <div className="p-4">
      <StatsGrid stats={stats} />
    </div>
  );
}
