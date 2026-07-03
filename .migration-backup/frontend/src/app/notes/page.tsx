"use client";

import { useEffect, useState } from "react";
import { FileText, Clock, Tag } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    apiFetch<Note[]>("/notes/").then(setNotes).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Smart Notes</h1>
        <p className="text-gray-400">Semantically searchable notes linked to the knowledge graph.</p>
      </header>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-gray-500">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3 hover:border-purple-500/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-100">{note.title}</h2>
                  <p className="text-sm text-gray-400 mt-1 leading-relaxed line-clamp-3">{note.content}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                {note.tags?.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full">
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
                <span className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                  <Clock size={12} />
                  {new Date(note.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
