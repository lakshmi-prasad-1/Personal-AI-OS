"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Clock, Tag } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Idea {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  raw: "bg-blue-500/10 text-blue-400",
  exploring: "bg-purple-500/10 text-purple-400",
  validated: "bg-green-500/10 text-green-400",
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);

  useEffect(() => {
    apiFetch<Idea[]>("/ideas/").then(setIdeas).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Idea Vault</h1>
        <p className="text-gray-400">Ideas connected to your knowledge graph.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ideas.length === 0 ? (
          <p className="text-gray-500 col-span-2">No ideas captured yet.</p>
        ) : (
          ideas.map((idea) => (
            <div key={idea.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3 hover:border-yellow-500/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400 shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <h2 className="font-semibold text-gray-100">{idea.title}</h2>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[idea.status] || "bg-gray-800 text-gray-400"}`}>
                  {idea.status}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed pl-10">{idea.content}</p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-800 pl-10">
                <div className="flex flex-wrap gap-2">
                  {idea.tags?.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full">
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  {new Date(idea.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
