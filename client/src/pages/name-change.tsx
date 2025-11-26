import { useState } from "react";
import { TaskControlCard } from "@/components/task-control-card";
import { BotList } from "@/components/bot-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserCog, Info } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Bot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface NameChangeResult {
  bot: string;
  success: boolean;
  newName?: string;
  error?: string;
}

interface NameChangeStatusResponse {
  success: boolean;
  nameChangeStatus: {
    isRunning: boolean;
    total: number;
    completed: number;
    failed: number;
    connectedBots: number;
    totalBots: number;
    results: NameChangeResult[];
  };
}

export default function NameChangePage() {
  const { toast } = useToast();
  const [names, setNames] = useState("");
  
  const { data: response } = useQuery<NameChangeStatusResponse>({
    queryKey: ['/api/name-change/status'],
    refetchInterval: 3000,
  });

  const nameChangeStatus = response?.nameChangeStatus;

  const startMutation = useMutation({
    mutationFn: () => {
      const namesList = names.split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);
      
      if (namesList.length === 0) {
        throw new Error('Please enter at least one name');
      }
      
      return apiRequest('POST', '/api/name-change/start', { names: namesList });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/name-change/status'] });
      toast({ title: "Name change started" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to start name change", 
        description: error.message || "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/name-change/stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/name-change/status'] });
      toast({ title: "Name change stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop name change", variant: "destructive" });
    },
  });

  const isRunning = nameChangeStatus?.isRunning || false;
  const completed = nameChangeStatus?.completed || 0;
  const failed = nameChangeStatus?.failed || 0;
  const total = nameChangeStatus?.total || 0;
  const connectedBots = nameChangeStatus?.connectedBots || 0;
  const totalBots = nameChangeStatus?.totalBots || 0;
  const results = nameChangeStatus?.results || [];
  
  // Count names in textarea
  const namesList = names.split('\n')
    .map(n => n.trim())
    .filter(n => n.length > 0);

  // Transform results into Bot format for BotList component
  const resultBots: Bot[] = results.map((result, index) => ({
    name: result.bot,
    key: `result-${index}`,
    ep: '',
    gc: '',
    snuid: '',
    ui: '',
    // Add status info for display
    status: result.success ? 'member' : 'non-member',
    statusText: result.success ? result.newName || 'Changed' : 'Failed',
  } as any));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Name Change</h1>
        <p className="text-muted-foreground">Change bot names in rotation</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TaskControlCard
          title="Name Change Control"
          status={isRunning ? "Running" : "Idle"}
          onStart={() => {
            if (names.trim().length === 0) {
              toast({ 
                title: "No names entered", 
                description: "Please enter at least one name",
                variant: "destructive" 
              });
              return;
            }
            startMutation.mutate();
          }}
          onStop={() => stopMutation.mutate()}
          isRunning={isRunning}
          icon={UserCog}
          iconColor="bg-info/20 text-info"
        >
          <div className="space-y-2">
            <Label htmlFor="names" className="text-xs text-muted-foreground uppercase">
              Names List (one per line)
            </Label>
            <Textarea
              id="names"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              placeholder="Enter names, one per line...&#10;Example:&#10;Alice&#10;Bob&#10;Charlie"
              className="font-mono text-sm min-h-[120px] resize-none"
              data-testid="input-names"
              disabled={isRunning}
            />
            {namesList.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {namesList.length} name{namesList.length !== 1 ? 's' : ''} entered
              </p>
            )}
          </div>
        </TaskControlCard>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success/20 text-success">
                <Info className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Bot Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Names in Rotation
                </div>
                <div className="font-semibold font-mono" data-testid="text-names-count">
                  {namesList.length}
                </div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Connected Bots
                </div>
                <div className="font-semibold font-mono" data-testid="text-connected-bots">
                  {connectedBots}
                </div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total Bots
                </div>
                <div className="font-semibold font-mono" data-testid="text-total-bots">
                  {totalBots}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BotList
        title="Name Change Results"
        bots={resultBots}
        emptyMessage="Start name change to see results"
        iconColor="bg-info/20 text-info"
      />
    </div>
  );
}