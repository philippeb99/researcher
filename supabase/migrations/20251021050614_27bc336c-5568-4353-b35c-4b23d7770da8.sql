-- Add relevance_score column to news_items for quality tracking
ALTER TABLE public.news_items 
ADD COLUMN IF NOT EXISTS relevance_score integer DEFAULT NULL;

-- Add index for filtering by relevance
CREATE INDEX IF NOT EXISTS idx_news_items_relevance_score 
ON public.news_items(relevance_score);

-- Add comment
COMMENT ON COLUMN public.news_items.relevance_score IS 'Relevance score (0-100) based on company mention, location match, date recency';