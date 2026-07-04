import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListResources,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  getListResourcesQueryKey,
} from "@workspace/api-client-react";
import { Files, Plus, Trash2, Check, X, FileCheck2, FileClock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Resources() {
  const { data: resources, isLoading } = useListResources();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selected = resources?.find((r) => r.id === selectedId);
  const active = isCreating ? null : selected;

  const sorted = [...(resources || [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-background">
      <div className="w-full md:w-1/3 border-r border-border h-full flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Files className="w-5 h-5 text-primary" />
            Resources
          </h1>
          <Button
            size="sm"
            onClick={() => {
              setIsCreating(true);
              setSelectedId(null);
            }}
            data-testid="button-create-resource"
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading resources...</div>
          ) : sorted.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg bg-muted/50">
              No resources yet. Save your first!
            </div>
          ) : (
            sorted.map((resource, i) => (
              <Card
                key={resource.id}
                className={`cursor-pointer transition-all hover:border-primary/50 animate-in fade-in slide-in-from-bottom-2 ${
                  selectedId === resource.id && !isCreating ? "border-primary ring-1 ring-primary/20" : ""
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => {
                  setSelectedId(resource.id);
                  setIsCreating(false);
                }}
                data-testid={`card-resource-${resource.id}`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base truncate pr-2">{resource.title}</CardTitle>
                    {resource.isProcessed ? (
                      <FileCheck2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <FileClock className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-3 space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {resource.aiSummary || resource.description || "No description"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {resource.category}
                    </Badge>
                    {resource.fileName && (
                      <span className="text-[11px] text-muted-foreground truncate">{resource.fileName}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 h-full flex flex-col bg-muted/20">
        {isCreating || active ? (
          <ResourceEditor
            resource={active}
            onClose={() => {
              setIsCreating(false);
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <Files className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-medium text-foreground mb-2">Select a resource</h2>
            <p>Choose a resource from the list or add a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceEditor({ resource, onClose }: { resource: any | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState(resource?.title || "");
  const [category, setCategory] = useState(resource?.category || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [fileName, setFileName] = useState(resource?.fileName || "");
  const [isProcessed, setIsProcessed] = useState(resource?.isProcessed || false);
  const [aiSummary, setAiSummary] = useState(resource?.aiSummary || "");

  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();

  useState(() => {
    if (resource) {
      setTitle(resource.title);
      setCategory(resource.category || "");
      setDescription(resource.description || "");
      setFileName(resource.fileName || "");
      setIsProcessed(resource.isProcessed);
      setAiSummary(resource.aiSummary || "");
    } else {
      setTitle("");
      setCategory("");
      setDescription("");
      setFileName("");
      setIsProcessed(false);
      setAiSummary("");
    }
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    if (resource) {
      updateResource.mutate(
        { id: resource.id, data: { title, category, description, isProcessed, aiSummary } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
            toast({ title: "Resource updated" });
          },
        },
      );
    } else {
      createResource.mutate(
        { data: { title, category: category || "general", description, fileName } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
            toast({ title: "Resource saved" });
            onClose();
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (resource) {
      deleteResource.mutate(
        { id: resource.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
            toast({ title: "Resource deleted" });
            onClose();
          },
        },
      );
    }
  };

  const isPending = createResource.isPending || updateResource.isPending || deleteResource.isPending;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-semibold">{resource ? "Edit Resource" : "Save Resource"}</h2>
        <div className="flex items-center gap-2">
          {resource && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive hover:bg-destructive/10"
              data-testid="button-delete-resource"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending} data-testid="button-cancel-resource">
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} data-testid="button-save-resource">
            <Check className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
        <Input
          placeholder="Resource Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-medium px-4 py-6"
          data-testid="input-resource-title"
        />

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <Input
              placeholder="e.g. Article, Video, PDF"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="input-resource-category"
            />
          </div>
          {!resource && (
            <div className="flex-1 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">File name / link</label>
              <Input
                placeholder="optional"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                data-testid="input-resource-filename"
              />
            </div>
          )}
        </div>

        {resource && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="processed"
              checked={isProcessed}
              onCheckedChange={(checked) => setIsProcessed(!!checked)}
              data-testid="checkbox-resource-processed"
            />
            <label htmlFor="processed" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Processed
            </label>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea
            placeholder="What is this resource about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none min-h-[100px] p-4"
            data-testid="input-resource-description"
          />
        </div>

        {resource && (
          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Summary
            </label>
            <Textarea
              placeholder="AI-generated summary..."
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              className="flex-1 resize-none min-h-[120px] p-4"
              data-testid="input-resource-summary"
            />
          </div>
        )}
      </div>
    </div>
  );
}
