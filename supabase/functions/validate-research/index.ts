import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  research_job_id: string;
  enrichment_results: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { research_job_id, enrichment_results }: ValidationRequest = await req.json();

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

    console.log(`Validating research for job: ${research_job_id}`);

    // Calculate validation score based on multiple factors
    let validationScore = 0;
    const validationDetails: any = {
      sources_validated: 0,
      cross_validation_checks: [],
      confidence_factors: []
    };

    // Factor 1: Number of successful sources (0-40 points)
    const successfulSources = Object.values(enrichment_results).filter(
      (r: any) => r.success
    ).length;
    const totalSources = Object.keys(enrichment_results).length;
    const sourceScore = (successfulSources / totalSources) * 40;
    validationScore += sourceScore;
    validationDetails.sources_validated = successfulSources;
    validationDetails.confidence_factors.push({
      factor: 'source_coverage',
      score: sourceScore,
      details: `${successfulSources}/${totalSources} sources successful`
    });

    // Factor 2: Data consistency across sources (0-30 points)
    let consistencyScore = 0;
    const dataPoints: Record<string, Set<string>> = {};
    
    // Extract common data points from results
    Object.values(enrichment_results).forEach((result: any) => {
      if (result.success && result.data) {
        // Track mentions across sources for cross-validation
        Object.keys(result.data).forEach(key => {
          if (!dataPoints[key]) dataPoints[key] = new Set();
          dataPoints[key].add(result.source);
        });
      }
    });

    // More consistent data across sources = higher score
    const crossValidatedFields = Object.values(dataPoints).filter(
      sources => sources.size > 1
    ).length;
    consistencyScore = Math.min(30, crossValidatedFields * 5);
    validationScore += consistencyScore;
    validationDetails.cross_validation_checks.push({
      check: 'data_consistency',
      score: consistencyScore,
      cross_validated_fields: crossValidatedFields
    });

    // Factor 3: Source credibility (0-20 points)
    let credibilityScore = 0;
    const sources = Object.values(enrichment_results)
      .filter((r: any) => r.success)
      .map((r: any) => r.primary_source || r.source);

    // Check source credibility from our database
    if (sources.length > 0) {
      const { data: credibilityData } = await supabase
        .from('source_credibility')
        .select('domain, credibility_score')
        .in('domain', sources);

      if (credibilityData && credibilityData.length > 0) {
        const avgCredibility = credibilityData.reduce(
          (sum, s) => sum + parseFloat(s.credibility_score.toString()),
          0
        ) / credibilityData.length;
        credibilityScore = avgCredibility * 20;
      } else {
        // Default credibility if no data
        credibilityScore = 10;
      }
    }
    validationScore += credibilityScore;
    validationDetails.confidence_factors.push({
      factor: 'source_credibility',
      score: credibilityScore,
      sources_checked: sources
    });

    // Factor 4: Fallback usage penalty (0-10 points)
    const fallbacksUsed = Object.values(enrichment_results).filter(
      (r: any) => r.fallback_used
    ).length;
    const fallbackScore = Math.max(0, 10 - (fallbacksUsed * 2.5));
    validationScore += fallbackScore;
    validationDetails.confidence_factors.push({
      factor: 'primary_source_usage',
      score: fallbackScore,
      fallbacks_used: fallbacksUsed
    });

    // Cap at 100
    validationScore = Math.min(100, Math.round(validationScore));

    // Determine confidence level
    let confidenceLevel = 'low';
    if (validationScore >= 80) confidenceLevel = 'high';
    else if (validationScore >= 60) confidenceLevel = 'medium';

    // Update executives with confidence scores
    const { data: executives } = await supabase
      .from('executives')
      .select('id')
      .eq('research_job_id', research_job_id);
    
    if (executives && executives.length > 0) {
      const execUpdates = executives.map(exec => ({
        id: exec.id,
        confidence_score: Math.round(validationScore * 0.9), // Slightly lower than overall
        last_verified_at: new Date().toISOString()
      }));
      
      for (const update of execUpdates) {
        await supabase
          .from('executives')
          .update({ 
            confidence_score: update.confidence_score,
            last_verified_at: update.last_verified_at
          })
          .eq('id', update.id);
      }
    }

    // Update news items with credibility scores
    const { data: newsItems } = await supabase
      .from('news_items')
      .select('id, source_domain')
      .eq('research_job_id', research_job_id);
    
    if (newsItems && newsItems.length > 0) {
      for (const news of newsItems) {
        if (news.source_domain) {
          const { data: credibility } = await supabase
            .from('source_credibility')
            .select('credibility_score')
            .eq('domain', news.source_domain)
            .single();
          
          await supabase
            .from('news_items')
            .update({ 
              source_credibility_score: credibility?.credibility_score || 50 
            })
            .eq('id', news.id);
        }
      }
    }

    // Log validation results
    await supabase.from('validation_logs').insert({
      research_job_id,
      validation_type: 'hybrid_orchestration',
      validation_result: {
        validation_score: validationScore,
        confidence_level: confidenceLevel,
        details: validationDetails
      },
      input_data: enrichment_results,
      confidence_score: validationScore,
      model_used: 'hybrid_orchestration_v1',
      processing_time_ms: 0
    });

    console.log(`Validation completed with score: ${validationScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        research_job_id,
        validation_score: validationScore,
        confidence_level: confidenceLevel,
        validation_details: validationDetails,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
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
