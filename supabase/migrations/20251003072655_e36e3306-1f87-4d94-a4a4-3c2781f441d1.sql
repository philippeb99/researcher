-- Add corum_activity column to research_notes table
ALTER TABLE public.research_notes 
ADD COLUMN corum_activity TEXT;