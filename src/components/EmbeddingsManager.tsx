import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Loader2, CheckCircle } from "lucide-react";
import { useGenerateEmbeddings } from "@/hooks/useGenerateEmbeddings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmbeddingsManagerProps {
  researchJobId: string;
}

export const EmbeddingsManager = ({ researchJobId }: EmbeddingsManagerProps) => {
  const { mutate: generateEmbeddings, isPending } = useGenerateEmbeddings();

  const { data: embeddings, isLoading } = useQuery({
    queryKey: ['research-embeddings', researchJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_embeddings')
        .select('*')
        .eq('research_job_id', researchJobId);

      if (error) throw error;
      return data;
    },
  });

  const embeddingCount = embeddings?.length || 0;
  const hasEmbeddings = embeddingCount > 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Vector Embeddings</h3>
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {hasEmbeddings ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {embeddingCount} embeddings generated
                  </span>
                ) : (
                  'No embeddings yet'
                )}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={() => generateEmbeddings(researchJobId)}
          disabled={isPending || isLoading}
          variant={hasEmbeddings ? "outline" : "default"}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>{hasEmbeddings ? 'Regenerate' : 'Generate'} Embeddings</>
          )}
        </Button>
      </div>
      {hasEmbeddings && embeddings && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Embedding Types:</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(embeddings.map(e => e.content_type))].map((type) => (
              <span key={type} className="text-xs px-2 py-1 bg-muted rounded">
                {type} ({embeddings.filter(e => e.content_type === type).length})
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
