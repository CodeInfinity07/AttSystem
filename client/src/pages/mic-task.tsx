import { TaskControlCard } from "@/components/task-control-card";
import { ProgressCard } from "@/components/progress-card";
import { BotList } from "@/components/bot-list";
import { Mic } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Bot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MicTaskStatusResponse {
  success: boolean;
  taskStatus: {
    isRunning: boolean;
    totalEligible: number;
    completed: number;
    connected?: number; // Legacy field, may not be present
    remaining: number;
    failed: number;
    eligibleBots: number;
    activeConnections: Array<{
      connectionId: string;
      botName: string;
      onMic: boolean;
      uptime: number;
      lastActivity: number;
    }>;
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

export default function MicTaskPage() {
  const { toast } = useToast();
  
  const { data: taskResponse } = useQuery<MicTaskStatusResponse>({
    queryKey: ['/api/tasks/mic/status'],
    refetchInterval: 3000,
  });

  const { data: membershipResponse } = useQuery<MembershipStatusResponse>({
    queryKey: ['/api/tasks/membership/status'],
    refetchInterval: 3000,
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/tasks/mic/start'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/mic/status'] });
      toast({ title: "Mic task started" });
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
    mutationFn: () => apiRequest('POST', '/api/tasks/mic/stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/mic/status'] });
      toast({ title: "Mic task stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop task", variant: "destructive" });
    },
  });

  const taskStatus = taskResponse?.taskStatus;
  const isRunning = taskStatus?.isRunning || false;
  const completed = taskStatus?.completed || 0;
  const connected = taskStatus?.activeConnections?.length || 0;
  const failed = taskStatus?.failed || 0;
  const total = taskStatus?.totalEligible || taskStatus?.eligibleBots || 0;

  // Debug log - remove after testing
  console.log('Mic Task Debug:', { taskResponse, taskStatus, total, totalEligible: taskStatus?.totalEligible });

  // Filter eligible bots from membership data
  // Eligible = member AND has not completed mic task yet
  const allBots = membershipResponse?.bots || [];
  const eligibleBots = allBots.filter(bot => 
    bot.hasOwnProperty('membership') && 
    (bot as any).membership === true && 
    !(bot as any).micTime
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Mic Task</h1>
        <p className="text-muted-foreground">Manage bot voice/audio operations</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskControlCard
          title="Mic Task"
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
          icon={Mic}
          iconColor="bg-warning/20 text-warning"
        />

        <ProgressCard
          completed={completed}
          processing={connected}
          failed={failed}
          total={total || 1}
        />
      </div>

      <BotList
        title="Eligible Bots"
        bots={eligibleBots}
        emptyMessage="Run membership check first"
        iconColor="bg-warning/20 text-warning"
      />
    </div>
  );
}