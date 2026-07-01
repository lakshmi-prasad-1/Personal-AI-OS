"use client";

import { useEffect, useState } from "react";
import { FileText, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Resource {
  id: string;
  title: string;
  category: string;
  is_processed: boolean;
  ai_summary?: string;
  created_at: string;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    apiFetch<Resource[]>("/resources/").then(setResources).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Resources</h1>
        <p className="text-gray-400">Documents ingested and connected to the knowledge graph.</p>
      </header>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="px-6 py-4 font-medium">Resource</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {resources.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No resources uploaded yet.</td>
              </tr>
            ) : (
              resources.map((res) => (
                <tr key={res.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="p-2 rounded-lg text-orange-400 bg-orange-500/10">
                        <FileText size={20} />
                      </span>
                      <div>
                        <span className="font-medium text-gray-100">{res.title}</span>
                        {res.ai_summary && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{res.ai_summary}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{res.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      res.is_processed ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {res.is_processed ? "Processed" : "Processing"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(res.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
