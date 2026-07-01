"use client";

import { useEffect, useState } from "react";
import { Network, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface GraphNode {
  id: string;
  label: string;
  entity_type: string;
}

interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  useEffect(() => {
    apiFetch<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/graph/")
      .then((data) => {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      })
      .catch(console.error);
  }, []);

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const typeColors: Record<string, string> = {
    Memory: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Resource: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Note: "bg-green-500/10 text-green-400 border-green-500/20",
    Idea: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    Skill: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Knowledge Graph</h1>
        <p className="text-gray-400">
          Auto-growing graph — {nodes.length} nodes, {edges.length} edges.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Network size={18} className="text-orange-400" />
            Nodes
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {nodes.length === 0 ? (
              <p className="text-gray-500 text-sm">Graph builds automatically when you create memories, notes, and resources.</p>
            ) : (
              nodes.map((node) => (
                <div
                  key={node.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${typeColors[node.entity_type] || "bg-gray-800 border-gray-700"}`}
                >
                  <span className="font-medium text-sm">{node.label}</span>
                  <span className="text-xs opacity-70">{node.entity_type}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Relationships</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {edges.length === 0 ? (
              <p className="text-gray-500 text-sm">No edges yet.</p>
            ) : (
              edges.map((edge) => (
                <div key={edge.id} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="font-medium">{nodeMap[edge.source_node_id]?.label || "?"}</span>
                  <ArrowRight size={14} className="text-gray-500 shrink-0" />
                  <span className="text-orange-400 text-xs">{edge.relationship_type}</span>
                  <ArrowRight size={14} className="text-gray-500 shrink-0" />
                  <span className="font-medium">{nodeMap[edge.target_node_id]?.label || "?"}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
