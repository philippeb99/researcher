-- Fix type mismatch in get_user_profiles_with_emails function
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
    au.email::text
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  LEFT JOIN auth.users au ON p.user_id = au.id
  ORDER BY p.created_at DESC;
END;
$$;