import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  StickyNote, 
  Lightbulb, 
  Brain, 
  Files, 
  Network, 
  MessageSquare,
  LogOut
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/memories", label: "Memories", icon: Brain },
  { href: "/resources", label: "Resources", icon: Files },
  { href: "/graph", label: "Knowledge Graph", icon: Network },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, isAuthenticated } = useAuth();
  
  const { data: user, error } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey(),
      enabled: isAuthenticated,
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error, logout]);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground selection:bg-primary/20">
      <nav className="w-64 border-r border-border bg-sidebar shrink-0 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <span className="font-semibold tracking-tight text-lg">Brain OS</span>
          </div>
        </div>
        <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm font-medium truncate text-muted-foreground">
            {user?.email || "Loading..."}
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Log out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
