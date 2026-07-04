import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGraph,
  useCreateGraphNode,
  useCreateGraphEdge,
  getGetGraphQueryKey,
} from "@workspace/api-client-react";
import { Network, Plus, X, Check, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const NODE_COLORS: Record<string, string> = {
  note: "hsl(var(--chart-1, 210 80% 60%))",
  idea: "hsl(var(--chart-2, 40 90% 60%))",
  memory: "hsl(var(--chart-3, 280 70% 65%))",
  resource: "hsl(var(--chart-4, 160 60% 50%))",
};

function nodeColor(entityType: string) {
  return NODE_COLORS[entityType] || "hsl(var(--primary))";
}

function layoutNodes(nodes: { id: string }[], width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 60;
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    positions[node.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
  return positions;
}

export default function Graph() {
  const { data, isLoading } = useGetGraph();
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showEdgeForm, setShowEdgeForm] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];

  const width = 800;
  const height = 560;
  const positions = useMemo(() => layoutNodes(nodes, width, height), [nodes]);

  return (
    <div className="h-full flex flex-col md:flex-row bg-background">
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            Knowledge Graph
          </h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowEdgeForm(true)} data-testid="button-create-edge">
              <GitBranch className="w-4 h-4 mr-1" /> Link
            </Button>
            <Button size="sm" onClick={() => setShowNodeForm(true)} data-testid="button-create-node">
              <Plus className="w-4 h-4 mr-1" /> Node
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Mapping your knowledge...</div>
          ) : nodes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg bg-muted/50 px-12">
              No graph nodes yet. Create one to start mapping your knowledge.
            </div>
          ) : (
            <svg width={width} height={height} className="max-w-full animate-in fade-in zoom-in-95 duration-500">
              {edges.map((edge) => {
                const from = positions[edge.sourceNodeId];
                const to = positions[edge.targetNodeId];
                if (!from || !to) return null;
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                return (
                  <g key={edge.id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="hsl(var(--border))"
                      strokeWidth={Math.max(1, Math.min(edge.weight, 5))}
                      data-testid={`edge-${edge.id}`}
                    />
                    <text
                      x={midX}
                      y={midY}
                      fontSize={10}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                    >
                      {edge.relationshipType}
                    </text>
                  </g>
                );
              })}
              {nodes.map((node, i) => {
                const pos = positions[node.id];
                if (!pos) return null;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer animate-in fade-in zoom-in-50"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => setSelectedNodeId(node.id)}
                    data-testid={`node-${node.id}`}
                  >
                    <circle
                      r={selectedNodeId === node.id ? 26 : 22}
                      fill={nodeColor(node.entityType)}
                      opacity={selectedNodeId === node.id ? 1 : 0.85}
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                    />
                    <text textAnchor="middle" dy={4} fontSize={11} fill="white" fontWeight={600}>
                      {node.label.slice(0, 2).toUpperCase()}
                    </text>
                    <text textAnchor="middle" dy={40} fontSize={11} className="fill-foreground">
                      {node.label.length > 16 ? `${node.label.slice(0, 16)}...` : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {(showNodeForm || showEdgeForm) && (
        <div className="w-full md:w-96 border-l border-border h-full bg-muted/20 animate-in fade-in slide-in-from-right-4 duration-300">
          {showNodeForm && (
            <NodeForm onClose={() => setShowNodeForm(false)} />
          )}
          {showEdgeForm && (
            <EdgeForm nodes={nodes} onClose={() => setShowEdgeForm(false)} />
          )}
        </div>
      )}
    </div>
  );
}

function NodeForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [entityType, setEntityType] = useState("note");
  const [entityId, setEntityId] = useState("");
  const [label, setLabel] = useState("");

  const createNode = useCreateGraphNode();

  const handleSave = () => {
    if (!label.trim()) {
      toast({ title: "Label is required", variant: "destructive" });
      return;
    }
    createNode.mutate(
      { data: { entityType, entityId: entityId || crypto.randomUUID(), label } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGraphQueryKey() });
          toast({ title: "Node created" });
          onClose();
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">New Node</h2>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-cancel-node">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Label</label>
        <Input
          placeholder="e.g. React Roadmap"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          data-testid="input-node-label"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Entity type</label>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger data-testid="select-node-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="idea">Idea</SelectItem>
            <SelectItem value="memory">Memory</SelectItem>
            <SelectItem value="resource">Resource</SelectItem>
            <SelectItem value="concept">Concept</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button className="w-full" onClick={handleSave} disabled={createNode.isPending} data-testid="button-save-node">
        <Check className="w-4 h-4 mr-2" /> Create Node
      </Button>
    </div>
  );
}

function EdgeForm({ nodes, onClose }: { nodes: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [sourceNodeId, setSourceNodeId] = useState("");
  const [targetNodeId, setTargetNodeId] = useState("");
  const [relationshipType, setRelationshipType] = useState("relates_to");
  const [weight, setWeight] = useState("1");

  const createEdge = useCreateGraphEdge();

  const handleSave = () => {
    if (!sourceNodeId || !targetNodeId) {
      toast({ title: "Select both nodes", variant: "destructive" });
      return;
    }
    createEdge.mutate(
      {
        data: {
          sourceNodeId,
          targetNodeId,
          relationshipType,
          weight: Number(weight) || 1,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGraphQueryKey() });
          toast({ title: "Edge created" });
          onClose();
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">New Link</h2>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-cancel-edge">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">From</label>
        <Select value={sourceNodeId} onValueChange={setSourceNodeId}>
          <SelectTrigger data-testid="select-edge-source">
            <SelectValue placeholder="Select a node" />
          </SelectTrigger>
          <SelectContent>
            {nodes.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">To</label>
        <Select value={targetNodeId} onValueChange={setTargetNodeId}>
          <SelectTrigger data-testid="select-edge-target">
            <SelectValue placeholder="Select a node" />
          </SelectTrigger>
          <SelectContent>
            {nodes.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Relationship</label>
        <Input
          placeholder="e.g. relates_to, depends_on"
          value={relationshipType}
          onChange={(e) => setRelationshipType(e.target.value)}
          data-testid="input-edge-relationship"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Weight</label>
        <Input
          type="number"
          min="1"
          max="5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          data-testid="input-edge-weight"
        />
      </div>

      <Button className="w-full" onClick={handleSave} disabled={createEdge.isPending} data-testid="button-save-edge">
        <Check className="w-4 h-4 mr-2" /> Create Link
      </Button>
    </div>
  );
}
