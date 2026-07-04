import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  StickyNote,
  Lightbulb,
  Brain,
  Files,
  Network,
  MessageSquare,
  LogOut,
  CheckSquare,
  Target,
  Flame,
  Timer,
  Bell,
  CalendarDays,
  BarChart3,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Layers,
  HelpCircle,
  RefreshCcw,
  Briefcase,
  FileText,
  Star,
  FolderGit2,
  Mic,
  ClipboardList,
  Building2,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";

interface NavItem { href: string; label: string; icon: React.ElementType; }
interface NavGroup { label: string; items: NavItem[]; defaultOpen?: boolean; }

const NAV_STRUCTURE: NavGroup[] = [
  {
    label: "Main",
    defaultOpen: true,
    items: [
      { href: "/", label: "Chat", icon: MessageSquare },
      { href: "/dashboard", label: "Today's Brain", icon: LayoutDashboard },
    ],
  },
  {
    label: "Productivity",
    defaultOpen: true,
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/habits", label: "Habits", icon: Flame },
      { href: "/focus", label: "Focus Mode", icon: Timer },
      { href: "/reminders", label: "Reminders", icon: Bell },
      { href: "/planner", label: "Planner", icon: CalendarDays },
      { href: "/reviews", label: "Reviews", icon: BarChart3 },
    ],
  },
  {
    label: "Study OS",
    defaultOpen: true,
    items: [
      { href: "/study-profile", label: "Study Profile", icon: GraduationCap },
      { href: "/subjects", label: "Subjects", icon: BookOpen },
      { href: "/flashcards", label: "Flashcards", icon: Layers },
      { href: "/quizzes", label: "Quizzes", icon: HelpCircle },
      { href: "/revision", label: "Revision", icon: RefreshCcw },
    ],
  },
  {
    label: "Career OS",
    defaultOpen: true,
    items: [
      { href: "/career", label: "Career Dashboard", icon: Briefcase },
      { href: "/resumes", label: "Resumes", icon: FileText },
      { href: "/skills", label: "Skills", icon: Star },
      { href: "/career-projects", label: "Projects", icon: FolderGit2 },
      { href: "/career-goals", label: "Career Goals", icon: Trophy },
      { href: "/interview", label: "Interview Prep", icon: Mic },
      { href: "/applications", label: "Applications", icon: ClipboardList },
      { href: "/companies", label: "Companies", icon: Building2 },
    ],
  },
  {
    label: "Knowledge",
    defaultOpen: false,
    items: [
      { href: "/notes", label: "Notes", icon: StickyNote },
      { href: "/ideas", label: "Ideas", icon: Lightbulb },
      { href: "/memories", label: "Memories", icon: Brain },
      { href: "/resources", label: "Resources", icon: Files },
      { href: "/graph", label: "Knowledge Graph", icon: Network },
    ],
  },
];

function NavSection({ group, location }: { group: NavGroup; location: string }) {
  const [open, setOpen] = useState(group.defaultOpen ?? true);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <span>{group.label}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {group.items.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    if (error) logout();
  }, [error, logout]);

  if (!isAuthenticated) return <>{children}</>;

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground selection:bg-primary/20">
      <nav className="w-60 border-r border-border bg-sidebar shrink-0 flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-semibold tracking-tight">Brain OS</span>
          </div>
        </div>
        <div className="px-3 pt-3">
          <GlobalSearch />
        </div>
        <div className="flex-1 py-3 px-2 flex flex-col gap-4 overflow-y-auto">
          {NAV_STRUCTURE.map((group) => (
            <NavSection key={group.label} group={group} location={location} />
          ))}
        </div>
        <div className="p-3 border-t border-border flex items-center justify-between">
          <div className="text-xs font-medium truncate text-muted-foreground min-w-0 pr-1">
            {user?.email ?? "Loading…"}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={logout} title="Log out">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </nav>
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
