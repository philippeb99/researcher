-- Add new location columns to research_jobs table
ALTER TABLE public.research_jobs
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN country text;

-- Migrate existing location data
-- Parse location strings like "City, State, Country" or "City, Country" or "Country"
UPDATE public.research_jobs
SET 
  country = CASE
    WHEN location IS NOT NULL AND location != '' THEN
      TRIM(SPLIT_PART(location, ',', CASE
        WHEN ARRAY_LENGTH(STRING_TO_ARRAY(location, ','), 1) >= 1 
        THEN ARRAY_LENGTH(STRING_TO_ARRAY(location, ','), 1)
        ELSE 1
      END))
    ELSE 'Unknown'
  END,
  state = CASE
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(location, ','), 1) >= 3 THEN
      TRIM(SPLIT_PART(location, ',', 2))
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(location, ','), 1) = 2 THEN
      NULL
    ELSE NULL
  END,
  city = CASE
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(location, ','), 1) >= 2 THEN
      TRIM(SPLIT_PART(location, ',', 1))
    ELSE NULL
  END
WHERE location IS NOT NULL;

-- Set country to 'Unknown' for any NULL locations
UPDATE public.research_jobs
SET country = 'Unknown'
WHERE country IS NULL;

-- Make country NOT NULL after migration
ALTER TABLE public.research_jobs
ALTER COLUMN country SET NOT NULL;

-- Update the get_research_jobs_with_user_info function to include new fields
DROP FUNCTION IF EXISTS public.get_research_jobs_with_user_info();

CREATE OR REPLACE FUNCTION public.get_research_jobs_with_user_info()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  location text,
  city text,
  state text,
  country text,
  website_url text,
  ceo_name text,
  ceo_linkedin_url text,
  status research_status,
  contact_status contact_status,
  last_contact_datetime timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  processed_at timestamp with time zone,
  company_overview text,
  company_keywords text[],
  additional_urls text[],
  industry_business_model text,
  key_products_customers text,
  market_position text,
  recent_developments text,
  board_leadership_changes text,
  financial_information text,
  funding_investment_news text,
  competitors text,
  likely_acquirers text,
  key_partnerships text,
  top_5 text,
  acquisition_signal text,
  display_name text,
  user_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rj.id,
    rj.user_id,
    rj.company_name,
    rj.location,
    rj.city,
    rj.state,
    rj.country,
    rj.website_url,
    rj.ceo_name,
    rj.ceo_linkedin_url,
    rj.status,
    rj.contact_status,
    rj.last_contact_datetime,
    rj.created_at,
    rj.updated_at,
    rj.processed_at,
    rj.company_overview,
    rj.company_keywords,
    rj.additional_urls,
    rj.industry_business_model,
    rj.key_products_customers,
    rj.market_position,
    rj.recent_developments,
    rj.board_leadership_changes,
    rj.financial_information,
    rj.funding_investment_news,
    rj.competitors,
    rj.likely_acquirers,
    rj.key_partnerships,
    rj.top_5,
    rj.acquisition_signal,
    p.display_name,
    au.email as user_email
  FROM public.research_jobs rj
  LEFT JOIN public.profiles p ON rj.user_id = p.user_id
  LEFT JOIN auth.users au ON rj.user_id = au.id
  ORDER BY rj.created_at DESC;
$$;