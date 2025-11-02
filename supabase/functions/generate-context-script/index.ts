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

    const {
      research_job_id,
      script_type,
      user_context = '',
      include_similar_companies = true,
    } = await req.json();

    if (!research_job_id || !script_type) {
      throw new Error('research_job_id and script_type are required');
    }

    console.log('Generating context-aware script for:', research_job_id, script_type);

    // Fetch research job data
    const { data: job, error: jobError } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', research_job_id)
      .single();

    if (jobError) throw jobError;

    // Fetch executives
    const { data: executives } = await supabase
      .from('executives')
      .select('*')
      .eq('research_job_id', research_job_id);

    // Fetch news
    const { data: news } = await supabase
      .from('news_items')
      .select('*')
      .eq('research_job_id', research_job_id)
      .limit(5);

    // Fetch embeddings for this research job
    const { data: embeddings } = await supabase
      .from('research_embeddings')
      .select('*')
      .eq('research_job_id', research_job_id);

    // Build RAG context
    let ragContext = `# Company Research Data\n\n`;
    ragContext += `Company: ${job.company_name}\n`;
    ragContext += `Location: ${job.location}\n`;
    ragContext += `CEO: ${job.ceo_name}\n\n`;

    if (job.company_overview) {
      ragContext += `## Company Overview\n${job.company_overview}\n\n`;
    }

    if (job.industry_business_model) {
      ragContext += `## Industry & Business Model\n${job.industry_business_model}\n\n`;
    }

    if (job.market_position) {
      ragContext += `## Market Position\n${job.market_position}\n\n`;
    }

    if (job.recent_developments) {
      ragContext += `## Recent Developments\n${job.recent_developments}\n\n`;
    }

    if (executives && executives.length > 0) {
      ragContext += `## Key Executives\n`;
      executives.forEach((exec) => {
        ragContext += `- ${exec.name} (${exec.position})`;
        if (exec.summary) ragContext += `: ${exec.summary}`;
        ragContext += `\n`;
      });
      ragContext += `\n`;
    }

    if (news && news.length > 0) {
      ragContext += `## Recent News\n`;
      news.forEach((item) => {
        ragContext += `- ${item.title}: ${item.summary}\n`;
        ragContext += `  Source: ${item.url}\n`;
      });
      ragContext += `\n`;
    }

    // Find similar companies if requested
    if (include_similar_companies && embeddings && embeddings.length > 0) {
      try {
        // Use the first company overview embedding to find similar companies
        const overviewEmb = embeddings.find((e) => e.content_type === 'company_overview');
        
        if (overviewEmb && overviewEmb.embedding) {
          const { data: similar } = await supabase.rpc('match_research_embeddings', {
            query_embedding: overviewEmb.embedding,
            match_threshold: 0.75,
            match_count: 3,
          });

          if (similar && similar.length > 1) {
            // Filter out the current company
            const otherCompanies = similar.filter((s) => s.research_job_id !== research_job_id);
            
            if (otherCompanies.length > 0) {
              ragContext += `## Similar Companies (for context)\n`;
              for (const comp of otherCompanies.slice(0, 2)) {
                const { data: compJob } = await supabase
                  .from('research_jobs')
                  .select('company_name, company_overview')
                  .eq('id', comp.research_job_id)
                  .single();

                if (compJob) {
                  ragContext += `- ${compJob.company_name}: ${compJob.company_overview?.substring(0, 200)}...\n`;
                }
              }
              ragContext += `\n`;
            }
          }
        }
      } catch (error) {
        console.error('Error finding similar companies:', error);
      }
    }

    // Generate script using OpenAI with RAG context
    const systemPrompt = `You are an expert at creating personalized business outreach scripts. Use the provided research data to create a highly personalized and contextual script. Reference specific details from the research to show genuine interest and preparation.`;

    let userPrompt = `Create a ${script_type} script using the following research data:\n\n${ragContext}`;
    
    if (user_context) {
      userPrompt += `\n\nAdditional Context from User:\n${user_context}\n`;
    }

    userPrompt += `\n\nScript Requirements:
- Be specific and reference actual details from the research
- Show genuine interest and preparation
- Keep it concise and professional
- Include a clear call-to-action
- Personalize based on the company's recent developments and market position`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }

    const data = await response.json();
    const generatedScript = data.choices[0].message.content;

    console.log('Successfully generated context-aware script');

    return new Response(
      JSON.stringify({
        success: true,
        script: generatedScript,
        context_used: {
          company_data: true,
          executives_count: executives?.length || 0,
          news_count: news?.length || 0,
          similar_companies: include_similar_companies,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-context-script:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
