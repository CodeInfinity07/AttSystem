import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import MessagesPage from "@/pages/messages";
import NameChangePage from "@/pages/name-change";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import BotManagementPage from "@/pages/botManagementPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={BotManagementPage} />
      <Route path="/bot-management" component={BotManagementPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/name-change" component={NameChangePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-3 sm:p-4 border-b shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
              </header>
              <main className="flex-1 overflow-auto p-4 sm:p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
