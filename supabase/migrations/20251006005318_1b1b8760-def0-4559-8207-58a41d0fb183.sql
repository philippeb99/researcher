-- Phase 1b: Migrate data and create new tables

-- Migrate existing 'complete' records to 'processed'
UPDATE research_jobs SET status = 'processed' WHERE status = 'complete';

-- Create contact_status enum
CREATE TYPE contact_status AS ENUM ('never', 'contacted', 'connected', 'need_follow_up', 'not_interested');

-- Create activity_type enum
CREATE TYPE activity_type AS ENUM ('email', 'phone', 'linkedin', 'meeting', 'other');

-- Create activity_status enum
CREATE TYPE activity_status AS ENUM ('new', 'in_progress', 'complete', 'cancelled');

-- Add new fields to research_jobs table
ALTER TABLE research_jobs 
ADD COLUMN IF NOT EXISTS contact_status contact_status,
ADD COLUMN IF NOT EXISTS last_contact_datetime TIMESTAMPTZ;

-- Create contact_activity table
CREATE TABLE IF NOT EXISTS contact_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_job_id UUID NOT NULL REFERENCES research_jobs(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  notes TEXT NOT NULL,
  status activity_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS on contact_activity
ALTER TABLE contact_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_activity

-- Users can view activities from their research jobs
CREATE POLICY "Users can view activities from their research jobs"
ON contact_activity
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM research_jobs
    WHERE research_jobs.id = contact_activity.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

-- Super admins can view all activities
CREATE POLICY "Super admins can view all activities"
ON contact_activity
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Editors can create activities for their research jobs
CREATE POLICY "Editors can create activities for their research jobs"
ON contact_activity
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'editor')
  AND EXISTS (
    SELECT 1 FROM research_jobs
    WHERE research_jobs.id = contact_activity.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

-- Super admins can create activities
CREATE POLICY "Super admins can create activities"
ON contact_activity
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Editors can update activities from their research jobs
CREATE POLICY "Editors can update activities from their research jobs"
ON contact_activity
FOR UPDATE
USING (
  has_role(auth.uid(), 'editor')
  AND EXISTS (
    SELECT 1 FROM research_jobs
    WHERE research_jobs.id = contact_activity.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

-- Super admins can update all activities
CREATE POLICY "Super admins can update all activities"
ON contact_activity
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Editors can delete activities from their research jobs
CREATE POLICY "Editors can delete activities from their research jobs"
ON contact_activity
FOR DELETE
USING (
  has_role(auth.uid(), 'editor')
  AND EXISTS (
    SELECT 1 FROM research_jobs
    WHERE research_jobs.id = contact_activity.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

-- Super admins can delete all activities
CREATE POLICY "Super admins can delete all activities"
ON contact_activity
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_activity_research_job_id ON contact_activity(research_job_id);
CREATE INDEX IF NOT EXISTS idx_research_jobs_contact_status ON research_jobs(contact_status);
CREATE INDEX IF NOT EXISTS idx_research_jobs_status ON research_jobs(status);

-- Create trigger for updated_at on contact_activity
CREATE TRIGGER update_contact_activity_updated_at
BEFORE UPDATE ON contact_activity
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();