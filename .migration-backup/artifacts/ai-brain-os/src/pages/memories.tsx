import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListMemories, 
  useCreateMemory, 
  useUpdateMemory, 
  useDeleteMemory, 
  getListMemoriesQueryKey 
} from "@workspace/api-client-react";
import { Brain, Plus, Trash2, Tag, Check, X, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

export default function Memories() {
  const { data: memories, isLoading } = useListMemories();
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const selectedMemory = memories?.find(n => n.id === selectedMemoryId);
  const activeMemory = isCreating ? null : selectedMemory;

  const sortedMemories = [...(memories || [])].sort((a, b) => {
    if (a.isArchived && !b.isArchived) return 1;
    if (!a.isArchived && b.isArchived) return -1;
    return b.importanceScore - a.importanceScore;
  });

  return (
    <div className="h-full flex flex-col md:flex-row bg-background">
      <div className="w-full md:w-1/3 border-r border-border h-full flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Memories
          </h1>
          <Button size="sm" onClick={() => { setIsCreating(true); setSelectedMemoryId(null); }} data-testid="button-create-memory">
            <Plus className="w-4 h-4 mr-1" /> Record
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Recalling...</div>
          ) : sortedMemories.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg bg-muted/50">
              No memories recorded.
            </div>
          ) : (
            sortedMemories.map(memory => (
              <Card 
                key={memory.id} 
                className={`cursor-pointer transition-all hover:border-primary/50 ${memory.isArchived ? 'opacity-60' : ''} ${selectedMemoryId === memory.id && !isCreating ? 'border-primary ring-1 ring-primary/20' : ''}`}
                onClick={() => { setSelectedMemoryId(memory.id); setIsCreating(false); }}
                data-testid={`card-memory-${memory.id}`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className={`text-base pr-2 line-clamp-1 ${memory.isArchived ? 'line-through text-muted-foreground' : ''}`}>{memory.title}</CardTitle>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-12 bg-muted rounded-full overflow-hidden" title={`Importance: ${memory.importanceScore}`}>
                        <div className="h-full bg-primary" style={{ width: `${memory.importanceScore}%` }}></div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{memory.description || "Empty memory"}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      
      <div className="flex-1 h-full flex flex-col bg-muted/20">
        {(isCreating || activeMemory) ? (
          <MemoryEditor 
            memory={activeMemory} 
            onClose={() => { setIsCreating(false); setSelectedMemoryId(null); }} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <Brain className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-medium text-foreground mb-2">Select a memory</h2>
            <p>Review past experiences or record a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryEditor({ memory, onClose }: { memory: any | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [title, setTitle] = useState(memory?.title || "");
  const [description, setDescription] = useState(memory?.description || "");
  const [category, setCategory] = useState(memory?.category || "");
  const [tagsInput, setTagsInput] = useState(memory?.tags?.join(", ") || "");
  const [importanceScore, setImportanceScore] = useState<number>(memory?.importanceScore || 50);
  const [confidenceScore, setConfidenceScore] = useState<number>(memory?.confidenceScore || 80);
  const [isArchived, setIsArchived] = useState(memory?.isArchived || false);

  const createMemory = useCreateMemory();
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  // Reset form when memory changes
  useState(() => {
    if (memory) {
      setTitle(memory.title);
      setDescription(memory.description || "");
      setCategory(memory.category || "");
      setTagsInput(memory.tags?.join(", ") || "");
      setImportanceScore(memory.importanceScore);
      setConfidenceScore(memory.confidenceScore);
      setIsArchived(memory.isArchived);
    } else {
      setTitle("");
      setDescription("");
      setCategory("");
      setTagsInput("");
      setImportanceScore(50);
      setConfidenceScore(80);
      setIsArchived(false);
    }
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    const tags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
    const data = { title, description, category, tags, importanceScore, confidenceScore, isArchived };

    if (memory) {
      updateMemory.mutate({ id: memory.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
          toast({ title: "Memory updated" });
        }
      });
    } else {
      createMemory.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
          toast({ title: "Memory recorded" });
          onClose();
        }
      });
    }
  };

  const handleDelete = () => {
    if (memory) {
      deleteMemory.mutate({ id: memory.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
          toast({ title: "Memory erased" });
          onClose();
        }
      });
    }
  };

  const toggleArchive = () => {
     setIsArchived(!isArchived);
  };

  const isPending = createMemory.isPending || updateMemory.isPending || deleteMemory.isPending;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-semibold">{memory ? "Edit Memory" : "Record Memory"}</h2>
        <div className="flex items-center gap-2">
          {memory && (
             <Button variant="outline" size="sm" onClick={toggleArchive} disabled={isPending} data-testid="button-archive-memory">
              {isArchived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
              {isArchived ? "Unarchive" : "Archive"}
            </Button>
          )}
          {memory && (
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={isPending} className="text-destructive hover:bg-destructive/10" data-testid="button-delete-memory">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending} data-testid="button-cancel-memory">
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} data-testid="button-save-memory">
            <Check className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
        <Input 
          placeholder="Memory Title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className="text-xl font-medium px-4 py-6"
          data-testid="input-memory-title"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
          <div className="space-y-4">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-muted-foreground">Importance</label>
              <span className="text-sm font-medium">{importanceScore}</span>
            </div>
            <Slider 
              value={[importanceScore]} 
              max={100} 
              step={1} 
              onValueChange={([val]) => setImportanceScore(val)} 
              data-testid="slider-memory-importance"
            />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-muted-foreground">Confidence</label>
              <span className="text-sm font-medium">{confidenceScore}</span>
            </div>
            <Slider 
              value={[confidenceScore]} 
              max={100} 
              step={1} 
              onValueChange={([val]) => setConfidenceScore(val)} 
              data-testid="slider-memory-confidence"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
           <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Input 
              placeholder="e.g. Personal, Work, Fact" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              data-testid="input-memory-category"
            />
          </div>
          <div className="flex-1 space-y-2">
             <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3"/> Tags</label>
            <Input 
              placeholder="Comma separated" 
              value={tagsInput} 
              onChange={(e) => setTagsInput(e.target.value)} 
              data-testid="input-memory-tags"
            />
          </div>
        </div>

        <div className="flex-1 min-h-[300px] flex flex-col space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea 
            placeholder="Record the details of this memory..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className="flex-1 resize-none font-sans text-sm leading-relaxed p-4"
            data-testid="input-memory-description"
          />
        </div>
      </div>
    </div>
  );
}
