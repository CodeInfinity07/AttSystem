import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MessagesResponse {
  success: boolean;
  messages: string[];
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [messagesText, setMessagesText] = useState("");

  const { data: messagesResponse, isLoading } = useQuery<MessagesResponse>({
    queryKey: ['/api/settings/messages'],
    queryFn: () => apiRequest('GET', '/api/settings/messages').then(r => r.json()),
  });

  // Update local state when data loads
  if (messagesResponse?.messages !== undefined && !messagesText) {
    setMessagesText(messagesResponse.messages.join('\n'));
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const messages = messagesText
        .split('\n')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      if (messages.length === 0) {
        throw new Error('Please enter at least one message');
      }

      return apiRequest('POST', '/api/settings/messages', { messages });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/messages'] });
      toast({ title: "Messages saved successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save messages",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure bot messages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Message Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="messages">Messages</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Enter one message per line. Bots will randomly pick from these messages to send.
            </p>
            <Textarea
              id="messages"
              data-testid="textarea-messages"
              placeholder="Enter messages, one per line&#10;Example message 1&#10;Example message 2&#10;Example message 3"
              value={messagesText}
              onChange={(e) => setMessagesText(e.target.value)}
              disabled={saveMutation.isPending}
              className="min-h-48 font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {messagesText
                .split('\n')
                .map(m => m.trim())
                .filter(m => m.length > 0).length} message(s) configured
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isLoading}
              className="gap-2"
              data-testid="button-save-messages"
            >
              <Save className="h-4 w-4" />
              Save Messages
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
