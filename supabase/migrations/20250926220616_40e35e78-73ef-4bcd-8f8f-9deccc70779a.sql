-- Function to get user emails (requires admin access)
CREATE OR REPLACE FUNCTION public.get_user_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id as user_id, email
  FROM auth.users;
$$;

-- Function to safely update user roles
CREATE OR REPLACE FUNCTION public.update_user_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_roles 
  SET role = _role, updated_at = now()
  WHERE user_id = _user_id;
  SELECT TRUE;
$$;

-- Function to get user profiles with real emails
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;