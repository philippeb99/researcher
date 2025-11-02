import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  research_job_id: z.string().uuid({ message: "Invalid research_job_id format" }),
  company_name: z.string().min(1, { message: "company_name is required" }),
  ceo_linkedin_url: z.string().url({ message: "Invalid ceo_linkedin_url format" }).optional().or(z.literal('')),
});

interface LinkedInEnrichmentRequest {
  research_job_id: string;
  ceo_linkedin_url?: string;
  company_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { research_job_id, ceo_linkedin_url, company_name }: LinkedInEnrichmentRequest = validationResult.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log(`LinkedIn enrichment for ${company_name}`);

    // Fetch existing executives to enhance
    const { data: existingExecs } = await supabase
      .from('executives')
      .select('*')
      .eq('research_job_id', research_job_id);
    
    console.log(`Found ${existingExecs?.length || 0} existing executives`);

    const enrichedData: any = {
      source: 'linkedin',
      enriched: false,
      data: {},
      fallback_used: false,
      executives_updated: 0
    };

    // Try Crustdata API first (if available)
    const crustdataKey = Deno.env.get('CRUSTDATA_API_KEY');
    if (crustdataKey && ceo_linkedin_url) {
      try {
        console.log('Attempting Crustdata enrichment...');
        
        // Crustdata API call would go here
        // For now, logging that we'd use it
        enrichedData.primary_source = 'crustdata';
        enrichedData.note = 'Crustdata API integration pending';
        
      } catch (e) {
        console.log('Crustdata failed, falling back to SERPAPI:', e.message);
      }
    }

    // Fallback to SERPAPI
    const serpapiKey = Deno.env.get('SERPAPI_API_KEY');
    if (!enrichedData.enriched && serpapiKey) {
      try {
        console.log('Using SERPAPI for LinkedIn enrichment...');
        
        // Generate company name variations
        const companyVariations = [];
        companyVariations.push(`"${company_name}"`);
        
        const withoutSuffix = company_name.replace(/\s+(Inc\.|LLC|Ltd\.|Corporation|Corp\.|Limited)$/i, '');
        if (withoutSuffix !== company_name) {
          companyVariations.push(`"${withoutSuffix}"`);
        }
        
        const withoutPunctuation = company_name.replace(/[:\-\.]/g, ' ').replace(/\s+/g, ' ').trim();
        if (withoutPunctuation !== company_name && withoutPunctuation.length > 3) {
          companyVariations.push(`"${withoutPunctuation}"`);
        }

        // Build flexible search query for executives
        const companyQuery = companyVariations.join(' OR ');
        const executiveTitles = 'CEO OR founder OR president OR "managing director" OR "chief executive" OR partner';
        
        // Search for LinkedIn profiles - more forgiving
        const searchQuery = ceo_linkedin_url 
          ? `site:linkedin.com ${ceo_linkedin_url}`
          : `site:linkedin.com (${companyQuery}) (${executiveTitles})`;

        const serpApiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpapiKey}&num=10`;
        
        console.log('Original company name:', company_name);
        console.log('Company variations:', companyVariations.join(', '));
        console.log('Final LinkedIn search query:', searchQuery);
        
        const response = await fetch(serpApiUrl);
        const data = await response.json();

        if (data.organic_results && data.organic_results.length > 0) {
          console.log(`Found ${data.organic_results.length} LinkedIn profiles`);
          
          // Filter for actual LinkedIn profile pages
          const linkedinProfiles = data.organic_results.filter((r: any) => 
            r.link && r.link.includes('linkedin.com/in/')
          );
          
          console.log(`Filtered to ${linkedinProfiles.length} valid LinkedIn profile pages`);
          
          enrichedData.enriched = true;
          enrichedData.primary_source = crustdataKey ? 'serpapi' : 'serpapi';
          enrichedData.fallback_used = !!crustdataKey;
          enrichedData.data = {
            profiles_found: linkedinProfiles.length,
            top_results: linkedinProfiles.slice(0, 5).map((r: any) => ({
              title: r.title,
              link: r.link,
              snippet: r.snippet
            }))
          };

          // Update executives without LinkedIn URLs - use more flexible matching
          if (existingExecs && linkedinProfiles.length > 0) {
            for (const exec of existingExecs) {
              if (!exec.linkedin_url) {
                const nameParts = exec.name.toLowerCase().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts[nameParts.length - 1];
                
                // Try to match by first AND last name in title/snippet
                const matchedProfile = linkedinProfiles.find((r: any) => {
                  const searchText = (r.title + ' ' + (r.snippet || '')).toLowerCase();
                  return searchText.includes(firstName) && searchText.includes(lastName);
                });
                
                if (matchedProfile) {
                  console.log(`Matched ${exec.name} to ${matchedProfile.link}`);
                  await supabase
                    .from('executives')
                    .update({
                      linkedin_url: matchedProfile.link,
                      data_source: 'serpapi',
                      confidence_score: 75,
                      last_verified_at: new Date().toISOString()
                    })
                    .eq('id', exec.id);
                  enrichedData.executives_updated++;
                } else {
                  console.log(`No LinkedIn match found for ${exec.name}`);
                }
              }
            }
            console.log(`Updated ${enrichedData.executives_updated} executives with LinkedIn URLs`);
          } else if (!existingExecs || existingExecs.length === 0) {
            console.log('No existing executives to update');
          }
          
          // Log sample results for debugging
          if (linkedinProfiles.length > 0) {
            console.log('Sample LinkedIn results:', linkedinProfiles.slice(0, 3).map((p: any) => ({
              title: p.title,
              url: p.link
            })));
          }

          // Log to API responses table
          await supabase.from('api_responses').insert({
            research_job_id,
            api_name: 'serpapi',
            endpoint: 'search',
            request_payload: { query: searchQuery },
            response_payload: data,
            status_code: 200
          });
        }
      } catch (e) {
        console.error('SERPAPI error:', e.message);
        enrichedData.error = e.message;
      }
    }

    // If no API keys available, return with note
    if (!serpapiKey && !crustdataKey) {
      enrichedData.error = 'No LinkedIn enrichment APIs configured';
    }

    return new Response(
      JSON.stringify(enrichedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('LinkedIn enrichment error:', error);
    return new Response(
      JSON.stringify({ 
        enriched: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
