import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListNotes, 
  useCreateNote, 
  useUpdateNote, 
  useDeleteNote, 
  getListNotesQueryKey 
} from "@workspace/api-client-react";
import { StickyNote, Plus, Pin, Trash2, Tag, Check, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Notes() {
  const { data: notes, isLoading } = useListNotes();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const selectedNote = notes?.find(n => n.id === selectedNoteId);
  const activeNote = isCreating ? null : selectedNote;

  const sortedNotes = [...(notes || [])].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="h-full flex flex-col md:flex-row bg-background">
      <div className="w-full md:w-1/3 border-r border-border h-full flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            Notes
          </h1>
          <Button size="sm" onClick={() => { setIsCreating(true); setSelectedNoteId(null); }} data-testid="button-create-note">
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading notes...</div>
          ) : sortedNotes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg bg-muted/50">
              No notes yet. Create your first!
            </div>
          ) : (
            sortedNotes.map(note => (
              <Card 
                key={note.id} 
                className={`cursor-pointer transition-all hover:border-primary/50 ${selectedNoteId === note.id && !isCreating ? 'border-primary ring-1 ring-primary/20' : ''}`}
                onClick={() => { setSelectedNoteId(note.id); setIsCreating(false); }}
                data-testid={`card-note-${note.id}`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base truncate pr-4">{note.title}</CardTitle>
                    {note.isPinned && <Pin className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 pb-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{note.content || "Empty note"}</p>
                </CardContent>
                {note.tags && note.tags.length > 0 && (
                  <CardFooter className="p-4 pt-0 flex gap-1 flex-wrap">
                    {note.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
                    ))}
                  </CardFooter>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
      
      <div className="flex-1 h-full flex flex-col bg-muted/20">
        {(isCreating || activeNote) ? (
          <NoteEditor 
            note={activeNote} 
            onClose={() => { setIsCreating(false); setSelectedNoteId(null); }} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-medium text-foreground mb-2">Select a note</h2>
            <p>Choose a note from the list or create a new one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteEditor({ note, onClose }: { note: any | null, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [tagsInput, setTagsInput] = useState(note?.tags?.join(", ") || "");
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isMarkdown, setIsMarkdown] = useState(note?.isMarkdown || false);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // Reset form when note changes
  useState(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
      setTagsInput(note.tags?.join(", ") || "");
      setIsPinned(note.isPinned);
      setIsMarkdown(note.isMarkdown);
    } else {
      setTitle("");
      setContent("");
      setTagsInput("");
      setIsPinned(false);
      setIsMarkdown(false);
    }
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    const tags = tagsInput.split(",").map((t: string) => t.trim()).filter(Boolean);
    const data = { title, content, tags, isPinned, isMarkdown };

    if (note) {
      updateNote.mutate({ id: note.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          toast({ title: "Note updated" });
        }
      });
    } else {
      createNote.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          toast({ title: "Note created" });
          onClose();
        }
      });
    }
  };

  const handleDelete = () => {
    if (note) {
      deleteNote.mutate({ id: note.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          toast({ title: "Note deleted" });
          onClose();
        }
      });
    }
  };

  const isPending = createNote.isPending || updateNote.isPending || deleteNote.isPending;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif font-semibold">{note ? "Edit Note" : "New Note"}</h2>
        <div className="flex items-center gap-2">
          {note && (
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={isPending} className="text-destructive hover:bg-destructive/10" data-testid="button-delete-note">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending} data-testid="button-cancel-note">
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending} data-testid="button-save-note">
            <Check className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
        <Input 
          placeholder="Note Title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className="text-xl font-medium px-4 py-6"
          data-testid="input-note-title"
        />
        
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox id="pinned" checked={isPinned} onCheckedChange={(checked) => setIsPinned(!!checked)} data-testid="checkbox-note-pinned" />
            <label htmlFor="pinned" className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Pin className="w-3 h-3" /> Pin Note
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="markdown" checked={isMarkdown} onCheckedChange={(checked) => setIsMarkdown(!!checked)} data-testid="checkbox-note-markdown" />
            <label htmlFor="markdown" className="text-sm font-medium leading-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Markdown
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Tags (comma separated)" 
            value={tagsInput} 
            onChange={(e) => setTagsInput(e.target.value)} 
            className="flex-1"
            data-testid="input-note-tags"
          />
        </div>

        <Textarea 
          placeholder="Start typing your thought..." 
          value={content} 
          onChange={(e) => setContent(e.target.value)} 
          className="flex-1 resize-none font-mono text-sm leading-relaxed p-4"
          data-testid="input-note-content"
        />
      </div>
    </div>
  );
}
