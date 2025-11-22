import { Badge } from "@/components/ui/badge";
import type { BotStatus } from "@shared/schema";

interface StatusBadgeProps {
  status: BotStatus;
}

const statusConfig: Record<BotStatus, { label: string; className: string }> = {
  idle: { label: "Idle", className: "bg-muted text-muted-foreground" },
  member: { label: "Member", className: "bg-success/20 text-success border-success/30" },
  "non-member": { label: "Non-Member", className: "bg-destructive/20 text-destructive border-destructive/30" },
  checking: { label: "Checking", className: "bg-accent/20 text-accent border-accent/30" },
  connected: { label: "Connected", className: "bg-info/20 text-info border-info/30" },
  joining: { label: "Joining", className: "bg-warning/20 text-warning border-warning/30" },
  processing: { label: "Processing", className: "bg-warning/20 text-warning border-warning/30" },
  completed: { label: "Completed", className: "bg-success/20 text-success border-success/30" },
  failed: { label: "Failed", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={`text-[10px] font-semibold uppercase ${config.className}`}
      data-testid={`badge-${status}`}
    >
      {config.label}
    </Badge>
  );
}
