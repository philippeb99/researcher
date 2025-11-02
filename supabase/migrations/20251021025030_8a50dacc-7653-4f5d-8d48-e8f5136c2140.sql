-- Phase 1: Foundation Layer - Enable pgvector and create core tables

-- 1. Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create research_embeddings table for storing semantic vectors
CREATE TABLE IF NOT EXISTS public.research_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_job_id UUID NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('overview', 'executive', 'news', 'full_context')),
  content_text TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_research_embeddings_vector ON public.research_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_research_embeddings_job_id ON public.research_embeddings(research_job_id);
CREATE INDEX IF NOT EXISTS idx_research_embeddings_content_type ON public.research_embeddings(content_type);

-- 3. Create source_credibility table for tracking source reliability
CREATE TABLE IF NOT EXISTS public.source_credibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  credibility_score DECIMAL(3,2) NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 1),
  source_type TEXT NOT NULL CHECK (source_type IN ('news', 'corporate', 'social', 'database', 'academic', 'government')),
  verification_count INTEGER NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for domain lookups
CREATE INDEX IF NOT EXISTS idx_source_credibility_domain ON public.source_credibility(domain);

-- Seed credible sources
INSERT INTO public.source_credibility (domain, credibility_score, source_type, verification_count, last_verified_at, metadata) VALUES
  ('bloomberg.com', 0.95, 'news', 1000, now(), '{"description": "Financial news and data"}'),
  ('reuters.com', 0.95, 'news', 1000, now(), '{"description": "International news agency"}'),
  ('wsj.com', 0.90, 'news', 800, now(), '{"description": "Wall Street Journal"}'),
  ('ft.com', 0.90, 'news', 800, now(), '{"description": "Financial Times"}'),
  ('crunchbase.com', 0.85, 'database', 500, now(), '{"description": "Company database"}'),
  ('linkedin.com', 0.80, 'social', 1500, now(), '{"description": "Professional network"}'),
  ('sec.gov', 0.98, 'government', 300, now(), '{"description": "US Securities and Exchange Commission"}'),
  ('forbes.com', 0.75, 'news', 600, now(), '{"description": "Business news"}'),
  ('techcrunch.com', 0.75, 'news', 500, now(), '{"description": "Technology news"}'),
  ('businesswire.com', 0.85, 'corporate', 400, now(), '{"description": "Press release distribution"}'),
  ('prnewswire.com', 0.85, 'corporate', 400, now(), '{"description": "Press release distribution"}'),
  ('pitchbook.com', 0.85, 'database', 300, now(), '{"description": "Private equity data"}')
ON CONFLICT (domain) DO NOTHING;

-- 4. Create validation_logs table for tracking AI validation decisions
CREATE TABLE IF NOT EXISTS public.validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_job_id UUID NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('source_check', 'fact_verification', 'cross_reference', 'temporal_check', 'sentiment_analysis')),
  input_data JSONB NOT NULL,
  validation_result JSONB NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  processing_time_ms INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for validation logs
CREATE INDEX IF NOT EXISTS idx_validation_logs_job_id ON public.validation_logs(research_job_id);
CREATE INDEX IF NOT EXISTS idx_validation_logs_type ON public.validation_logs(validation_type);
CREATE INDEX IF NOT EXISTS idx_validation_logs_created_at ON public.validation_logs(created_at DESC);

-- 5. Extend research_jobs table with new columns
ALTER TABLE public.research_jobs
ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS enrichment_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS validation_score DECIMAL(3,2) CHECK (validation_score >= 0 AND validation_score <= 1),
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_sources JSONB DEFAULT '[]'::jsonb;

-- 6. Create RLS policies for research_embeddings
ALTER TABLE public.research_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view embeddings from their research jobs"
ON public.research_embeddings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = research_embeddings.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all embeddings"
ON public.research_embeddings FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert embeddings"
ON public.research_embeddings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = research_embeddings.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage all embeddings"
ON public.research_embeddings FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 7. Create RLS policies for source_credibility
ALTER TABLE public.source_credibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view source credibility"
ON public.source_credibility FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage source credibility"
ON public.source_credibility FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 8. Create RLS policies for validation_logs
ALTER TABLE public.validation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validation logs from their research jobs"
ON public.validation_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = validation_logs.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all validation logs"
ON public.validation_logs FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert validation logs"
ON public.validation_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = validation_logs.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage all validation logs"
ON public.validation_logs FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 9. Create trigger for updating research_embeddings updated_at
CREATE OR REPLACE FUNCTION public.update_research_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_research_embeddings_updated_at
BEFORE UPDATE ON public.research_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_research_embeddings_updated_at();

-- 10. Create trigger for updating source_credibility updated_at
CREATE OR REPLACE FUNCTION public.update_source_credibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_source_credibility_updated_at
BEFORE UPDATE ON public.source_credibility
FOR EACH ROW
EXECUTE FUNCTION public.update_source_credibility_updated_at();