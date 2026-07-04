import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Search, StickyNote, Lightbulb, Brain, Files, MessageSquare } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useBrainSearch } from "@workspace/api-client-react";
import type { BrainSearchResultItem } from "@workspace/api-client-react";

const TYPE_META: Record<string, { label: string; icon: typeof StickyNote; href: string }> = {
  note: { label: "Note", icon: StickyNote, href: "/notes" },
  idea: { label: "Idea", icon: Lightbulb, href: "/ideas" },
  memory: { label: "Memory", icon: Brain, href: "/memories" },
  resource: { label: "Resource", icon: Files, href: "/resources" },
  chat: { label: "Chat", icon: MessageSquare, href: "/" },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const { mutate, data, isPending } = useBrainSearch();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    const timeout = setTimeout(() => {
      mutate({ data: { query: trimmed, limit: 20 } });
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const results: BrainSearchResultItem[] = data?.results ?? [];

  function handleSelect(item: BrainSearchResultItem) {
    const meta = TYPE_META[item.type];
    setOpen(false);
    navigate(meta?.href ?? "/");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-muted-foreground border border-border hover:bg-sidebar-accent transition-colors"
        data-testid="button-global-search"
      >
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search everything...</span>
        <kbd className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search notes, ideas, memories, resources, chats..."
          value={query}
          onValueChange={setQuery}
          data-testid="input-global-search"
        />
        <CommandList>
          {!isPending && query.trim() && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {!query.trim() && (
            <CommandEmpty>Start typing to search across your entire brain.</CommandEmpty>
          )}
          {results.length > 0 && (
            <CommandGroup heading="Results">
              {results.map((item) => {
                const meta = TYPE_META[item.type];
                const Icon = meta?.icon ?? Search;
                return (
                  <CommandItem
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}-${item.title}`}
                    onSelect={() => handleSelect(item)}
                    data-testid={`result-${item.type}-${item.id}`}
                  >
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{item.title}</span>
                      {item.snippet && (
                        <span className="truncate text-xs text-muted-foreground">{item.snippet}</span>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {meta?.label ?? item.type}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
