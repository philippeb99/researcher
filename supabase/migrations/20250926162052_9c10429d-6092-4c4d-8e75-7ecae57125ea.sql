-- Add acquisition_signal column to research_jobs table
ALTER TABLE public.research_jobs 
ADD COLUMN acquisition_signal TEXT;