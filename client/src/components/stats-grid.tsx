import { Card } from "@/components/ui/card";

interface Stat {
  label: string;
  value: number;
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
}

interface StatsGridProps {
  stats: Stat[];
}

const colorClasses = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <Card key={index} className="p-3 sm:p-4 text-center" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
          <div className={`text-xl sm:text-2xl font-bold mb-1 ${stat.color ? colorClasses[stat.color] : 'text-foreground'}`}>
            {stat.value}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
            {stat.label}
          </div>
        </Card>
      ))}
    </div>
  );
}
