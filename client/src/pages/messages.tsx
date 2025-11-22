import { TaskControlCard } from "@/components/task-control-card";
import { ProgressCard } from "@/components/progress-card";
import { BotList } from "@/components/bot-list";
import { MessageSquare } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Bot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MessageTaskStatusResponse {
  success: boolean;
  taskStatus: {
    isRunning: boolean;
    totalEligible: number;
    completed: number;
    processing: number;
    remaining: number;
    failed: number;
    eligibleBots: number;
  };
}

interface MembershipStatusResponse {
  success: boolean;
  isChecking: boolean;
  totalBots: number;
  completed: number;
  failed: number;
  bots: Bot[];
}

export default function MessagesPage() {
  const { toast } = useToast();
  
  const { data: taskResponse } = useQuery<MessageTaskStatusResponse>({
    queryKey: ['/api/tasks/message/status'],
    refetchInterval: 3000,
  });

  const { data: membershipResponse } = useQuery<MembershipStatusResponse>({
    queryKey: ['/api/tasks/membership/status'],
    refetchInterval: 3000,
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/tasks/message/start'),
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
  const processing = taskStatus?.processing || 0;
  const failed = taskStatus?.failed || 0;
  const total = taskStatus?.totalEligible || 0;

  // Filter eligible bots from membership data
  // Eligible = member AND has not completed message task yet
  const allBots = membershipResponse?.bots || [];
  const eligibleBots = allBots.filter(bot => 
    bot.hasOwnProperty('membership') && 
    (bot as any).membership === true && 
    !(bot as any).message
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Messages Task</h1>
        <p className="text-muted-foreground">Send messages using eligible bots</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskControlCard
          title="Message Task"
          status={isRunning ? "Running" : "Idle"}
          onStart={() => {
            if (eligibleBots.length === 0) {
              toast({ 
                title: "No eligible bots", 
                description: "Run membership check first to find eligible bots",
                variant: "destructive" 
              });
              return;
            }
            startMutation.mutate();
          }}
          onStop={() => stopMutation.mutate()}
          isRunning={isRunning}
          icon={MessageSquare}
          iconColor="bg-success/20 text-success"
        />

        <ProgressCard
          completed={completed}
          processing={processing}
          failed={failed}
          total={Math.max(total, 1)}
        />
      </div>

      <BotList
        title="Eligible Bots"
        bots={eligibleBots}
        emptyMessage="Run membership check first"
        iconColor="bg-success/20 text-success"
      />
    </div>
  );
}