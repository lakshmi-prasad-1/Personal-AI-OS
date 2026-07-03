import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, Search, Activity, Sparkles, Network } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBrainDecide, useBrainSearch } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Quick and dirty debounce
  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearchLoading } = useBrainSearch(
    { query: { query: debouncedQuery } },
    { query: { enabled: debouncedQuery.length > 2 } }
  );

  const { data: suggestions, isLoading: isDecideLoading } = useBrainDecide();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-foreground">Command Center</h1>
        <p className="text-muted-foreground text-lg">Your second brain is ready.</p>
      </header>

      <section className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          type="search"
          placeholder="Search notes, ideas, memories, resources..."
          className="pl-10 py-6 text-lg rounded-xl bg-card border-2 border-transparent focus-visible:border-primary focus-visible:ring-0 shadow-sm transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </section>

      {debouncedQuery.length > 2 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Search Results
          </h2>
          {isSearchLoading ? (
            <div className="p-8 text-center text-muted-foreground">Searching your brain...</div>
          ) : searchResults?.results?.length ? (
            <div className="grid gap-3">
              {searchResults.results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={`/${result.type}s`}
                  className="block p-4 rounded-lg bg-card border hover:border-primary/50 transition-colors shadow-sm hover:shadow"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-foreground">{result.title}</h3>
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded">
                      {result.type}
                    </span>
                  </div>
                  {result.snippet && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{result.snippet}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
              No fragments found matching your thought.
            </div>
          )}
        </section>
      )}

      {!debouncedQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Suggested Actions
            </h2>
            {isDecideLoading ? (
              <div className="p-8 text-center text-muted-foreground">Synthesizing...</div>
            ) : suggestions?.decisions?.length ? (
              <div className="grid gap-3">
                {suggestions.decisions.map((decision, i) => (
                  <Card key={i} className="bg-card/50 backdrop-blur-sm border hover:border-primary/50 transition-colors">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">{decision.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <CardDescription>{decision.description}</CardDescription>
                      <div className="mt-3 flex justify-end">
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/${decision.actionType.toLowerCase()}s`}>Take Action</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
                Your mind is clear. Capture a new thought.
              </div>
            )}
          </section>

          <section className="space-y-4">
             <h2 className="text-xl font-semibold flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Quick Capture
            </h2>
            <div className="grid grid-cols-2 gap-3">
               <Link href="/notes" className="p-4 rounded-lg bg-card border hover:border-primary transition-colors shadow-sm group">
                 <h3 className="font-medium group-hover:text-primary transition-colors">Note</h3>
                 <p className="text-xs text-muted-foreground mt-1">Capture a thought</p>
               </Link>
               <Link href="/ideas" className="p-4 rounded-lg bg-card border hover:border-primary transition-colors shadow-sm group">
                 <h3 className="font-medium group-hover:text-primary transition-colors">Idea</h3>
                 <p className="text-xs text-muted-foreground mt-1">Sow a seed</p>
               </Link>
               <Link href="/memories" className="p-4 rounded-lg bg-card border hover:border-primary transition-colors shadow-sm group">
                 <h3 className="font-medium group-hover:text-primary transition-colors">Memory</h3>
                 <p className="text-xs text-muted-foreground mt-1">Archive an experience</p>
               </Link>
               <Link href="/resources" className="p-4 rounded-lg bg-card border hover:border-primary transition-colors shadow-sm group">
                 <h3 className="font-medium group-hover:text-primary transition-colors">Resource</h3>
                 <p className="text-xs text-muted-foreground mt-1">Save for later</p>
               </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
