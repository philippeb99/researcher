import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  research_job_id: z.string().uuid({ message: "Invalid research_job_id format" }),
  urls: z.array(z.string().url({ message: "Invalid URL format" })).min(1, { message: "At least one URL is required" }),
});

interface WebScrapingRequest {
  research_job_id: string;
  urls: string[];
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

    const { research_job_id, urls }: WebScrapingRequest = validationResult.data;

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

    console.log(`Web scraping for ${urls.length} URLs`);

    const enrichedData: any = {
      source: 'web_scraping',
      enriched: false,
      data: {},
      scraped_urls: []
    };

    // Use SERPAPI for web content extraction
    const serpapiKey = Deno.env.get('SERPAPI_API_KEY');
    if (serpapiKey) {
      const scrapedResults = [];

      for (const url of urls.slice(0, 5)) { // Limit to 5 URLs
        try {
          console.log(`Scraping ${url}...`);
          
          // Use SERPAPI to get page content
          const searchQuery = `site:${new URL(url).hostname}`;
          const serpApiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpapiKey}&num=1`;
          
          const response = await fetch(serpApiUrl);
          const data = await response.json();

          if (data.organic_results && data.organic_results.length > 0) {
            scrapedResults.push({
              url,
              success: true,
              title: data.organic_results[0].title,
              snippet: data.organic_results[0].snippet,
              cached_page: data.organic_results[0].cached_page_link
            });
          } else {
            scrapedResults.push({
              url,
              success: false,
              error: 'No results found'
            });
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (e) {
          console.error(`Error scraping ${url}:`, e.message);
          scrapedResults.push({
            url,
            success: false,
            error: e.message
          });
        }
      }

      enrichedData.enriched = scrapedResults.some(r => r.success);
      enrichedData.primary_source = 'serpapi';
      enrichedData.scraped_urls = scrapedResults;
      enrichedData.data = {
        total_urls: urls.length,
        scraped_count: scrapedResults.length,
        successful_scrapes: scrapedResults.filter(r => r.success).length
      };

      // Log to API responses
      await supabase.from('api_responses').insert({
        research_job_id,
        api_name: 'serpapi',
        endpoint: 'web_scraping',
        request_payload: { urls },
        response_payload: { results: scrapedResults },
        status_code: 200
      });
    }

    // If no SERPAPI key
    if (!serpapiKey) {
      enrichedData.error = 'SERPAPI key not configured for web scraping';
    }

    return new Response(
      JSON.stringify(enrichedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Web scraping error:', error);
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
