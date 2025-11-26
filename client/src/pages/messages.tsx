import { TaskControlCard } from "@/components/task-control-card";
import { BotList } from "@/components/bot-list";
import { MessageSquare } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Bot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface MessageTaskStatusResponse {
  success: boolean;
  taskStatus: {
    isRunning: boolean;
    total: number;
    completed: number;
    failed: number;
    connectedBots: number;
    totalBots: number;
  };
}

export default function MessagesPage() {
  const { toast } = useToast();
  const [clubCode, setClubCode] = useState('');
  
  const { data: taskResponse } = useQuery<MessageTaskStatusResponse>({
    queryKey: ['/api/tasks/message/status'],
    refetchInterval: 2000,
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/tasks/message/start', { clubCode: clubCode || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/message/status'] });
      toast({ title: "Message task started" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to start task", 
        description: error.message || "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/tasks/message/stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/message/status'] });
      toast({ title: "Message task stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop task", variant: "destructive" });
    },
  });

  const taskStatus = taskResponse?.taskStatus;
  const isRunning = taskStatus?.isRunning || false;
  const completed = taskStatus?.completed || 0;
  const failed = taskStatus?.failed || 0;
  const total = taskStatus?.total || 0;
  const connectedBots = taskStatus?.connectedBots || 0;
  const totalBots = taskStatus?.totalBots || 0;

  const eligibleBots: Bot[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Messages Task</h1>
        <p className="text-muted-foreground">Send messages to bots in a specific club</p>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-4 space-y-3">
        <div>
          <label className="text-sm font-medium">Club Code</label>
          <p className="text-xs text-muted-foreground mb-2">Bots will join this club before sending messages</p>
          <Input
            data-testid="input-club-code"
            type="text"
            placeholder="Enter club code"
            value={clubCode}
            onChange={(e) => setClubCode(e.target.value)}
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskControlCard
          title="Message Task"
          status={isRunning ? "Running" : "Idle"}
          onStart={() => startMutation.mutate()}
          onStop={() => stopMutation.mutate()}
          isRunning={isRunning}
          icon={MessageSquare}
          iconColor="bg-success/20 text-success"
        />

        <div className="bg-card border border-card-border rounded-lg p-6 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Connected Bots</p>
            <p className="text-3xl font-bold" data-testid="text-connected-bots">{connectedBots}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Total Bots</p>
            <p className="text-3xl font-bold" data-testid="text-total-bots">{totalBots}</p>
          </div>
        </div>
      </div>

      <BotList
        title="Completed Bots"
        bots={eligibleBots}
        emptyMessage="No bots have completed messages yet"
        iconColor="bg-success/20 text-success"
      />
    </div>
  );
}