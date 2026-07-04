import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListIdeas, 
  useCreateIdea, 
  useUpdateIdea, 
  useDeleteIdea, 
  getListIdeasQueryKey 
} from "@workspace/api-client-react";
import { Lightbulb, Plus, Trash2, Tag, Check, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Ideas() {
  const { data: ideas, isLoading } = useListIdeas();
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  const selectedIdea = ideas?.find(n => n.id === selectedIdeaId);
  const activeIdea = isCreating ? null : selectedIdea;

  const filteredIdeas = useMemo(() => {
    return (ideas || []).filter(idea => {
      if (statusFilter !== "ALL" && idea.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && idea.priority !== priorityFilter) return false;
      return true;
    }).sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [ideas, statusFilter, priorityFilter]);

  return (
    <div className="h-full flex flex-col md:flex-row bg-background">
      <div className="w-full md:w-1/3 border-r border-border h-full flex flex-col">
        <div className="p-4 border-b border-border bg-card/50 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Ideas
            </h1>
            <Button size="sm" onClick={() => { setIsCreating(true); setSelectedIdeaId(null); }} data-testid="button-create-idea">
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>
          <div className="flex gap-2">
             <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-filter-priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading ideas...</div>
          ) : filteredIdeas.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg bg-muted/50">
              No ideas found.
            </div>
          ) : (
            filteredIdeas.map(idea => (
              <Card 
                key={idea.id} 
                className={`cursor-pointer transition-all hover:border-primary/50 ${selectedIdeaId === idea.id && !isCreating ? 'border-primary ring-1 ring-primary/20' : ''}`}
                onClick={() => { setSelectedIdeaId(idea.id); setIsCreating(false); }}
                data-testid={`card-idea-${idea.id}`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base pr-2 line-clamp-1">{idea.title}</CardTitle>
                    <Badge variant={idea.priority === 'HIGH' ? 'destructive' : idea.priority === 'MEDIUM' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 shrink-0">
                      {idea.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{idea.content || "Empty idea"}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">{idea.status}</Badge>
                  {idea.category && <span className="text-[10px] text-muted-foreground">{idea.category}</span>}
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
      
      <div className="flex-1 h-full flex flex-col bg-muted/20">
        {(isCreating || activeIdea) ? (
          <IdeaEditor 
            idea={activeIdea} 
            onClose={() => { setIsCreating(false); setSelectedIdeaId(null); }} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <Lightbulb className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-medium text-foreground mb-2">Select an idea</h2>
            <p>Choose an idea from the list or sow a new seed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function IdeaEditor({ idea, onClose }: { idea: any | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [title, setTitle] = useState(idea?.title || "");
  const [content, setContent] = useState(idea?.content || "");
  const [category, setCategory] = useState(idea?.category || "");
  const [tagsInput, setTagsInput] = useState(idea?.tags?.join(", ") || "");
  const [status, setStatus] = useState(idea?.status || "DRAFT");
  const [priority, setPriority] = useState(idea?.priority || "MEDIUM");

  const createIdea = useCreateIdea();
  const updateIdea = useUpdateIdea();
  const deleteIdea = useDeleteIdea();

  // Reset form when idea changes
  useState(() => {
    if (idea) {
      setTitle(idea.title);
      setContent(idea.content || "");
      setCategory(idea.category || "");
      setTagsInput(idea.tags?.join(", ") || "");
      setStatus(idea.status);
      setPriority(idea.priority);
    } else {
      setTitle("");
      setContent("");
      setCategory("");
      setTagsInput("");
      setStatus("DRAFT");
      setPriority("MEDIUM");
    }
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    const tags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
    const data = { title, content, category, tags, status, priority };

    if (idea) {
      updateIdea.mutate({ id: idea.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
          toast({ title: "Idea updated" });
        }
      });
    } else {
      createIdea.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
          toast({ title: "Idea created" });
          onClose();
        }
      });
    }
  };

  const handleDelete = () => {
    if (idea) {
      deleteIdea.mutate({ id: idea.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIdeasQueryKey() });
          toast({ title: "Idea deleted" });
          onClose();
        }
      });
    }
  };

  const isPending = createIdea.isPending || updateIdea.isPending || deleteIdea.isPending;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-semibold">{idea ? "Edit Idea" : "New Idea"}</h2>
        <div className="flex items-center gap-2">
          {idea && (
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={isPending} className="text-destructive hover:bg-destructive/10" data-testid="button-delete-idea">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending} data-testid="button-cancel-idea">
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} data-testid="button-save-idea">
            <Check className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
        <Input 
          placeholder="Idea Title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className="text-xl font-medium px-4 py-6"
          data-testid="input-idea-title"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-idea-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IMPLEMENTED">Implemented</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
             <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger data-testid="select-idea-priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
           <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Input 
              placeholder="e.g. Product, Marketing" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              data-testid="input-idea-category"
            />
          </div>
          <div className="flex-1 space-y-2">
             <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3"/> Tags</label>
            <Input 
              placeholder="Comma separated" 
              value={tagsInput} 
              onChange={(e) => setTagsInput(e.target.value)} 
              data-testid="input-idea-tags"
            />
          </div>
        </div>

        <div className="flex-1 min-h-[300px] flex flex-col space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea 
            placeholder="Flesh out your idea here..." 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            className="flex-1 resize-none font-sans text-sm leading-relaxed p-4"
            data-testid="input-idea-content"
          />
        </div>
      </div>
    </div>
  );
}
