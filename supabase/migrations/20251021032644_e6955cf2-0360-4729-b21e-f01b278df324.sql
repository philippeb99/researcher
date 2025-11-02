-- Fix security warning: Set search_path for match_research_embeddings function
DROP FUNCTION IF EXISTS match_research_embeddings(vector, float, int);

CREATE OR REPLACE FUNCTION match_research_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  research_job_id uuid,
  content_type text,
  content_text text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    research_embeddings.id,
    research_embeddings.research_job_id,
    research_embeddings.content_type,
    research_embeddings.content_text,
    research_embeddings.metadata,
    1 - (research_embeddings.embedding <=> query_embedding) as similarity
  FROM research_embeddings
  WHERE 1 - (research_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY research_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;