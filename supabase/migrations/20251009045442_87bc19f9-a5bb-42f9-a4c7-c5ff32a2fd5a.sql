-- Add template_name column to superadmin_templates to support multiple templates per script type
ALTER TABLE public.superadmin_templates
ADD COLUMN IF NOT EXISTS template_name text NOT NULL DEFAULT 'Default Template';

-- Drop the old unique constraint that only allowed one template per script type
ALTER TABLE public.superadmin_templates
DROP CONSTRAINT IF EXISTS superadmin_templates_script_type_key;

-- Add new unique constraint allowing multiple templates per script type (each with unique name)
ALTER TABLE public.superadmin_templates
ADD CONSTRAINT superadmin_templates_unique_template 
UNIQUE (script_type, template_name);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_superadmin_templates_script_type 
ON public.superadmin_templates(script_type);

-- Migrate existing templates to set appropriate template names
UPDATE public.superadmin_templates
SET template_name = 'Default Template'
WHERE template_name IS NULL OR template_name = '';