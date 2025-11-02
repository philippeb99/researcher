-- Add unique constraint for user template names per script type
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_baseline_templates_unique_name 
ON user_baseline_templates(user_id, script_type, template_name) 
WHERE is_active = true;

-- Add comment for clarity
COMMENT ON INDEX idx_user_baseline_templates_unique_name IS 'Ensures unique template names per user and script type for active templates';
