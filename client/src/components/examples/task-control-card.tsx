import { TaskControlCard } from '../task-control-card';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function TaskControlCardExample() {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="p-4 max-w-md">
      <TaskControlCard
        title="Message Task"
        status={isRunning ? "Running" : "Idle"}
        onStart={() => {
          console.log('Start clicked');
          setIsRunning(true);
        }}
        onStop={() => {
          console.log('Stop clicked');
          setIsRunning(false);
        }}
        isRunning={isRunning}
        icon={MessageSquare}
      />
    </div>
  );
}
