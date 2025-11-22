import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressCard } from "@/components/progress-card";
import { BotList } from "@/components/bot-list";
import { UserCheck, RefreshCw, Save, MessageSquare, Mic } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Bot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MembershipStatusResponse {
  success: boolean;
  isChecking: boolean;
  totalBots: number;
  completed: number;
  failed: number;
  bots: Bot[];
  summary: {
    total: number;
    members: number;
    messageComplete: number;
    micComplete: number;
  };
}

export default function MembershipPage() {
  const { toast } = useToast();
  const [clubCode, setClubCode] = useState("");
  
  const { data: statusData } = useQuery<MembershipStatusResponse>({
    queryKey: ['/api/tasks/membership/status'],
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Transform the data to separate members and non-members
  const memberBots = statusData?.bots?.filter(bot => 
    bot.hasOwnProperty('membership') && (bot as any).membership === true
  ) || [];
  
  const nonMemberBots = statusData?.bots?.filter(bot => 
    bot.hasOwnProperty('membership') && (bot as any).membership === false
  ) || [];

  const updateClubMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/config/club-code', { clubCode }),
    onSuccess: () => {
      toast({ title: "Club code updated", description: `Set to ${clubCode}` });
    },
    onError: () => {
      toast({ title: "Failed to update club code", variant: "destructive" });
    },
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/tasks/membership/start', { 
        clubCode
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/membership/status'] });
      toast({ 
        title: "Membership check started", 
        description: `Checking ${data.totalBots} bots` 
      });
    },
    onError: () => {
      toast({ title: "Failed to check membership", variant: "destructive" });
    },
  });

  const isChecking = statusData?.isChecking || checkMutation.isPending;
  const totalChecked = (statusData?.completed || 0);
  const totalBots = statusData?.totalBots || 0;
  
  const msgPerms = memberBots.filter(b => (b as any).message).length;
  const micPerms = memberBots.filter(b => (b as any).micTime).length;
  const bothPerms = memberBots.filter(b => (b as any).message && (b as any).micTime).length;
  const noPerms = memberBots.filter(b => !(b as any).message && !(b as any).micTime).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Membership Check</h1>
        <p className="text-muted-foreground">Verify bot group memberships</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="card-membership-control">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/20 text-accent">
              <UserCheck className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Control</CardTitle>
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
              />
            </div>

            <Button
              onClick={() => updateClubMutation.mutate()}
              disabled={!clubCode || updateClubMutation.isPending}
              className="w-full"
              variant="default"
              data-testid="button-update-club"
            >
              <Save className="h-4 w-4 mr-2" />
              Update Club Code
            </Button>

            <div className="border-t pt-4">
              <div className="rounded-md bg-muted p-3 mb-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total Bots
                </div>
                <div className="font-semibold font-mono" data-testid="text-total-bots">
                  {totalBots}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => checkMutation.mutate()}
                  disabled={isChecking || !clubCode}
                  className="w-full"
                  data-testid="button-check"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {isChecking ? "Checking..." : "Start Check"}
                </Button>

                <Button
                  variant="default"
                  className="w-full"
                  data-testid="button-refresh"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/tasks/membership/status'] })}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ProgressCard
            completed={totalChecked}
            processing={isChecking ? 1 : 0}
            total={Math.max(totalBots, 1)}
          />

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Members
                  </div>
                  <div className="font-semibold font-mono text-success" data-testid="text-members">
                    {memberBots.length}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Non-Members
                  </div>
                  <div className="font-semibold font-mono text-destructive" data-testid="text-non-members">
                    {nonMemberBots.length}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Checking
                  </div>
                  <div className="font-semibold font-mono text-accent" data-testid="text-checking">
                    {isChecking ? '...' : 0}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Completed
                  </div>
                  <div className="font-semibold font-mono" data-testid="text-completed">
                    {totalChecked}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Message
                  </div>
                  <div className="font-semibold font-mono" data-testid="text-msg-perms">
                    {msgPerms}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    Mic
                  </div>
                  <div className="font-semibold font-mono" data-testid="text-mic-perms">
                    {micPerms}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Both
                  </div>
                  <div className="font-semibold font-mono text-success" data-testid="text-both-perms">
                    {bothPerms}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    None
                  </div>
                  <div className="font-semibold font-mono text-destructive" data-testid="text-no-perms">
                    {noPerms}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BotList
          title="Members"
          bots={memberBots}
          emptyMessage="No members found"
          iconColor="bg-success/20 text-success"
        />

        <BotList
          title="Non-Members"
          bots={nonMemberBots}
          emptyMessage="No non-members found"
          iconColor="bg-destructive/20 text-destructive"
        />
      </div>
    </div>
  );
}