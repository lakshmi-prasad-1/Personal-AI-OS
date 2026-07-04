import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect } from "react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Notes from "@/pages/notes";
import Ideas from "@/pages/ideas";
import Memories from "@/pages/memories";
import Resources from "@/pages/resources";
import Graph from "@/pages/graph";
import Chat from "@/pages/chat";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, path }: { component: any, path: string }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return <Route path={path} component={Component} />;
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/login" component={Login} />
        <ProtectedRoute path="/" component={Chat} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/notes" component={Notes} />
        <ProtectedRoute path="/ideas" component={Ideas} />
        <ProtectedRoute path="/memories" component={Memories} />
        <ProtectedRoute path="/resources" component={Resources} />
        <ProtectedRoute path="/graph" component={Graph} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
