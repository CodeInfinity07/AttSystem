import { ProgressCard } from '../progress-card';

export default function ProgressCardExample() {
  return (
    <div className="p-4 max-w-2xl">
      <ProgressCard
        title="Task Progress"
        completed={42}
        processing={8}
        failed={3}
        total={53}
      />
    </div>
  );
}
