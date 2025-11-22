import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "./status-badge";
import type { Bot } from "@shared/schema";
import { List } from "lucide-react";

interface BotListProps {
  title: string;
  bots: Bot[];
  emptyMessage?: string;
  icon?: React.ReactNode;
  iconColor?: string;
}

export function BotList({ 
  title, 
  bots, 
  emptyMessage = "No bots available",
  icon,
  iconColor = "bg-success/20 text-success"
}: BotListProps) {
  return (
    <Card data-testid="card-bot-list">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${iconColor}`}>
          {icon || <List className="h-4 w-4" />}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {bots.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground italic" data-testid="text-empty-state">
            {emptyMessage}
          </div>
        ) : (
          <ScrollArea className="h-[300px] rounded-md bg-background p-4">
            <div className="space-y-1">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className={`flex items-center justify-between p-3 rounded-md bg-muted/30 border-l-2 ${
                    bot.status === 'member' ? 'border-l-success' :
                    bot.status === 'non-member' ? 'border-l-destructive' :
                    bot.status === 'checking' ? 'border-l-accent' :
                    bot.status === 'connected' ? 'border-l-info' :
                    bot.status === 'joining' ? 'border-l-warning' :
                    'border-l-muted'
                  }`}
                  data-testid={`bot-item-${bot.id}`}
                >
                  <span className="text-sm font-mono">{bot.name}</span>
                  <StatusBadge status={bot.status} />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
