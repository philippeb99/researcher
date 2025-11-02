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
  website_url: z.string().url({ message: "Invalid website_url format" }).optional().or(z.literal('')),
});

interface CompanyEnrichmentRequest {
  research_job_id: string;
  company_name: string;
  website_url?: string;
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

    const { research_job_id, company_name, website_url }: CompanyEnrichmentRequest = validationResult.data;

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

    console.log(`Company enrichment for ${company_name}`);

    // Fetch existing research job data
    const { data: existingJob } = await supabase
      .from('research_jobs')
      .select('employee_count, revenue_amount, industry_business_model')
      .eq('id', research_job_id)
      .single();

    const enrichedData: any = {
      source: 'company',
      enriched: false,
      data: {},
      fallback_used: false,
      fields_updated: []
    };

    // Try Crunchbase API first
    const crunchbaseKey = Deno.env.get('CRUNCHBASE_API_KEY');
    if (crunchbaseKey) {
      try {
        console.log('Attempting Crunchbase enrichment...');
        
        // Search for organization
        const searchUrl = `https://api.crunchbase.com/api/v4/autocompletes?query=${encodeURIComponent(company_name)}&collection_ids=organizations&user_key=${crunchbaseKey}`;
        
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.entities && searchData.entities.length > 0) {
          const orgId = searchData.entities[0].identifier.uuid;
          
          // Get detailed organization data
          const detailUrl = `https://api.crunchbase.com/api/v4/entities/organizations/${orgId}?user_key=${crunchbaseKey}&card_ids=fields`;
          
          const detailResponse = await fetch(detailUrl);
          const detailData = await detailResponse.json();

          enrichedData.enriched = true;
          enrichedData.primary_source = 'crunchbase';
          enrichedData.data = {
            organization_id: orgId,
            description: detailData.properties?.short_description,
            founded_on: detailData.properties?.founded_on,
            employee_count: detailData.properties?.num_employees_enum,
            funding_total: detailData.properties?.funding_total,
            categories: detailData.properties?.categories,
            website: detailData.properties?.website_url,
            headquarters: detailData.properties?.location_identifiers
          };

          // Update only empty fields in research_jobs
          const updates: any = {};
          if (!existingJob?.employee_count && detailData.properties?.num_employees_enum) {
            updates.employee_count = parseInt(detailData.properties.num_employees_enum.replace(/[^0-9]/g, '')) || null;
            enrichedData.fields_updated.push('employee_count');
          }
          if (!existingJob?.revenue_amount && detailData.properties?.funding_total) {
            updates.revenue_amount = detailData.properties.funding_total.value_usd;
            enrichedData.fields_updated.push('revenue_amount');
          }
          if (!existingJob?.industry_business_model && detailData.properties?.categories) {
            updates.industry_business_model = detailData.properties.categories.map((c: any) => c.value).join(', ');
            enrichedData.fields_updated.push('industry_business_model');
          }

          if (Object.keys(updates).length > 0) {
            await supabase
              .from('research_jobs')
              .update(updates)
              .eq('id', research_job_id);
          }

          // Log to API responses
          await supabase.from('api_responses').insert({
            research_job_id,
            api_name: 'crunchbase',
            endpoint: 'organizations',
            request_payload: { company_name, org_id: orgId },
            response_payload: detailData,
            status_code: 200
          });
        }
      } catch (e) {
        console.log('Crunchbase failed, falling back to SERPAPI:', e.message);
        await supabase.from('api_responses').insert({
          research_job_id,
          api_name: 'crunchbase',
          endpoint: 'organizations',
          error_message: e.message,
          status_code: 500
        });
      }
    }

    // Fallback to SERPAPI
    const serpapiKey = Deno.env.get('SERPAPI_API_KEY');
    if (!enrichedData.enriched && serpapiKey) {
      try {
        console.log('Using SERPAPI for company enrichment...');
        
        const searchQuery = `"${company_name}" company overview funding employees`;
        const serpApiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpapiKey}&num=10`;
        
        const response = await fetch(serpApiUrl);
        const data = await response.json();

        if (data.organic_results && data.organic_results.length > 0) {
          enrichedData.enriched = true;
          enrichedData.primary_source = crunchbaseKey ? 'serpapi' : 'serpapi';
          enrichedData.fallback_used = !!crunchbaseKey;
          enrichedData.data = {
            results_found: data.organic_results.length,
            company_info: data.organic_results.slice(0, 5).map((r: any) => ({
              title: r.title,
              link: r.link,
              snippet: r.snippet
            })),
            knowledge_graph: data.knowledge_graph || null
          };

          // Log to API responses
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

    // If no API keys available
    if (!serpapiKey && !crunchbaseKey) {
      enrichedData.error = 'No company enrichment APIs configured';
    }

    return new Response(
      JSON.stringify(enrichedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Company enrichment error:', error);
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
