-- Add role checks to SECURITY DEFINER functions to prevent unauthorized email access

-- Update get_user_emails() to require super_admin role
CREATE OR REPLACE FUNCTION public.get_user_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admin can access user emails
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: super_admin role required';
  END IF;
  
  RETURN QUERY
  SELECT id as user_id, email
  FROM auth.users;
END;
$$;

-- Update get_user_profiles_with_emails() to require super_admin role
CREATE OR REPLACE FUNCTION public.get_user_profiles_with_emails()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  linkedin_url text,
  status text,
  created_at timestamp with time zone,
  role app_role,
  email text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admin can access user profiles with emails
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: super_admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.linkedin_url,
    p.status,
    p.created_at,
    COALESCE(ur.role, 'viewer'::app_role) as role,
    au.email
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  LEFT JOIN auth.users au ON p.user_id = au.id
  ORDER BY p.created_at DESC;
END;
$$;