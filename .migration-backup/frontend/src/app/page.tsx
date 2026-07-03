"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Search, Database, Network, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Decision {
  rule: string;
  action: string;
  reason: string;
  priority: string;
}

export default function Home() {
  const [stats, setStats] = useState({ memories: 0, resources: 0, notes: 0, edges: 0 });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ title: string; type: string }[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<unknown[]>("/memory/").catch(() => []),
      apiFetch<unknown[]>("/resources/").catch(() => []),
      apiFetch<unknown[]>("/notes/").catch(() => []),
      apiFetch<{ nodes: unknown[]; edges: unknown[] }>("/graph/").catch(() => ({ nodes: [], edges: [] })),
      apiFetch<{ decisions: Decision[] }>("/brain/decide", { method: "POST", body: JSON.stringify({}) }).catch(() => ({ decisions: [] })),
    ]).then(([memories, resources, notes, graph, decide]) => {
      setStats({
        memories: memories.length,
        resources: resources.length,
        notes: notes.length,
        edges: graph.edges?.length || 0,
      });
      setDecisions(decide.decisions?.slice(0, 3) || []);
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const res = await apiFetch<{ results: { title: string; type: string }[] }>("/brain/search", {
      method: "POST",
      body: JSON.stringify({ query: searchQuery, limit: 5 }),
    });
    setSearchResults(res.results || []);
  };

  const cards = [
    { label: "Memories", value: stats.memories, icon: BrainCircuit, border: "hover:border-blue-500/50", iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    { label: "Resources", value: stats.resources, icon: Database, border: "hover:border-purple-500/50", iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    { label: "Smart Notes", value: stats.notes, icon: Search, border: "hover:border-green-500/50", iconBg: "bg-green-500/10", iconColor: "text-green-500" },
    { label: "Graph Edges", value: stats.edges, icon: Network, border: "hover:border-orange-500/50", iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">System Overview</h1>
        <p className="text-gray-400">AI Brain Core V2 — reasoning system online.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, border, iconBg, iconColor }) => (
          <div key={label} className={`bg-gray-900 border border-gray-800 p-6 rounded-xl ${border} transition-colors`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 ${iconBg} rounded-lg ${iconColor}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">{label}</p>
                <h2 className="text-2xl font-bold">{value}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-2 bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap size={20} className="text-yellow-400" />
            Proactive Decisions
          </h3>
          <div className="space-y-4">
            {decisions.length === 0 ? (
              <p className="text-gray-500 text-sm">No decisions yet. Add profile data and memories to activate the Decision Engine.</p>
            ) : (
              decisions.map((d) => (
                <div key={d.rule} className="py-3 border-b border-gray-800 last:border-0">
                  <p className="font-medium">{d.reason}</p>
                  <p className="text-sm text-gray-400">{d.action} · {d.priority} priority</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">Universal Search</h3>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ask your second brain..."
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            {searchResults.map((r, i) => (
              <div key={i} className="text-sm py-2 border-b border-gray-800">
                <span className="text-blue-400 text-xs">{r.type}</span>
                <p>{r.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
