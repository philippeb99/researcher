-- Create API responses logging table for debugging
CREATE TABLE IF NOT EXISTS public.api_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_job_id UUID REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  api_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  response_text TEXT,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add is_user_provided flag to executives table
ALTER TABLE public.executives 
ADD COLUMN IF NOT EXISTS is_user_provided BOOLEAN DEFAULT false;

-- Enable RLS on api_responses
ALTER TABLE public.api_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_responses
CREATE POLICY "Users can view API responses from their research jobs"
ON public.api_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = api_responses.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can view all API responses"
ON public.api_responses FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert API responses"
ON public.api_responses FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_api_responses_research_job_id 
ON public.api_responses(research_job_id);

CREATE INDEX IF NOT EXISTS idx_api_responses_api_name 
ON public.api_responses(api_name, endpoint);