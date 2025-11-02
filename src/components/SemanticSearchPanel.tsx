import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";
import { Badge } from "@/components/ui/badge";

export const SemanticSearchPanel = () => {
  const [query, setQuery] = useState("");
  const { mutate: search, data, isPending } = useSemanticSearch();

  const handleSearch = () => {
    if (!query.trim()) return;
    search({ query, limit: 10, threshold: 0.7 });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Semantic Search</h3>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Search across all research data..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {data?.results && data.results.length > 0 && (
          <div className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Found {data.count} results
            </p>
            {data.results.map((result: any, idx: number) => (
              <div key={idx} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{result.content_type}</Badge>
                      {result.similarity && (
                        <span className="text-xs text-muted-foreground">
                          {(result.similarity * 100).toFixed(1)}% match
                        </span>
                      )}
                    </div>
                    {result.research_job && (
                      <p className="font-medium">{result.research_job.company_name}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                      {result.content_text}
                    </p>
                  </div>
                  {result.research_job_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/research/${result.research_job_id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.count === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No results found. Try a different search term.
          </p>
        )}
      </div>
    </Card>
  );
};
