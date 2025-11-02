-- Create table for custom script templates
CREATE TABLE IF NOT EXISTS public.script_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_type text NOT NULL,
  template_content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(script_type)
);

-- Enable RLS
ALTER TABLE public.script_templates ENABLE ROW LEVEL SECURITY;

-- Super admins can view all templates
CREATE POLICY "Super admins can view all script templates"
ON public.script_templates
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can insert templates
CREATE POLICY "Super admins can insert script templates"
ON public.script_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can update templates
CREATE POLICY "Super admins can update script templates"
ON public.script_templates
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can delete templates
CREATE POLICY "Super admins can delete script templates"
ON public.script_templates
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_script_templates_updated_at
BEFORE UPDATE ON public.script_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();