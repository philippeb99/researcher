-- Enhanced Script Management Migration
-- Phase 1: Database Schema Updates

-- 1. Rename existing script_templates to superadmin_templates
ALTER TABLE public.script_templates RENAME TO superadmin_templates;

-- 2. Create user_baseline_templates table for user-created templates
CREATE TABLE public.user_baseline_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_type text NOT NULL CHECK (script_type IN ('phone_call', 'voice_mail', 'email', 'linkedin', 'other')),
  template_name text NOT NULL,
  template_content_plain text NOT NULL,
  template_content_html text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, script_type, template_name)
);

-- 3. Update superadmin_templates to support 'other' script type
ALTER TABLE public.superadmin_templates 
DROP CONSTRAINT IF EXISTS script_templates_script_type_check;

ALTER TABLE public.superadmin_templates
ADD CONSTRAINT superadmin_templates_script_type_check 
CHECK (script_type IN ('phone_call', 'voice_mail', 'email', 'linkedin', 'other'));

-- 4. Create generated_scripts table with rich text and versioning support
CREATE TABLE public.generated_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_job_id uuid NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_type text NOT NULL CHECK (script_type IN ('phone_call', 'voice_mail', 'email', 'linkedin', 'other')),
  template_id uuid,
  template_source text CHECK (template_source IN ('superadmin', 'user', 'ai_improved')),
  script_content_plain text NOT NULL,
  script_content_html text,
  version integer DEFAULT 1,
  parent_script_id uuid REFERENCES public.generated_scripts(id),
  ai_improvement_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Migrate existing data from company_scripts to generated_scripts
INSERT INTO public.generated_scripts (
  research_job_id, user_id, script_type, 
  script_content_plain, template_source, version
)
SELECT 
  research_job_id, user_id, script_type, 
  script_content, 'superadmin', 1
FROM public.company_scripts;

-- 6. Create indexes for performance
CREATE INDEX idx_generated_scripts_research_job ON public.generated_scripts(research_job_id);
CREATE INDEX idx_generated_scripts_user ON public.generated_scripts(user_id);
CREATE INDEX idx_generated_scripts_type ON public.generated_scripts(script_type);
CREATE INDEX idx_user_templates_user ON public.user_baseline_templates(user_id);
CREATE INDEX idx_generated_scripts_parent ON public.generated_scripts(parent_script_id);

-- 7. RLS Policies for user_baseline_templates
ALTER TABLE public.user_baseline_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
ON public.user_baseline_templates FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all user templates"
ON public.user_baseline_templates FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 8. RLS Policies for generated_scripts
ALTER TABLE public.generated_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their generated scripts"
ON public.generated_scripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = generated_scripts.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their generated scripts"
ON public.generated_scripts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = generated_scripts.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their generated scripts"
ON public.generated_scripts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = generated_scripts.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their generated scripts"
ON public.generated_scripts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.research_jobs
    WHERE research_jobs.id = generated_scripts.research_job_id
    AND research_jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage all generated scripts"
ON public.generated_scripts FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 9. Add triggers for updated_at
CREATE TRIGGER update_user_templates_updated_at
BEFORE UPDATE ON public.user_baseline_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generated_scripts_updated_at
BEFORE UPDATE ON public.generated_scripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();