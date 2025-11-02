import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const requestSchema = z.object({
  research_job_id: z.string().uuid({ message: 'Invalid research_job_id format' }),
  phases: z.array(z.string()).optional().default(['all'])
});

interface OrchestrationRequest {
  research_job_id: string;
  phases?: string[]; // Optional: specify which phases to run
}

interface EnrichmentResult {
  source: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request body
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { research_job_id, phases } = validationResult.data;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user context for RLS
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership or super_admin access
    const { data: job, error: jobError } = await supabaseAuth
      .from('research_jobs')
      .select('user_id')
      .eq('id', research_job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Research job not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns the job or is super_admin
    if (job.user_id !== user.id) {
      const { data: isSuperAdmin } = await supabaseAuth
        .rpc('has_role', { _user_id: user.id, _role: 'super_admin' });
      
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Starting orchestration for research job: ${research_job_id}`);

    // Now safe to use service role for internal operations
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

    // Fetch full research job details with existing data
    const { data: fullJob, error: fullJobError } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', research_job_id)
      .single();

    if (fullJobError || !fullJob) {
      throw new Error(`Research job not found: ${fullJobError?.message}`);
    }

    // Fetch existing enrichment phases
    const existingPhases = fullJob.enrichment_phases || [];
    console.log('Existing enrichment phases:', existingPhases);

    // Update status to enriching
    await supabase
      .from('research_jobs')
      .update({ 
        enrichment_status: 'enriching',
        updated_at: new Date().toISOString()
      })
      .eq('id', research_job_id);

    const results: Record<string, EnrichmentResult> = {};
    const dataSources: string[] = [];

    // Phase 1: LinkedIn enrichment (CEO and executives)
    if (phases.includes('all') || phases.includes('linkedin')) {
      console.log('Running LinkedIn enrichment...');
      try {
        const { data: linkedinData, error: linkedinError } = await supabase.functions.invoke(
          'enrich-linkedin',
          { 
            body: { 
              research_job_id,
              ceo_linkedin_url: fullJob.ceo_linkedin_url,
              company_name: fullJob.company_name
            }
          }
        );

        results.linkedin = {
          source: 'linkedin',
          success: !linkedinError,
          data: linkedinData,
          error: linkedinError?.message,
          timestamp: new Date().toISOString()
        };

        if (!linkedinError && linkedinData?.enriched) {
          dataSources.push('crustdata', 'serpapi');
        }
      } catch (e) {
        results.linkedin = {
          source: 'linkedin',
          success: false,
          error: e.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Phase 2: Company data enrichment
    if (phases.includes('all') || phases.includes('company')) {
      console.log('Running company enrichment...');
      try {
        const { data: companyData, error: companyError } = await supabase.functions.invoke(
          'enrich-company',
          { 
            body: { 
              research_job_id,
              company_name: fullJob.company_name,
              website_url: fullJob.website_url
            }
          }
        );

        results.company = {
          source: 'company',
          success: !companyError,
          data: companyData,
          error: companyError?.message,
          timestamp: new Date().toISOString()
        };

        if (!companyError && companyData?.enriched) {
          dataSources.push('crunchbase', 'serpapi');
        }
      } catch (e) {
        results.company = {
          source: 'company',
          success: false,
          error: e.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Phase 3: News enrichment
    if (phases.includes('all') || phases.includes('news')) {
      console.log('Running news enrichment...');
      try {
        const { data: newsData, error: newsError } = await supabase.functions.invoke(
          'enrich-news',
          { 
            body: { 
              research_job_id,
              company_name: fullJob.company_name,
              ceo_name: fullJob.ceo_name,
              country: fullJob.country,
              city: fullJob.city,
              website_url: fullJob.website_url
            }
          }
        );

        results.news = {
          source: 'news',
          success: !newsError,
          data: newsData,
          error: newsError?.message,
          timestamp: new Date().toISOString()
        };

        if (!newsError && newsData?.enriched) {
          dataSources.push('serpapi', 'newsdata');
        }
      } catch (e) {
        results.news = {
          source: 'news',
          success: false,
          error: e.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Phase 4: Web scraping for additional context
    if (phases.includes('all') || phases.includes('web')) {
      console.log('Running web scraping...');
      try {
        const { data: webData, error: webError } = await supabase.functions.invoke(
          'enrich-web-scraping',
          { 
            body: { 
              research_job_id,
              urls: [fullJob.website_url, ...(fullJob.additional_urls || [])]
            }
          }
        );

        results.web = {
          source: 'web',
          success: !webError,
          data: webData,
          error: webError?.message,
          timestamp: new Date().toISOString()
        };

        if (!webError && webData?.enriched) {
          dataSources.push('serpapi');
        }
      } catch (e) {
        results.web = {
          source: 'web',
          success: false,
          error: e.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Phase 5: Cross-validation
    console.log('Running validation...');
    let validationScore = 0;
    try {
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        'validate-research',
        { 
          body: { 
            research_job_id,
            enrichment_results: results
          }
        }
      );

      if (!validationError && validationData?.validation_score !== undefined) {
        validationScore = validationData.validation_score;
      }
    } catch (e) {
      console.error('Validation error:', e.message);
    }

    // Update research job with enrichment metadata
    const successfulSources = Object.values(results).filter(r => r.success).length;
    const totalSources = Object.values(results).length;
    const completedPhases = [...existingPhases, ...phases.filter(p => p !== 'all')];

    await supabase
      .from('research_jobs')
      .update({
        enrichment_status: 'enriched',
        enrichment_phases: [...new Set(completedPhases)],
        enrichment_metadata: {
          orchestration_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          phases_run: phases,
          results_summary: {
            successful: successfulSources,
            total: totalSources,
            success_rate: (successfulSources / totalSources) * 100
          },
          detailed_results: results
        },
        data_sources: [...new Set([...(fullJob.data_sources || []), ...dataSources])],
        validation_score: validationScore,
        data_quality_score: validationScore,
        last_enriched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', research_job_id);

    console.log(`Orchestration completed for ${research_job_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        research_job_id,
        phases_executed: phases,
        results,
        validation_score: validationScore,
        summary: {
          successful_sources: successfulSources,
          total_sources: totalSources,
          data_sources: [...new Set(dataSources)]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[INTERNAL] Orchestration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Unable to process orchestration request',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
