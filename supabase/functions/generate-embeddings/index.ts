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

    const { research_job_id } = await req.json();

    if (!research_job_id) {
      throw new Error('research_job_id is required');
    }

    console.log('Generating embeddings for research job:', research_job_id);

    // Fetch research job data
    const { data: job, error: jobError } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', research_job_id)
      .single();

    if (jobError) throw jobError;

    // Fetch executives
    const { data: executives, error: execError } = await supabase
      .from('executives')
      .select('*')
      .eq('research_job_id', research_job_id);

    if (execError) throw execError;

    // Fetch news
    const { data: news, error: newsError } = await supabase
      .from('news_items')
      .select('*')
      .eq('research_job_id', research_job_id);

    if (newsError) throw newsError;

    const embeddingsToCreate = [];

    // Generate embedding for company overview (combining multiple fields)
    const overviewParts = [];
    if (job.company_overview) overviewParts.push(job.company_overview);
    if (job.industry_business_model) overviewParts.push(`Industry & Business Model: ${job.industry_business_model}`);
    if (job.market_position) overviewParts.push(`Market Position: ${job.market_position}`);
    
    if (overviewParts.length > 0) {
      const overviewText = `Company: ${job.company_name}\nLocation: ${job.location}\n${overviewParts.join('\n\n')}`;
      embeddingsToCreate.push({
        content_type: 'overview',
        content_text: overviewText,
        metadata: {
          company_name: job.company_name,
          location: job.location,
        },
      });
    }

    // Generate embeddings for executives
    if (executives && executives.length > 0) {
      for (const exec of executives) {
        const execText = `Executive: ${exec.name}\nPosition: ${exec.position}\nCompany: ${job.company_name}\nSummary: ${exec.summary || ''}\nInterests: ${exec.interests || ''}`;
        embeddingsToCreate.push({
          content_type: 'executive',
          content_text: execText,
          metadata: {
            executive_id: exec.id,
            executive_name: exec.name,
            position: exec.position,
            company_name: job.company_name,
          },
        });
      }
    }

    // Generate embeddings for news items
    if (news && news.length > 0) {
      for (const item of news) {
        const newsText = `News: ${item.title}\nCompany: ${job.company_name}\nSummary: ${item.summary}`;
        embeddingsToCreate.push({
          content_type: 'news',
          content_text: newsText,
          metadata: {
            news_id: item.id,
            title: item.title,
            url: item.url,
            company_name: job.company_name,
            published_date: item.published_date,
          },
        });
      }
    }

    console.log(`Creating ${embeddingsToCreate.length} embeddings`);

    // Generate embeddings using OpenAI
    const embeddingsWithVectors = [];
    for (const embedding of embeddingsToCreate) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: embedding.content_text,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI embedding error:', errorText);
          continue;
        }

        const data = await response.json();
        const vector = data.data[0].embedding;

        embeddingsWithVectors.push({
          research_job_id,
          content_type: embedding.content_type,
          content_text: embedding.content_text,
          embedding: vector,
          metadata: embedding.metadata,
        });
      } catch (error) {
        console.error('Error generating embedding:', error);
      }
    }

    // Delete existing embeddings for this research job
    await supabase
      .from('research_embeddings')
      .delete()
      .eq('research_job_id', research_job_id);

    // Insert new embeddings
    if (embeddingsWithVectors.length > 0) {
      const { error: insertError } = await supabase
        .from('research_embeddings')
        .insert(embeddingsWithVectors);

      if (insertError) {
        console.error('Error inserting embeddings:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully created ${embeddingsWithVectors.length} embeddings`);

    return new Response(
      JSON.stringify({
        success: true,
        embeddings_created: embeddingsWithVectors.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-embeddings:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
