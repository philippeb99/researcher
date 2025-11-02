-- Extend profiles table with user background information
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_name text,
ADD COLUMN IF NOT EXISTS user_last_ceo_position text,
ADD COLUMN IF NOT EXISTS user_last_company text,
ADD COLUMN IF NOT EXISTS user_phone_number text,
ADD COLUMN IF NOT EXISTS user_industry_experience text[],
ADD COLUMN IF NOT EXISTS user_interests text[],
ADD COLUMN IF NOT EXISTS user_location text;

-- Create company_scripts table for storing generated introduction scripts
CREATE TABLE IF NOT EXISTS public.company_scripts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_job_id uuid NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  script_type text NOT NULL CHECK (script_type IN ('phone_call', 'voice_mail', 'email', 'linkedin')),
  script_content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(research_job_id, script_type)
);

-- Enable RLS on company_scripts
ALTER TABLE public.company_scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_scripts
CREATE POLICY "Users can view scripts from their research jobs"
ON public.company_scripts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = company_scripts.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create scripts for their research jobs"
ON public.company_scripts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = company_scripts.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update scripts from their research jobs"
ON public.company_scripts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = company_scripts.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scripts from their research jobs"
ON public.company_scripts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = company_scripts.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all scripts"
ON public.company_scripts
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage all scripts"
ON public.company_scripts
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at on company_scripts
CREATE TRIGGER update_company_scripts_updated_at
BEFORE UPDATE ON public.company_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_company_scripts_research_job_id ON public.company_scripts(research_job_id);
CREATE INDEX IF NOT EXISTS idx_company_scripts_user_id ON public.company_scripts(user_id);