-- Add citation columns to research_jobs table for storing source references
ALTER TABLE public.research_jobs 
ADD COLUMN overview_citations JSONB DEFAULT NULL,
ADD COLUMN competitors_citations JSONB DEFAULT NULL,
ADD COLUMN likely_acquirers_citations JSONB DEFAULT NULL;