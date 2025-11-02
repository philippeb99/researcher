import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { research_job_id, insight_type = 'general' } = await req.json();

    if (!research_job_id) {
      throw new Error('research_job_id is required');
    }

    console.log('Getting historical insights for:', research_job_id);

    // Fetch current research job
    const { data: currentJob, error: jobError } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', research_job_id)
      .single();

    if (jobError) throw jobError;

    // Fetch embeddings for semantic search
    const { data: currentEmbeddings } = await supabase
      .from('research_embeddings')
      .select('*')
      .eq('research_job_id', research_job_id)
      .eq('content_type', 'company_overview')
      .single();

    let insights: any = {
      similar_companies: [],
      industry_trends: [],
      executive_patterns: [],
      success_factors: [],
    };

    // Find similar companies using vector search
    if (currentEmbeddings?.embedding) {
      try {
        const { data: similarMatches } = await supabase.rpc('match_research_embeddings', {
          query_embedding: currentEmbeddings.embedding,
          match_threshold: 0.7,
          match_count: 10,
        });

        if (similarMatches) {
          const similarJobIds = similarMatches
            .filter((m) => m.research_job_id !== research_job_id)
            .map((m) => m.research_job_id)
            .slice(0, 5);

          if (similarJobIds.length > 0) {
            const { data: similarJobs } = await supabase
              .from('research_jobs')
              .select('company_name, location, industry_business_model, market_position, contact_status')
              .in('id', similarJobIds);

            insights.similar_companies = similarJobs || [];
          }
        }
      } catch (error) {
        console.error('Error finding similar companies:', error);
      }
    }

    // Analyze industry patterns
    if (currentJob.industry_business_model) {
      const industryKeywords = currentJob.industry_business_model
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 5)
        .slice(0, 3);

      if (industryKeywords.length > 0) {
        const { data: industryJobs } = await supabase
          .from('research_jobs')
          .select('company_name, market_position, contact_status, recent_developments')
          .neq('id', research_job_id)
          .limit(20);

        if (industryJobs) {
          const relevantJobs = industryJobs.filter((job) =>
            industryKeywords.some((keyword) =>
              job.market_position?.toLowerCase().includes(keyword)
            )
          );

          insights.industry_trends = relevantJobs.slice(0, 5);
        }
      }
    }

    // Analyze executive patterns
    const { data: currentExecs } = await supabase
      .from('executives')
      .select('position, interests, summary')
      .eq('research_job_id', research_job_id);

    if (currentExecs && currentExecs.length > 0) {
      const positions = currentExecs.map((e) => e.position.toLowerCase());

      const { data: similarExecs } = await supabase
        .from('executives')
        .select('name, position, interests, summary, research_job_id')
        .neq('research_job_id', research_job_id)
        .limit(50);

      if (similarExecs) {
        const relevantExecs = similarExecs
          .filter((exec) =>
            positions.some((pos) => exec.position.toLowerCase().includes(pos))
          )
          .slice(0, 5);

        insights.executive_patterns = relevantExecs;
      }
    }

    // Generate AI-powered insights summary
    const insightsPrompt = `Based on the following historical data, provide key insights and recommendations for reaching out to ${currentJob.company_name}:

Current Company:
- Name: ${currentJob.company_name}
- Industry: ${currentJob.industry_business_model || 'N/A'}
- Market Position: ${currentJob.market_position || 'N/A'}

Similar Companies Found: ${insights.similar_companies.length}
${insights.similar_companies.map((c: any) => `- ${c.company_name}: ${c.market_position || 'N/A'}`).join('\n')}

Industry Trends: ${insights.industry_trends.length} related companies
Executive Patterns: ${insights.executive_patterns.length} similar executives found

Provide:
1. Key success factors from similar companies
2. Common approach strategies
3. Industry-specific insights
4. Recommended talking points

Keep it concise and actionable.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing business patterns and providing actionable insights.',
          },
          { role: 'user', content: insightsPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }

    const data = await response.json();
    insights.ai_summary = data.choices[0].message.content;

    // Calculate success rate from similar companies
    const successfulContacts = insights.similar_companies.filter(
      (c: any) => c.contact_status && c.contact_status !== 'new'
    ).length;
    insights.success_rate = insights.similar_companies.length > 0
      ? (successfulContacts / insights.similar_companies.length * 100).toFixed(1)
      : 0;

    console.log('Successfully generated historical insights');

    return new Response(
      JSON.stringify({
        success: true,
        insights,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-historical-insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
