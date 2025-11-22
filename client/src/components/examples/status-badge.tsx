import { StatusBadge } from '../status-badge';

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      <StatusBadge status="idle" />
      <StatusBadge status="member" />
      <StatusBadge status="non-member" />
      <StatusBadge status="checking" />
      <StatusBadge status="connected" />
      <StatusBadge status="joining" />
      <StatusBadge status="processing" />
      <StatusBadge status="completed" />
      <StatusBadge status="failed" />
    </div>
  );
}
