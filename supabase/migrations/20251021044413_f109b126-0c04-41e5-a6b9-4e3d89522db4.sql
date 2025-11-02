-- Add enrichment tracking fields to research_jobs table
ALTER TABLE research_jobs
ADD COLUMN IF NOT EXISTS enrichment_phases jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS data_quality_score numeric;

-- Add data source tracking to executives table
ALTER TABLE executives
ADD COLUMN IF NOT EXISTS data_source text,
ADD COLUMN IF NOT EXISTS confidence_score numeric,
ADD COLUMN IF NOT EXISTS last_verified_at timestamp with time zone;

-- Add news source metadata to news_items table
ALTER TABLE news_items
ADD COLUMN IF NOT EXISTS source_domain text,
ADD COLUMN IF NOT EXISTS source_credibility_score numeric,
ADD COLUMN IF NOT EXISTS snippet text;

-- Create index for faster enrichment status queries
CREATE INDEX IF NOT EXISTS idx_research_jobs_enrichment_status 
ON research_jobs(enrichment_status);

-- Create index for data source queries
CREATE INDEX IF NOT EXISTS idx_executives_data_source 
ON executives(data_source);

-- Create index for news source queries
CREATE INDEX IF NOT EXISTS idx_news_items_source_domain 
ON news_items(source_domain);