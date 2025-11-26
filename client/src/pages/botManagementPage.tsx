import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Network, Link as LinkIcon, LogIn, LogOut, Copy, Power, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Bot {
  botId: string;
  name: string;
  gc: string;
  connected: boolean;
  inClub: boolean;
  clubCode: string | null;
  status: string;
  uptime: number;
}

interface BotsResponse {
  success: boolean;
  bots: Bot[];
  stats: {
    totalBots: number;
    connected: number;
  };
}

interface AuthPrompt {
  botId: string;
  botName: string;
  message: any;
  timestamp: string;
}

export default function BotManagementPage() {
  const { toast } = useToast();
  const [clubCode, setClubCode] = useState("2341357");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "connected" | "disconnected" | "inClub">("all");
  const [authPrompts, setAuthPrompts] = useState<AuthPrompt[]>([]);
  const [selectedAuthPrompt, setSelectedAuthPrompt] = useState<AuthPrompt | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [botToDelete, setBotToDelete] = useState<{ botId: string; name: string } | null>(null);
  
  // Fetch all bots with status
  const { data, isLoading, error } = useQuery<BotsResponse>({
    queryKey: ['/api/bots'],
    refetchInterval: 2000,
  });

  // Fetch auth prompts
  const { data: promptsData } = useQuery<{ success: boolean; prompts: AuthPrompt[] }>({
    queryKey: ['/api/bots/auth/prompts'],
    refetchInterval: 1000,
  });

  // Update auth prompts state and show modal
  useEffect(() => {
    if (promptsData?.prompts && promptsData.prompts.length > 0) {
      setAuthPrompts(promptsData.prompts);
      if (!selectedAuthPrompt && promptsData.prompts.length > 0) {
        setSelectedAuthPrompt(promptsData.prompts[0]);
        setTokenInput("");
      }
    } else {
      setAuthPrompts([]);
      if (selectedAuthPrompt && promptsData?.prompts && promptsData.prompts.length === 0) {
        setSelectedAuthPrompt(null);
      }
    }
  }, [promptsData]);

  // Connect bot mutation
  const connectMutation = useMutation({
    mutationFn: (botId: string) => apiRequest('POST', `/api/bots/${botId}/connect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot connecting..." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to connect bot", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Disconnect bot mutation
  const disconnectMutation = useMutation({
    mutationFn: (botId: string) => apiRequest('POST', `/api/bots/${botId}/disconnect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot disconnected" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to disconnect bot", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Join club mutation
  const joinMutation = useMutation({
    mutationFn: (botId: string) => 
      apiRequest('POST', `/api/bots/${botId}/join`, { clubCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot joining club..." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to join club", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Leave club mutation
  const leaveMutation = useMutation({
    mutationFn: (botId: string) => apiRequest('POST', `/api/bots/${botId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot left club" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to leave club", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete bot mutation
  const deleteMutation = useMutation({
    mutationFn: (botId: string) => apiRequest('DELETE', `/api/bots/${botId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
      toast({ title: "Bot deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete bot", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Send auth token mutation
  const sendTokenMutation = useMutation({
    mutationFn: (token: string) => {
      if (!selectedAuthPrompt) throw new Error("No auth prompt selected");
      return apiRequest('POST', `/api/bots/${selectedAuthPrompt.botId}/auth/token`, { token });
    },
    onSuccess: () => {
      toast({ title: "Token sent successfully" });
      setTokenInput("");
      setSelectedAuthPrompt(null);
      queryClient.invalidateQueries({ queryKey: ['/api/bots/auth/prompts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send token", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const importBotsMutation = useMutation({
    mutationFn: async (botStrings: string[]) => {
      const response = await apiRequest('POST', '/api/bots/import', { botStrings });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({ title: `Successfully added ${data.added} bot(s)` });
      setImportText("");
      setImportDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/bots'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to import bots", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Format uptime
  const formatUptime = (ms: number) => {
    if (ms === 0) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Filter and search bots
  const filteredBots = data?.bots?.filter(bot => {
    // Search filter
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bot.gc.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "connected" && bot.connected) ||
      (filterStatus === "disconnected" && !bot.connected) ||
      (filterStatus === "inClub" && bot.inClub);
    
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Bot Management</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Bot Management</h1>
          <p className="text-destructive">Error loading bots: {error.message}</p>
        </div>
      </div>
    );
  }

  const { stats } = data || { stats: { totalBots: 0, connected: 0 } };
  const disconnectedCount = stats.totalBots - stats.connected;
  const inClubCount = data?.bots?.filter(b => b.inClub).length || 0;

  return (
    <>
      {/* Auth Prompt Modal */}
      <Dialog open={!!selectedAuthPrompt} onOpenChange={(open) => {
        if (!open) setSelectedAuthPrompt(null);
      }}>
        <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh] w-[95vw]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg">Authentication Required - {selectedAuthPrompt?.botName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-w-0 space-y-3 px-0.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium">WebSocket Message (Base64)</Label>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedAuthPrompt?.message || "");
                    toast({ description: "Copied to clipboard" });
                  }}
                  data-testid="button-copy-message"
                  className="h-7 w-7"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="bg-muted p-2.5 rounded-md text-xs font-mono overflow-x-auto border border-border max-h-[180px] overflow-y-auto break-all">
                <pre className="m-0 text-[11px] leading-relaxed whitespace-pre-wrap">
                  {selectedAuthPrompt?.message}
                </pre>
              </div>
            </div>
            <div className="space-y-1.5 shrink-0">
              <Label htmlFor="auth-token" className="text-xs font-medium">Authentication Token</Label>
              <Input
                id="auth-token"
                placeholder="Enter token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                disabled={sendTokenMutation.isPending}
                data-testid="input-auth-token"
                className="text-sm h-9"
              />
            </div>
          </div>
          <div className="flex gap-2 shrink-0 pt-3 border-t">
            <Button
              onClick={() => sendTokenMutation.mutate(tokenInput)}
              disabled={!tokenInput.trim() || sendTokenMutation.isPending}
              className="flex-1"
              size="sm"
              data-testid="button-send-token"
            >
              {sendTokenMutation.isPending ? "Sending..." : "Send Token"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedAuthPrompt(null)}
              disabled={sendTokenMutation.isPending}
              className="flex-1"
              size="sm"
              data-testid="button-cancel-auth"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    <div className="space-y-5 max-w-7xl">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Connect Bots</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage and connect all your bots from a central dashboard</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold">{stats.totalBots}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Connected</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-info">{stats.connected}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Offline</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-muted-foreground">{disconnectedCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">In Club</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-success">{inClubCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Club Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="clubCode" className="text-xs font-semibold">Enter Club Code</Label>
            <Input
              id="clubCode"
              type="text"
              value={clubCode}
              onChange={(e) => setClubCode(e.target.value)}
              placeholder="Enter club code..."
              className="font-mono text-sm h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Import Bots Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh] w-[95vw]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Import Bots</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-w-0 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Bot Data (one per line)</Label>
              <Textarea
                placeholder="Paste bot data: base64_string,ui,gc,name&#10;Example: eyJSSCI6ImpvIiwiUFU...,[ui],[gc],[name]"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                disabled={importBotsMutation.isPending}
                data-testid="textarea-import-bots"
                className="resize-none text-sm font-mono h-32"
              />
              <p className="text-xs text-muted-foreground">Each line should contain: base64_encoded_data,ui,gc,name</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 pt-3 border-t">
            <Button
              onClick={() => {
                const lines = importText.trim().split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                  importBotsMutation.mutate(lines);
                }
              }}
              disabled={!importText.trim() || importBotsMutation.isPending}
              className="flex-1"
              size="sm"
              data-testid="button-import-bots"
            >
              {importBotsMutation.isPending ? "Importing..." : `Import (${importText.trim().split('\n').filter(l => l.trim()).length})`}
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={importBotsMutation.isPending}
              className="flex-1"
              size="sm"
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Bot Password Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Bot: {botToDelete?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the password to confirm deletion. This action cannot be undone.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="delete-password" className="text-xs font-semibold">Password</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deletePassword === 'aa00aa00' && botToDelete) {
                    deleteMutation.mutate(botToDelete.botId);
                    setDeleteModalOpen(false);
                    setDeletePassword("");
                  }
                }}
                disabled={deleteMutation.isPending}
                data-testid="input-delete-password"
                className="h-9"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <Button
              onClick={() => {
                if (deletePassword === 'aa00aa00' && botToDelete) {
                  deleteMutation.mutate(botToDelete.botId);
                  setDeleteModalOpen(false);
                  setDeletePassword("");
                } else {
                  toast({ 
                    title: "Invalid password", 
                    description: "Please enter the correct password",
                    variant: "destructive" 
                  });
                }
              }}
              disabled={!deletePassword.trim() || deleteMutation.isPending || deletePassword !== 'aa00aa00'}
              variant="destructive"
              className="flex-1"
              size="sm"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeletePassword("");
              }}
              disabled={deleteMutation.isPending}
              className="flex-1"
              size="sm"
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
          <Button
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            data-testid="button-import-dialog"
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add Bots</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-xs font-semibold">Search</Label>
              <Input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name or GC..."
                className="text-sm h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filterStatus" className="text-xs font-semibold">Status</Label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All ({stats.totalBots})</option>
                <option value="connected">Connected ({stats.connected})</option>
                <option value="disconnected">Offline ({disconnectedCount})</option>
                <option value="inClub">In Club ({inClubCount})</option>
              </select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Bot List */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-3 space-y-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-info/20 text-info flex-shrink-0">
            <Network className="h-4 w-4" />
          </div>
          <CardTitle className="text-base font-semibold">
            Bots ({filteredBots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBots.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
              {searchTerm || filterStatus !== "all"
                ? "No bots match your filters" 
                : "No bots available"}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredBots.map((bot) => (
                <Card key={bot.botId} className="overflow-hidden shadow-xs">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Bot Info */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0 w-full">
                        <div className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                          bot.inClub ? 'bg-success animate-pulse' : 
                          bot.connected ? 'bg-info' : 
                          'bg-muted-foreground'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{bot.name}</div>
                          <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                            {bot.gc}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs">
                            <span className={`px-2 py-1 rounded-full whitespace-nowrap ${
                              bot.inClub ? 'bg-success/20 text-success' :
                              bot.connected ? 'bg-info/20 text-info' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {bot.inClub ? 'In Club' : bot.connected ? 'Connected' : 'Offline'}
                            </span>
                            
                            {bot.clubCode && (
                              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                                {bot.clubCode}
                              </span>
                            )}
                            
                            {bot.connected && (
                              <span className="text-muted-foreground whitespace-nowrap">
                                {formatUptime(bot.uptime)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-row gap-1.5 flex-shrink-0 w-full sm:w-auto">
                        {!bot.connected ? (
                          <Button
                            size="sm"
                            onClick={() => connectMutation.mutate(bot.botId)}
                            disabled={connectMutation.isPending}
                            className="flex-1 sm:flex-none text-xs h-8 gap-1"
                          >
                            <LinkIcon className="h-3 w-3" />
                            <span className="hidden sm:inline">Connect</span>
                          </Button>
                        ) : (
                          <>
                            {!bot.inClub ? (
                              <Button
                                size="sm"
                                onClick={() => joinMutation.mutate(bot.botId)}
                                disabled={joinMutation.isPending || !clubCode.trim()}
                                className="flex-1 text-xs h-8 gap-1"
                              >
                                <LogIn className="h-3 w-3" />
                                <span className="hidden sm:inline">Join</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => leaveMutation.mutate(bot.botId)}
                                disabled={leaveMutation.isPending}
                                className="flex-1 text-xs h-8 gap-1"
                              >
                                <LogOut className="h-3 w-3" />
                                <span className="hidden sm:inline">Leave</span>
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => disconnectMutation.mutate(bot.botId)}
                              disabled={disconnectMutation.isPending}
                              className="flex-1 text-xs h-8 gap-1"
                            >
                              <Power className="h-3 w-3" />
                              <span className="hidden sm:inline">Disconnect</span>
                            </Button>
                          </>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBotToDelete({ botId: bot.botId, name: bot.name });
                            setDeleteModalOpen(true);
                            setDeletePassword("");
                          }}
                          disabled={deleteMutation.isPending}
                          className="flex-1 sm:flex-none text-xs h-8 text-destructive hover:text-destructive"
                          data-testid={`button-delete-bot-${bot.botId}`}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}