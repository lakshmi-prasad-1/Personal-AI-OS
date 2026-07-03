"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Clock, Tag } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Memory {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  created_at: string;
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Memory[]>("/memory/")
      .then(setMemories)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Memories</h1>
        <p className="text-gray-400">Auto-extracted and manual long-term knowledge.</p>
      </header>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : memories.length === 0 ? (
        <p className="text-gray-500">No memories yet. Chat with the assistant to auto-extract memories.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem) => (
            <div key={mem.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3 hover:border-blue-500/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0 mt-0.5">
                  <BrainCircuit size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-100">{mem.title}</p>
                  <p className="text-sm leading-relaxed text-gray-400 mt-1">{mem.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full">{mem.category}</span>
                  {mem.tags?.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full">
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} />
                  {new Date(mem.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
