-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'editor', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add linkedin_url and status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN linkedin_url TEXT,
ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled'));

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'viewer' THEN 3
    END
  LIMIT 1
$$;

-- Update the handle_new_user function to assign editor role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, display_name, linkedin_url)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'linkedin_url'
  );
  
  -- Assign editor role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'editor');
  
  RETURN NEW;
END;
$$;

-- Create RLS policies for user_roles table
CREATE POLICY "Super admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Update profiles table RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update research_jobs RLS policies
DROP POLICY IF EXISTS "Users can view their own research jobs" ON public.research_jobs;
DROP POLICY IF EXISTS "Users can create their own research jobs" ON public.research_jobs;
DROP POLICY IF EXISTS "Users can update their own research jobs" ON public.research_jobs;
DROP POLICY IF EXISTS "Users can delete their own research jobs" ON public.research_jobs;

CREATE POLICY "Super admins can view all research jobs" 
ON public.research_jobs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own research jobs" 
ON public.research_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can create research jobs" 
ON public.research_jobs 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Editors can create their own research jobs" 
ON public.research_jobs 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'editor') AND auth.uid() = user_id);

CREATE POLICY "Super admins can update all research jobs" 
ON public.research_jobs 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Editors can update their own research jobs" 
ON public.research_jobs 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'editor') AND auth.uid() = user_id);

CREATE POLICY "Super admins can delete research jobs" 
ON public.research_jobs 
FOR DELETE 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Update triggers
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();