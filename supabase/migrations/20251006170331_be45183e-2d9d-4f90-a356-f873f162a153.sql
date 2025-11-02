-- Create contact_statuses table
CREATE TABLE contact_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with existing statuses
INSERT INTO contact_statuses (value, label, color, sort_order, is_system) VALUES
  ('never', 'Never Contacted', 'gray', 1, true),
  ('contacted', 'Contacted', 'blue', 2, false),
  ('connected', 'Connected', 'green', 3, false),
  ('need_follow_up', 'Follow Up', 'orange', 4, false),
  ('not_interested', 'Not Interested', 'gray', 5, false),
  ('research_only', 'Research Only', 'purple', 6, false);

-- Create deletion prevention function
CREATE OR REPLACE FUNCTION prevent_contact_status_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM research_jobs 
    WHERE contact_status::text = OLD.value
  ) THEN
    RAISE EXCEPTION 'Cannot delete contact status "%" as it is in use by % job(s)', 
      OLD.label, 
      (SELECT COUNT(*) FROM research_jobs WHERE contact_status::text = OLD.value);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deletion prevention
CREATE TRIGGER check_contact_status_usage
  BEFORE DELETE ON contact_statuses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_contact_status_deletion();

-- Add trigger for updated_at
CREATE TRIGGER update_contact_statuses_updated_at
  BEFORE UPDATE ON contact_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE contact_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view contact statuses"
  ON contact_statuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert contact statuses"
  ON contact_statuses FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update contact statuses"
  ON contact_statuses FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete contact statuses"
  ON contact_statuses FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));