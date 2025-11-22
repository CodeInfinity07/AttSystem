import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, LucideIcon } from "lucide-react";

interface TaskControlCardProps {
  title: string;
  status: string;
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
  icon: LucideIcon;
  iconColor?: string;
  startButtonColor?: 'default' | 'destructive' | 'outline' | 'secondary';
  children?: React.ReactNode;
}

export function TaskControlCard({
  title,
  status,
  onStart,
  onStop,
  isRunning,
  icon: Icon,
  iconColor = "bg-success/20 text-success",
  startButtonColor = 'default',
  children,
}: TaskControlCardProps) {
  return (
    <Card data-testid="card-task-control">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        
        <div className="rounded-md bg-muted p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Status
          </div>
          <div className="font-semibold font-mono" data-testid="text-status">
            {status}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={onStart}
            disabled={isRunning}
            className="w-full"
            variant={startButtonColor}
            data-testid="button-start"
          >
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>

          <Button
            onClick={onStop}
            disabled={!isRunning}
            variant="outline"
            className="w-full"
            data-testid="button-stop"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
