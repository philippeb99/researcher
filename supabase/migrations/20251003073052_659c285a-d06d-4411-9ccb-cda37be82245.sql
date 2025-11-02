-- Remove unrestricted INSERT policy on api_responses table
-- Edge functions using service role key will still be able to insert (bypasses RLS)
-- This prevents attackers from flooding the database with fake API logs
DROP POLICY IF EXISTS "System can insert API responses" ON public.api_responses;