"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  BrainCircuit,
  FolderClosed,
  Lightbulb,
  Network,
  Search,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Memories", href: "/memories", icon: BrainCircuit },
    { name: "Resources", href: "/resources", icon: FolderClosed },
    { name: "Smart Notes", href: "/notes", icon: Search },
    { name: "Idea Vault", href: "/ideas", icon: Lightbulb },
    { name: "Knowledge Graph", href: "/graph", icon: Network },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-gray-900 text-gray-100 flex flex-col h-screen border-r border-gray-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <BrainCircuit className="text-blue-500" />
          AI Brain OS
        </h1>
        <p className="text-xs text-gray-500 mt-1">Core V2</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? "bg-gray-800 text-white" : "hover:bg-gray-800 hover:text-white text-gray-300"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
            <User size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.email?.split("@")[0] || "User"}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
