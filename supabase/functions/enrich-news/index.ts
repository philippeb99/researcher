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
  ceo_name: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  website_url: z.string().url({ message: "Invalid website_url format" }).optional().or(z.literal('')),
});

interface NewsEnrichmentRequest {
  research_job_id: string;
  company_name: string;
  ceo_name?: string;
  country?: string;
  city?: string;
  website_url?: string;
}

interface RelevanceFactors {
  companyMention: boolean;
  locationMatch: boolean;
  websiteDomainMatch: boolean;
  dateRelevance: number;
  relevanceScore: number;
}

function calculateRelevanceScore(
  newsItem: any,
  companyName: string,
  ceoName?: string,
  country?: string,
  city?: string,
  websiteUrl?: string
): number {
  let score = 0;
  const text = (newsItem.title + ' ' + (newsItem.snippet || '')).toLowerCase();
  const companyLower = companyName.toLowerCase();

  // Generate company variations for partial matching
  const withoutSuffix = companyName.replace(/\s+(Inc\.|LLC|Ltd\.|Corporation|Corp\.|Limited)$/i, '');
  const withoutPunctuation = companyName.replace(/[:\-\.]/g, ' ').replace(/\s+/g, ' ').trim();

  // Company name mentioned - full or partial match
  if (text.includes(companyLower)) {
    score += 50; // Full match
  } else if (withoutSuffix !== companyName && text.includes(withoutSuffix.toLowerCase())) {
    score += 35; // Match without suffix
  } else if (withoutPunctuation !== companyName && text.includes(withoutPunctuation.toLowerCase())) {
    score += 25; // Match without punctuation
  }

  // CEO name mentioned (optional bonus, 15 points)
  if (ceoName && text.includes(ceoName.toLowerCase())) {
    score += 15;
  }

  // Location mentioned (30 points for country, 20 bonus for city)
  if (country && text.includes(country.toLowerCase())) {
    score += 30;
  }
  if (city && text.includes(city.toLowerCase())) {
    score += 20;
  }

  // Website domain in article (40 points)
  if (websiteUrl) {
    try {
      const websiteDomain = new URL(websiteUrl).hostname.replace('www.', '');
      if (text.includes(websiteDomain)) {
        score += 40;
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }

  // Date recency (0-20 points)
  if (newsItem.date) {
    try {
      const daysOld = Math.floor((Date.now() - new Date(newsItem.date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld < 30) score += 20;
      else if (daysOld < 90) score += 15;
      else if (daysOld < 180) score += 10;
      else if (daysOld < 365) score += 5;
    } catch (e) {
      // Invalid date, skip
    }
  }

  return score;
}

function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
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

    const { research_job_id, company_name, ceo_name, country, city, website_url }: NewsEnrichmentRequest = validationResult.data;

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

    console.log(`News enrichment for ${company_name}, Location: ${city}, ${country}`);

    // Fetch existing research job data for context
    const { data: researchJob } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', research_job_id)
      .single();

    // Fetch existing news items to avoid duplicates
    const { data: existingNews } = await supabase
      .from('news_items')
      .select('url')
      .eq('research_job_id', research_job_id);
    
    const existingUrls = new Set(existingNews?.map(n => n.url) || []);
    console.log(`Found ${existingUrls.size} existing news items`);

    const enrichedData: any = {
      source: 'news',
      enriched: false,
      data: {},
      fallback_used: false,
      news_items: [],
      new_items_added: 0,
      filtered_low_relevance: 0
    };

    // Use SERPAPI for news (primary source for news)
    const serpapiKey = Deno.env.get('SERPAPI_API_KEY');
    if (serpapiKey) {
      try {
        console.log('Using SERPAPI for news enrichment...');
        
        // Generate company name variations to catch different phrasings
        const companyVariations = [];
        companyVariations.push(`"${company_name}"`); // Exact match

        // Add variation without "Inc.", "LLC", etc.
        const withoutSuffix = company_name.replace(/\s+(Inc\.|LLC|Ltd\.|Corporation|Corp\.|Limited)$/i, '');
        if (withoutSuffix !== company_name) {
          companyVariations.push(`"${withoutSuffix}"`);
        }

        // Add variation without punctuation (11:11 → 11 11)
        const withoutPunctuation = company_name.replace(/[:\-\.]/g, ' ').replace(/\s+/g, ' ').trim();
        if (withoutPunctuation !== company_name && withoutPunctuation.length > 3) {
          companyVariations.push(`"${withoutPunctuation}"`);
        }

        // Build query: company variations with OR, location as context, CEO optional
        const companyQuery = companyVariations.join(' OR ');
        const locationContext = city && country 
          ? `${city} ${country}` 
          : country 
            ? country 
            : '';

        // CEO name and location are context, not requirements
        const searchQuery = `(${companyQuery}) news ${locationContext}`;
        const serpApiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${serpapiKey}&tbm=nws&num=30`;
        
        console.log('Original company name:', company_name);
        console.log('Company variations:', companyVariations.join(', '));
        console.log('Final search query:', searchQuery);
        console.log('Location context:', locationContext);
        
        const response = await fetch(serpApiUrl);
        const data = await response.json();

        if (data.news_results && data.news_results.length > 0) {
          console.log(`Found ${data.news_results.length} news results, calculating relevance...`);
          
          // Calculate relevance scores for all news items
          const scoredNews = data.news_results.map((item: any) => {
            const relevanceScore = calculateRelevanceScore(
              item,
              company_name,
              ceo_name,
              country || researchJob?.country,
              city || researchJob?.city,
              website_url || researchJob?.website_url
            );
            
            return {
              ...item,
              relevance_score: relevanceScore,
              confidence_level: getConfidenceLevel(relevanceScore)
            };
          });

          // Filter by relevance threshold (35+ - lowered for better recall)
          const relevantNews = scoredNews.filter((item: any) => item.relevance_score >= 35);
          const lowRelevanceCount = scoredNews.length - relevantNews.length;
          
          console.log(`Filtered out ${lowRelevanceCount} low-relevance items (< 35 score)`);
          console.log(`Keeping ${relevantNews.length} relevant items`);
          if (scoredNews.length > 0) {
            console.log('Sample scores:', scoredNews.slice(0, 5).map((n: any) => ({
              title: n.title.substring(0, 60),
              score: n.relevance_score
            })));
          }
          
          // Sort by relevance score
          const sortedNews = relevantNews.sort((a: any, b: any) => b.relevance_score - a.relevance_score);

          enrichedData.enriched = true;
          enrichedData.primary_source = 'serpapi';
          enrichedData.filtered_low_relevance = lowRelevanceCount;
          
          // Process news items
          const newsItems = sortedNews.map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            date: item.date,
            source: item.source,
            thumbnail: item.thumbnail,
            relevance_score: item.relevance_score,
            confidence_level: item.confidence_level
          }));

          enrichedData.news_items = newsItems;
          enrichedData.data = {
            total_results: newsItems.length,
            filtered_count: lowRelevanceCount,
            latest_news: newsItems.slice(0, 5)
          };

          // Filter out duplicate URLs and store new items
          const newNewsItems = newsItems
            .filter((item: any) => !existingUrls.has(item.link))
            .slice(0, 15) // Keep top 15 most relevant
            .map((item: any) => {
              const domain = new URL(item.link).hostname.replace('www.', '');
              return {
                research_job_id,
                title: item.title,
                url: item.link,
                summary: item.snippet || '',
                snippet: item.snippet || '',
                source_domain: domain,
                published_date: item.date ? new Date(item.date).toISOString() : null,
                keywords: [company_name, ...(ceo_name ? [ceo_name] : [])],
                confidence_level: item.confidence_level,
                relevance_score: item.relevance_score
              };
            });

          if (newNewsItems.length > 0) {
            const { error: insertError } = await supabase.from('news_items').insert(newNewsItems);
            if (!insertError) {
              enrichedData.new_items_added = newNewsItems.length;
              console.log(`Added ${newNewsItems.length} new news items with relevance scores`);
            } else {
              console.error('Error inserting news items:', insertError);
            }
          }

          // Log to API responses with full debug info
          await supabase.from('api_responses').insert({
            research_job_id,
            api_name: 'serpapi',
            endpoint: 'news_search',
            request_payload: { 
              query: searchQuery,
              num_results: 30,
              location_context: locationContext
            },
            response_payload: {
              total_found: data.news_results.length,
              relevant_after_filter: relevantNews.length,
              filtered_low_relevance: lowRelevanceCount,
              sample_scores: scoredNews.slice(0, 5).map((n: any) => ({
                title: n.title.substring(0, 50) + '...',
                score: n.relevance_score
              }))
            },
            response_text: JSON.stringify(data, null, 2),
            status_code: 200
          });
        } else {
          console.log('No news results found');
        }
      } catch (e) {
        console.error('SERPAPI news error:', e.message);
        enrichedData.error = e.message;
        await supabase.from('api_responses').insert({
          research_job_id,
          api_name: 'serpapi',
          endpoint: 'news_search',
          error_message: e.message,
          response_text: e.stack,
          status_code: 500
        });
      }
    }

    // If no SERPAPI, return with note
    if (!serpapiKey) {
      enrichedData.error = 'SERPAPI key not configured for news enrichment';
    }

    return new Response(
      JSON.stringify(enrichedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('News enrichment error:', error);
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
