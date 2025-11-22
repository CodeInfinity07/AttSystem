import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatsGrid } from "./stats-grid";
import { BarChart3 } from "lucide-react";

interface ProgressCardProps {
  title?: string;
  completed: number;
  processing: number;
  failed?: number;
  total: number;
}

export function ProgressCard({ title = "Progress", completed, processing, failed, total }: ProgressCardProps) {
  const progress = total > 0 ? (completed / total) * 100 : 0;
  
  const stats = [
    { label: 'Done', value: completed, color: 'success' as const },
    { label: 'Active', value: processing, color: 'warning' as const },
    ...(failed !== undefined ? [{ label: 'Failed', value: failed, color: 'destructive' as const }] : []),
    { label: 'Total', value: total, color: 'primary' as const },
  ];

  return (
    <Card data-testid="card-progress">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/20 text-primary">
          <BarChart3 className="h-4 w-4" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatsGrid stats={stats} />
        <Progress value={progress} className="h-1.5" data-testid="progress-bar" />
      </CardContent>
    </Card>
  );
}
