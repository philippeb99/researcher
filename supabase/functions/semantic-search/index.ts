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

    const { query, content_type, limit = 10, threshold = 0.7 } = await req.json();

    if (!query) {
      throw new Error('query is required');
    }

    console.log('Performing semantic search for:', query);

    // Generate embedding for the query
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }

    const data = await response.json();
    const queryEmbedding = data.data[0].embedding;

    // Perform vector similarity search
    let rpcQuery = supabase.rpc('match_research_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });

    const { data: matches, error: matchError } = await rpcQuery;

    if (matchError) {
      // Fallback: use cosine distance with manual filtering
      console.log('RPC function not available, using manual search');
      
      let query = supabase
        .from('research_embeddings')
        .select('*, research_jobs(company_name, location, status)');

      if (content_type) {
        query = query.eq('content_type', content_type);
      }

      const { data: allEmbeddings, error: embError } = await query.limit(1000);

      if (embError) throw embError;

      // Calculate cosine similarity manually
      const results = allEmbeddings
        .map((emb) => {
          if (!emb.embedding) return null;
          
          const similarity = cosineSimilarity(queryEmbedding, emb.embedding);
          return {
            ...emb,
            similarity,
          };
        })
        .filter((r) => r !== null && r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return new Response(
        JSON.stringify({
          success: true,
          results,
          count: results.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Enrich matches with research job data
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const { data: job } = await supabase
          .from('research_jobs')
          .select('company_name, location, status, ceo_name')
          .eq('id', match.research_job_id)
          .single();

        return {
          ...match,
          research_job: job,
        };
      })
    );

    console.log(`Found ${enrichedMatches.length} similar results`);

    return new Response(
      JSON.stringify({
        success: true,
        results: enrichedMatches,
        count: enrichedMatches.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in semantic-search:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
