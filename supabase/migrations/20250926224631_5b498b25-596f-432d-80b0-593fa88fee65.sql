-- Add confidence_level field to executives and news_items tables
ALTER TABLE public.executives 
ADD COLUMN confidence_level TEXT DEFAULT 'medium' 
CHECK (confidence_level IN ('high', 'medium', 'low'));

ALTER TABLE public.news_items 
ADD COLUMN confidence_level TEXT DEFAULT 'medium'
CHECK (confidence_level IN ('high', 'medium', 'low'));

-- Add indexes for better performance
CREATE INDEX idx_executives_confidence_level ON public.executives(confidence_level);
CREATE INDEX idx_news_items_confidence_level ON public.news_items(confidence_level);