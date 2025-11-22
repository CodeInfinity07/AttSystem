import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Link as LinkIcon, LogIn, LogOut } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Bot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface LoaderBot extends Omit<Bot, 'name'> {
  connecting?: boolean;
  connected?: boolean;
  joining?: boolean;
  joined?: boolean;
  failed?: boolean;
  gc?: string;
  name?: string;
  ui?: string;
  ep?: string;
  key?: string;
  connectionId?: string;
  error?: string | null;
}

interface LoaderStatus {
  isRunning: boolean;
  isConnecting: boolean;
  isJoining: boolean;
  totalBots: number;
  availableBots: number;
  connected: number;
  joined: number;
  failed: number;
  clubCode: string;
  bots: LoaderBot[];
  sourceFile: string;
  activeConnections: any[];
}

interface LoaderStatusResponse {
  success: boolean;
  loaderStatus: LoaderStatus;
}

export default function LoaderPage() {
  const { toast } = useToast();
  const [clubCode, setClubCode] = useState("2341357");
  const [botCount, setBotCount] = useState("");
  
  // Fetch loader status
  const { data, isLoading, error } = useQuery<LoaderStatusResponse>({
    queryKey: ['/api/loader/status'],
    refetchInterval: 2000,
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: () => {
      const payload: any = { clubCode };
      if (botCount.trim()) {
        payload.botCount = parseInt(botCount);
      }
      return apiRequest('POST', '/api/loader/connect', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loader/status'] });
      toast({ title: "Bots connecting" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to connect bots", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Join mutation
  const joinMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/loader/join'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loader/status'] });
      toast({ title: "Joining club" });
    },
    onError: () => {
      toast({ title: "Failed to join club", variant: "destructive" });
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/loader/stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loader/status'] });
      toast({ title: "Loader stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop loader", variant: "destructive" });
    },
  });

  // Extract status with safe defaults
  const status = data?.loaderStatus || {
    isRunning: false,
    isConnecting: false,
    isJoining: false,
    totalBots: 0,
    availableBots: 0,
    connected: 0,
    joined: 0,
    failed: 0,
    clubCode: '',
    bots: [],
    sourceFile: '',
    activeConnections: []
  };

  const {
    isRunning,
    isConnecting,
    isJoining,
    totalBots,
    availableBots,
    connected,
    joined,
    failed,
    bots
  } = status;

  // Determine status text
  let statusText = 'Idle';
  if (isConnecting) statusText = 'Connecting';
  else if (isJoining) statusText = 'Joining Club';
  else if (isRunning) statusText = 'Running';

  // Join button logic
  const canJoin = isRunning && !isJoining && connected > 0 && connected === totalBots;

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Bot Loader</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Bot Loader</h1>
          <p className="text-destructive">Error loading status: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Bot Loader</h1>
        <p className="text-muted-foreground">Connect bots to groups</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Control Card */}
        <Card data-testid="card-loader-control">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info/20 text-info">
              <User className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Loader Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clubCode" className="text-xs text-muted-foreground uppercase">
                Club Code
              </Label>
              <Input
                id="clubCode"
                type="text"
                value={clubCode}
                onChange={(e) => setClubCode(e.target.value)}
                placeholder="Enter club code..."
                className="font-mono"
                data-testid="input-club-code"
                disabled={isRunning}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="botCount" className="text-xs text-muted-foreground uppercase">
                Number of Bots (leave empty for all)
              </Label>
              <Input
                id="botCount"
                type="number"
                value={botCount}
                onChange={(e) => setBotCount(e.target.value)}
                placeholder="e.g., 50"
                min="1"
                className="font-mono"
                data-testid="input-bot-count"
                disabled={isRunning}
              />
            </div>

            <div className="rounded-md bg-muted p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Status
              </div>
              <div className="font-semibold font-mono" data-testid="text-loader-status">
                {statusText}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={isRunning || connectMutation.isPending || !clubCode.trim()}
                className="w-full"
                variant="default"
                data-testid="button-connect"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {connectMutation.isPending ? "Connecting..." : "Connect Bots"}
              </Button>

              <Button
                onClick={() => joinMutation.mutate()}
                disabled={!canJoin || joinMutation.isPending}
                className="w-full"
                variant="default"
                data-testid="button-join"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {joinMutation.isPending ? "Joining..." : "Join Club"}
              </Button>

              <Button
                onClick={() => stopMutation.mutate()}
                disabled={!isRunning || stopMutation.isPending}
                className="w-full"
                variant="destructive"
                data-testid="button-stop"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {stopMutation.isPending ? "Stopping..." : "Stop & Leave"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="space-y-4">
          {/* Progress Card - Built-in replacement */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-semibold">{joined} / {Math.max(totalBots, 1)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-success h-2 rounded-full transition-all"
                    style={{ width: `${Math.max(totalBots, 1) > 0 ? (joined / Math.max(totalBots, 1)) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Connected</span>
                  <span className="font-semibold">{connected} / {Math.max(totalBots, 1)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-info h-2 rounded-full transition-all"
                    style={{ width: `${Math.max(totalBots, 1) > 0 ? (connected / Math.max(totalBots, 1)) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Connection Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Connected
                  </div>
                  <div className="font-semibold font-mono text-info" data-testid="text-connected">
                    {connected}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Joined
                  </div>
                  <div className="font-semibold font-mono text-success" data-testid="text-joined">
                    {joined}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Total
                  </div>
                  <div className="font-semibold font-mono" data-testid="text-total">
                    {totalBots}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Failed
                  </div>
                  <div className="font-semibold font-mono text-destructive" data-testid="text-failed">
                    {failed}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Target Club
                </div>
                <div className="font-semibold font-mono" data-testid="text-target-club">
                  {status.clubCode || 'Not Set'}
                </div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Available Bots
                </div>
                <div className="font-semibold font-mono" data-testid="text-available-bots">
                  {availableBots > 0 ? `${totalBots} / ${availableBots}` : availableBots}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bot List - Built-in replacement */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info/20 text-info">
            <User className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Bot Status</CardTitle>
        </CardHeader>
        <CardContent>
          {bots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Click 'Connect Bots' to begin
            </div>
          ) : (
            <div className="space-y-2">
              {bots.map((bot, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-md bg-muted">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      bot?.joined ? 'bg-success' : 
                      bot?.connected ? 'bg-info' : 
                      bot?.failed ? 'bg-destructive' : 
                      'bg-muted-foreground'
                    }`} />
                    <div>
                      <div className="font-semibold text-sm">{bot?.name || `Bot ${index + 1}`}</div>
                      <div className="text-xs text-muted-foreground font-mono">{bot?.gc || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bot?.joined ? 'Joined' : 
                     bot?.connected ? 'Connected' : 
                     bot?.joining ? 'Joining...' :
                     bot?.connecting ? 'Connecting...' :
                     bot?.failed ? 'Failed' : 
                     'Idle'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}