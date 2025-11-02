-- Fix security warning: Set search_path for prevent_contact_status_deletion function
CREATE OR REPLACE FUNCTION prevent_contact_status_deletion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;