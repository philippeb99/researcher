-- Add SuperAdmin RLS policies for executives table
CREATE POLICY "Super admins can view all executives" 
ON public.executives 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all executives" 
ON public.executives 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert executives" 
ON public.executives 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete executives" 
ON public.executives 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add SuperAdmin RLS policies for news_items table
CREATE POLICY "Super admins can view all news items" 
ON public.news_items 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all news items" 
ON public.news_items 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert news items" 
ON public.news_items 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete news items" 
ON public.news_items 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add SuperAdmin RLS policies for discussion_topics table
CREATE POLICY "Super admins can view all discussion topics" 
ON public.discussion_topics 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all discussion topics" 
ON public.discussion_topics 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert discussion topics" 
ON public.discussion_topics 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete discussion topics" 
ON public.discussion_topics 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add SuperAdmin RLS policies for research_notes table
CREATE POLICY "Super admins can view all research notes" 
ON public.research_notes 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all research notes" 
ON public.research_notes 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert research notes" 
ON public.research_notes 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete research notes" 
ON public.research_notes 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));