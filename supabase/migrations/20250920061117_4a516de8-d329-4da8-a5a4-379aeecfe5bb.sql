-- Create a table for research job notes
CREATE TABLE public.research_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_job_id UUID NOT NULL,
  internal_notes TEXT,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.research_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view notes for their research jobs" 
ON public.research_notes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM research_jobs 
  WHERE research_jobs.id = research_notes.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can create notes for their research jobs" 
ON public.research_notes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM research_jobs 
  WHERE research_jobs.id = research_notes.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can update notes for their research jobs" 
ON public.research_notes 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM research_jobs 
  WHERE research_jobs.id = research_notes.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can delete notes for their research jobs" 
ON public.research_notes 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM research_jobs 
  WHERE research_jobs.id = research_notes.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_research_notes_updated_at
BEFORE UPDATE ON public.research_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();