-- Create enum for research job status
CREATE TYPE research_status AS ENUM ('new', 'processing', 'complete', 'error');

-- Create research_jobs table
CREATE TABLE public.research_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  website_url TEXT NOT NULL,
  ceo_name TEXT NOT NULL,
  ceo_linkedin_url TEXT NOT NULL,
  additional_urls TEXT[], -- Array of additional URLs
  status research_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Research data fields
  company_overview TEXT,
  company_keywords TEXT[],
  industry_business_model TEXT,
  key_products_customers TEXT,
  market_position TEXT,
  recent_developments TEXT,
  board_leadership_changes TEXT,
  financial_information TEXT,
  funding_investment_news TEXT,
  key_partnerships TEXT
);

-- Create executives table
CREATE TABLE public.executives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_job_id UUID NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  linkedin_url TEXT,
  interests TEXT,
  history TEXT,
  key_interests TEXT,
  awards_recognition TEXT,
  summary TEXT, -- 250 character summary
  keywords TEXT[], -- Up to 5 keywords
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create news_items table
CREATE TABLE public.news_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_job_id UUID NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  executive_id UUID REFERENCES public.executives(id) ON DELETE CASCADE, -- NULL for company news
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT NOT NULL, -- Up to 300 characters
  keywords TEXT[], -- Up to 5 keywords
  published_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discussion_topics table
CREATE TABLE public.discussion_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_job_id UUID NOT NULL REFERENCES public.research_jobs(id) ON DELETE CASCADE,
  topic_type TEXT NOT NULL, -- 'touchpoint' or 'opportunity_challenge'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_references TEXT[], -- URLs and references that justify this topic
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for research_jobs
CREATE POLICY "Users can view their own research jobs" 
ON public.research_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own research jobs" 
ON public.research_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research jobs" 
ON public.research_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research jobs" 
ON public.research_jobs 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for executives
CREATE POLICY "Users can view executives from their research jobs" 
ON public.executives 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = executives.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can create executives for their research jobs" 
ON public.executives 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = executives.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can update executives from their research jobs" 
ON public.executives 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = executives.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can delete executives from their research jobs" 
ON public.executives 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = executives.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

-- RLS Policies for news_items
CREATE POLICY "Users can view news from their research jobs" 
ON public.news_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = news_items.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can create news for their research jobs" 
ON public.news_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = news_items.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can update news from their research jobs" 
ON public.news_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = news_items.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can delete news from their research jobs" 
ON public.news_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = news_items.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

-- RLS Policies for discussion_topics
CREATE POLICY "Users can view discussion topics from their research jobs" 
ON public.discussion_topics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = discussion_topics.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can create discussion topics for their research jobs" 
ON public.discussion_topics 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = discussion_topics.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can update discussion topics from their research jobs" 
ON public.discussion_topics 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = discussion_topics.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can delete discussion topics from their research jobs" 
ON public.discussion_topics 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.research_jobs 
  WHERE research_jobs.id = discussion_topics.research_job_id 
  AND research_jobs.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_research_jobs_user_id ON public.research_jobs(user_id);
CREATE INDEX idx_research_jobs_status ON public.research_jobs(status);
CREATE INDEX idx_research_jobs_updated_at ON public.research_jobs(updated_at DESC);
CREATE INDEX idx_executives_research_job_id ON public.executives(research_job_id);
CREATE INDEX idx_news_items_research_job_id ON public.news_items(research_job_id);
CREATE INDEX idx_news_items_executive_id ON public.news_items(executive_id);
CREATE INDEX idx_news_items_published_date ON public.news_items(published_date DESC);
CREATE INDEX idx_discussion_topics_research_job_id ON public.discussion_topics(research_job_id);

-- Create trigger for automatic timestamp updates on research_jobs
CREATE TRIGGER update_research_jobs_updated_at
BEFORE UPDATE ON public.research_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on executives
CREATE TRIGGER update_executives_updated_at
BEFORE UPDATE ON public.executives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();