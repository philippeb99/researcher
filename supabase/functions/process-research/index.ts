import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request validation schema
const requestSchema = z.object({
  research_job_id: z.string().uuid({ message: "Invalid research_job_id format" })
});

// Interface for extracted executives with confidence levels
interface ExtractedExecutive {
  name: string;
  position: string;
  linkedin_url?: string;
  summary?: string;
  confidence_level: 'high' | 'medium' | 'low';
  source: 'linkedin' | 'perplexity_content' | 'company_website' | 'merged';
}

// Robust JSON extractor that prefers fenced JSON blocks and falls back to brace-balanced extraction
function extractFirstJsonObject(content: string): any | null {
  console.log("Attempting to extract first JSON object from content");
  
  // First try: Extract JSON from markdown fenced code block (preferred)
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fencedMatch) {
    try {
      const parsed = JSON.parse(fencedMatch[1].trim());
      console.log("✓ Extracted JSON from fenced code block");
      return parsed;
    } catch (e) {
      console.log("Failed to parse JSON from fenced block, trying other methods:", e instanceof Error ? e.message : String(e));
    }
  }
  
  // Second try: Find balanced braces for JSON object
  const startIndex = content.indexOf('{');
  if (startIndex !== -1) {
    let braceCount = 0;
    let inString = false;
    let escaping = false;
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (escaping) {
        escaping = false;
        continue;
      }
      
      if (char === '\\') {
        escaping = true;
        continue;
      }
      
      if (char === '"' && !escaping) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        
        if (braceCount === 0) {
          const jsonStr = content.substring(startIndex, i + 1);
          try {
            const parsed = JSON.parse(jsonStr);
            console.log("✓ Extracted JSON using brace-balanced extraction");
            return parsed;
          } catch (e) {
            console.log("Failed to parse brace-balanced JSON:", e instanceof Error ? e.message : String(e));
            break;
          }
        }
      }
    }
  }
  
  console.log("✗ Could not extract valid JSON object");
  return null;
}

// Helper function to extract JSON from Perplexity responses (handles markdown code blocks)
function extractJsonFromResponse(responseText: string): any[] {
  console.log("Attempting to extract JSON from response");
  
  // Try extracting JSON from markdown code block
  const markdownMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (markdownMatch) {
    try {
      const parsed = JSON.parse(markdownMatch[1].trim());
      console.log("✓ Extracted JSON from markdown block");
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error("Failed to parse JSON from markdown block:", e);
    }
  }
  
  // Try extracting plain JSON array
  const arrayMatch = responseText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      console.log("✓ Extracted plain JSON array");
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error("Failed to parse plain JSON array:", e);
    }
  }
  
  // Try parsing entire response as JSON
  try {
    const parsed = JSON.parse(responseText);
    console.log("✓ Parsed entire response as JSON");
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error("Failed to parse entire response as JSON:", e);
  }
  
  console.error("✗ Could not extract JSON from response");
  return [];
}

// Helper function to log API responses to database
async function logApiResponse(
  supabaseClient: any,
  researchJobId: string,
  apiName: string,
  endpoint: string,
  requestPayload: any,
  responseText: string,
  statusCode: number,
  errorMessage?: string
) {
  try {
    // Parse responseText to store as JSONB payload
    let responseParsed = null;
    try {
      responseParsed = JSON.parse(responseText);
    } catch (e) {
      console.log('Could not parse response as JSON for logging');
    }
    
    await supabaseClient.from('api_responses').insert({
      research_job_id: researchJobId,
      api_name: apiName,
      endpoint: endpoint,
      request_payload: requestPayload,
      response_text: responseText,
      response_payload: responseParsed, // Store parsed JSON
      status_code: statusCode,
      error_message: errorMessage
    });
    console.log(`✓ Logged ${apiName}/${endpoint} API response to database`);
  } catch (error) {
    console.error("Failed to log API response:", error);
  }
}

// Utility functions for URL validation and data parsing
async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    return response.ok;
  } catch (error) {
    console.log(`URL validation failed for ${url}: ${error}`);
    return false;
  }
}

// Fetch and extract text content from a website
async function fetchSiteContext(urls: string[]): Promise<string> {
  let combinedText = '';
  
  for (const url of urls.slice(0, 3)) { // Limit to 3 URLs to avoid timeout
    try {
      console.log(`Fetching site context from: ${url}`);
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        // Strip HTML tags and extract readable text
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Limit text length to avoid token overload
        const limitedText = textContent.substring(0, 5000);
        combinedText += `\n\n=== Content from ${url} ===\n${limitedText}`;
        console.log(`Extracted ${limitedText.length} characters from ${url}`);
      }
    } catch (error) {
      console.log(`Failed to fetch ${url}: ${error}`);
    }
  }
  
  return combinedText.substring(0, 15000); // Overall limit
}

function isLegitimateNewsSource(url: string): boolean {
  const whitelistedDomains = [
    'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'ap.org', 'bbc.com',
    'cnn.com', 'forbes.com', 'fortune.com', 'businessinsider.com', 'techcrunch.com',
    'theverge.com', 'engadget.com', 'arstechnica.com', 'wired.com', 'venturebeat.com',
    'crunchbase.com', 'pitchbook.com', 'axios.com', 'theinformation.com',
    'businesswire.com', 'prnewswire.com', 'marketwatch.com', 'cnbc.com',
    'economist.com', 'guardian.co.uk', 'telegraph.co.uk', 'independent.co.uk',
    'lesechos.fr', 'lemonde.fr', 'lefigaro.fr', 'liberation.fr',
    'handelsblatt.com', 'zeit.de', 'spiegel.de', 'faz.net',
    'corriere.it', 'repubblica.it', 'sole24ore.com',
    'elpais.com', 'elmundo.es', 'expansion.com',
    'nikkei.com', 'japantimes.co.jp', 'scmp.com',
    'abc.net.au', 'smh.com.au', 'afr.com',
    'globo.com', 'folha.uol.com.br', 'estadao.com.br'
  ];
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    return whitelistedDomains.some(whitelist => domain.includes(whitelist));
  } catch {
    return false;
  }
}

function isValidLinkedInProfile(url: string): boolean {
  const linkedinPattern = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-]+\/?$/;
  return linkedinPattern.test(url);
}

function parseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return date >= sixMonthsAgo ? date : null;
  } catch {
    return null;
  }
}

// Stage B: Get background research with citations
async function getBackgroundWithCitations(
  contextText: string, 
  job: any,
  supabaseClient: any,
  researchJobId: string
) {
  console.log(`Starting background research for: ${job.company_name}`);
  
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  // Improved company disambiguation in prompt
  const locationString = [job.city, job.state, job.country].filter(Boolean).join(", ");
  const prompt = `Research the company "${job.company_name}" located in "${locationString}" with website ${job.website_url} (CEO: ${job.ceo_name}).

IMPORTANT: Research specifically about "${job.company_name}" at ${job.website_url}, NOT any other company with a similar name.

${contextText ? `Additional context from company website:\n${contextText}\n\n` : ''}

Provide a comprehensive background summary including:
- Company history and mission
- Products/services and business model  
- Market position and competitive landscape
- Recent developments and news
- Financial information if available
- Key partnerships and alliances

Focus on verifiable information and include citations for all claims. Prefer local-language sources when researching non-English companies.`;

  const requestPayload = {
    model: 'sonar-pro',
    messages: [
      { 
        role: 'system', 
        content: 'You are a business researcher. Provide comprehensive, factual company background with proper citations. Prefer authoritative sources including company websites, business databases, and local news sources.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0,
    max_tokens: 5000,
    enable_search_classifier: true, // Enable Pro Search
    return_images: false,
    return_related_questions: false
  };

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    const responseText = await response.text();
    
    // Log API response for debugging
    await logApiResponse(
      supabaseClient,
      researchJobId,
      'perplexity',
      'background',
      requestPayload,
      responseText,
      response.status,
      response.ok ? undefined : `HTTP ${response.status}`
    );

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = JSON.parse(responseText);
    const backgroundText = data.choices[0]?.message?.content || '';
    
    // Extract citations from Perplexity's structured response
    let citations: string[] = [];
    
    // First try to get citations from data.citations array
    if (data.citations && Array.isArray(data.citations)) {
      citations = data.citations.slice(0, 10);
      console.log(`Extracted ${citations.length} citations from data.citations`);
    }
    
    // Fallback: extract URLs from response content
    if (citations.length === 0) {
      const urlRegex = /https?:\/\/[^\s\)]+/g;
      citations = (backgroundText.match(urlRegex) || []).slice(0, 10);
      console.log(`Extracted ${citations.length} citation URLs from text`);
    }
    
    console.log(`Background research completed`);
    console.log(`Background text length: ${backgroundText.length} characters`);
    
    return { backgroundText, citations };
  } catch (error) {
    console.error('Error in getBackgroundWithCitations:', error);
    return { backgroundText: '', citations: [] };
  }
}

// Stage C: Extract structured data from background
async function getStructuredProfile(backgroundText: string, citations: any[], job: any) {
  console.log(`Extracting structured profile for: ${job.company_name}`);
  
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  const prompt = `Based on the following background research and citations, extract structured company information for "${job.company_name}".

Background Research:
${backgroundText}

Citations Available:
${citations.map((c, i) => `[${i+1}] ${c}`).join('\n')}

CRITICAL: Return ONLY valid JSON in the exact format below. Do not include any text before or after the JSON. If information is not available, use "Unknown".

{
  "company_overview": "Detailed company description and mission based on real information",
  "company_keywords": ["keyword1", "keyword2", "keyword3"],
  "industry_business_model": "Industry analysis and business model description",
  "key_products_customers": "Main products/services and target customers",
  "market_position": "Market position and competitive landscape analysis",
  "recent_developments": "Recent company news and developments",
  "financial_information": "Financial performance and funding information",
  "key_partnerships": "Strategic partnerships and alliances",
  "top_5": [
    {
      "positioning": "Product strength, USP, differentiator",
      "financials": "Revenue, EBITDA, growth, SAM/TAM",
      "key_customers": "Names, industries, relative size and key industry partners and integrations",
      "market_share": "Market size current share, opportunity",
      "opportunity": "Upside potential, growth opportunity"
    }
  ],
  "discussion_topics": [
    {
      "title": "Discussion Topic Title",
      "description": "Detailed description based on real company information",
      "topic_type": "touchpoint",
      "source_references": ["Source URL 1", "Source URL 2"]
    }
  ]
}

Include 5-8 discussion topics. Use only verifiable facts from the research.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { 
            role: 'system', 
            content: 'You are a data extraction specialist. Extract structured information from research text and return only valid JSON. Do not make assumptions - use "Unknown" for missing data.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        max_tokens: 3000,
        enable_search_classifier: true
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorBody}`);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log("Structured extraction response content preview:", content.substring(0, 200));
    
    // Use robust JSON extractor
    const structuredData = extractFirstJsonObject(content);
    if (structuredData) {
      console.log(`✓ Successfully extracted structured data for ${job.company_name}`);
      return structuredData;
    }
    
    console.log("✗ Failed to extract valid JSON from structured profile response");
    return null;
  } catch (error) {
    console.error('Error in getStructuredProfile:', error);
    return null;
  }
}

// Stage D: Get competitors and acquirers with citations
async function getCompetitorsAcquirers(backgroundText: string, citations: any[], job: any) {
  console.log(`Getting competitors and acquirers for: ${job.company_name}`);
  
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  const locationString = [job.city, job.state, job.country].filter(Boolean).join(", ");
  const prompt = `Based on the research about "${job.company_name}" in "${locationString}", identify direct competitors and potential acquirers.

Background Context:
${backgroundText.substring(0, 2000)}

Requirements:
1. List direct competitors with at least 2 independent source citations each
2. List potential acquirers with at least 2 independent source citations each  
3. Only include items with verifiable sources - if fewer than 2 citations, don't include
4. Focus on companies in the same industry/market segment

CRITICAL: Return ONLY valid JSON in the exact format below. No text before or after the JSON.

{
  "competitors": [
    {
      "name": "Competitor Name",
      "location": "Location",  
      "description": "Brief description of how they compete",
      "sources": ["Source URL 1", "Source URL 2"]
    }
  ],
  "likely_acquirers": [
    {
      "name": "Potential Acquirer Name",
      "rationale": "Why they might acquire this company",
      "sources": ["Source URL 1", "Source URL 2"]
    }
  ]
}`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { 
            role: 'system', 
            content: 'You are a competitive intelligence analyst. Find verified competitors and potential acquirers with at least 2 independent sources each. If you cannot find sufficient sources, return empty arrays.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        max_tokens: 2000,
        enable_search_classifier: true
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorBody}`);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const apiCitations: string[] = [];
    
    console.log("Competitors/acquirers response content preview:", content.substring(0, 200));
    
    // Use robust JSON extractor
    const competitorData = extractFirstJsonObject(content);
    if (competitorData) {
      console.log(`✓ Found ${competitorData.competitors?.length || 0} competitors and ${competitorData.likely_acquirers?.length || 0} potential acquirers`);
      return { ...competitorData, apiCitations };
    }
    
    console.log("✗ Failed to extract valid JSON from competitors/acquirers response");
    return { competitors: [], likely_acquirers: [], apiCitations };
  } catch (error) {
    console.error('Error in getCompetitorsAcquirers:', error);
    return { competitors: [], likely_acquirers: [], apiCitations: [] };
  }
}

// Parse executives from JSON response (FIX: no double-parse)
function parseExecutivesFromJSON(content: string): ExtractedExecutive[] {
  try {
    const obj = extractFirstJsonObject(content);
    if (!obj) {
      console.log('No valid JSON found in Perplexity response');
      return [];
    }
    
    // extractFirstJsonObject already returns a parsed object, NOT a string
    // Handle array directly (Perplexity returns array of executives)
    const execs = Array.isArray(obj) ? obj : (obj.executives || []);
    
    const validExecs = execs
      .filter((e: any) => e.name && e.role)
      .map((e: any) => ({
        name: e.name.trim(),
        position: e.role.trim(), // Perplexity uses 'role' not 'position'
        linkedin_url: e.linkedin || e.linkedin_url || e.source_url?.includes('linkedin.com') ? e.source_url : undefined,
        summary: `${e.name} serves as ${e.role}`,
        confidence_level: (e.linkedin || e.linkedin_url) ? 'high' : (e.source_url) ? 'medium' : 'low' as 'high' | 'medium' | 'low',
        source: 'perplexity' as const
      }));
    
    console.log(`✓ Parsed ${validExecs.length} executives from Perplexity JSON`);
    return validExecs;
  } catch (error) {
    console.error('Failed to parse executives:', error);
    return [];
  }
}

// Parse GPT-5 executive search JSON response (FIX: no double-parse, handle both formats)
function parseExecutivesFromGPT5JSON(content: string): ExtractedExecutive[] {
  try {
    const obj = extractFirstJsonObject(content);
    if (!obj) {
      console.log('No valid JSON found in GPT-5 response');
      return [];
    }
    
    // extractFirstJsonObject already returns a parsed object, NOT a string
    const executives: ExtractedExecutive[] = [];
    
    // Handle object format (names as keys)
    if (!Array.isArray(obj) && typeof obj === 'object') {
      for (const [name, data] of Object.entries(obj)) {
        const execData = data as any;
        
        // Skip entries that are not real executives
        if (!execData.role || 
            execData.role?.toLowerCase().includes('not publicly disclosed') || 
            execData.role?.toLowerCase().includes('unknown')) {
          continue;
        }
        
        const linkedin = execData.details?.linkedin || execData.linkedin || undefined;
        const sourceUrl = execData.details?.source || execData.source || execData.source_url || undefined;
        const role = execData.role || execData.position || 'Unknown';
        
        // Determine confidence level
        let confidence: 'high' | 'medium' | 'low' = 'low';
        if (linkedin) {
          confidence = 'high';
        } else if (sourceUrl) {
          confidence = 'medium';
        }
        
        executives.push({
          name: name.trim(),
          position: role.trim(),
          linkedin_url: linkedin,
          summary: `${name} serves as ${role}`,
          confidence_level: confidence,
          source: 'perplexity_content'
        });
      }
    } else {
      // Handle array format
      const execs = Array.isArray(obj) ? obj : (obj.executives || []);
      
      for (const e of execs) {
        if (!e.name || !e.role) continue;
        
        const linkedin = e.linkedin || e.linkedin_url || undefined;
        const sourceUrl = e.source || e.source_url || undefined;
        
        executives.push({
          name: e.name.trim(),
          position: e.role.trim(),
          linkedin_url: linkedin,
          summary: `${e.name} serves as ${e.role}`,
          confidence_level: linkedin ? 'high' : sourceUrl ? 'medium' : 'low',
          source: 'perplexity_content'
        });
      }
    }
    
    console.log(`✓ Parsed ${executives.length} executives from GPT-5 JSON`);
    return executives;
  } catch (error) {
    console.error('Failed to parse GPT-5 executives:', error);
    return [];
  }
}

// Extract executives from company website
async function extractExecutivesFromWebsite(
  websiteUrl: string, 
  companyName: string
): Promise<ExtractedExecutive[]> {
  const executives: ExtractedExecutive[] = [];
  
  // Try multiple common paths for team/leadership pages
  const paths = ['/team', '/about-us', '/leadership', '/about', '/our-team', '/management'];
  
  for (const path of paths) {
    try {
      const targetUrl = websiteUrl.endsWith('/') ? websiteUrl.slice(0, -1) + path : websiteUrl + path;
      console.log(`Fetching website content from: ${targetUrl}`);
      
      const siteContent = await fetchSiteContext([targetUrl]);
      
      if (!siteContent || siteContent.length < 50) {
        continue; // Skip if no content
      }
      
      // Regex patterns to extract executives from HTML/text content
      const patterns = [
        // Pattern 1: HTML heading followed by position
        /<h[2-6][^>]*>([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)<\/h[2-6]>\s*(?:<[^>]+>)*\s*(CEO|CTO|CFO|COO|Chief\s+\w+\s+Officer|VP\s+of\s+\w+|Vice\s+President|President|Director\s+of\s+\w+|Founder|Co-Founder)/gi,
        // Pattern 2: Name followed by dash/comma and position
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[-–—,]\s*(CEO|CTO|CFO|COO|Chief\s+\w+\s+Officer|VP\s+of\s+\w+|Vice\s+President|President|Director\s+of\s+\w+|Founder|Co-Founder)/gi,
        // Pattern 3: Position followed by colon/dash and name
        /(CEO|CTO|CFO|COO|Chief\s+\w+\s+Officer|VP\s+of\s+\w+|Vice\s+President|President|Director\s+of\s+\w+|Founder|Co-Founder)[\s:,\-–—]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi
      ];
      
      const found = new Set<string>();
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(siteContent)) !== null) {
          let name, position;
          
          if (match[1] && match[2]) {
            // Determine which is name vs position
            if (match[1].match(/^(CEO|CTO|CFO|COO|Chief|VP|Vice|President|Director|Founder)/i)) {
              position = match[1];
              name = match[2];
            } else {
              name = match[1];
              position = match[2];
            }
            
            name = name.trim();
            position = position.trim();
            const key = `${name.toLowerCase()}_${position.toLowerCase()}`;
            
            if (!found.has(key) && name.length > 3 && position.length > 2) {
              found.add(key);
              
              executives.push({
                name,
                position,
                linkedin_url: undefined,
                summary: `${name} serves as ${position} at ${companyName}`,
                confidence_level: 'medium', // Medium confidence - found on website but no LinkedIn verification
                source: 'company_website'
              });
            }
          }
        }
      }
      
      if (executives.length > 0) {
        console.log(`Extracted ${executives.length} executives from ${targetUrl}`);
        break; // Stop after finding executives on one page
      }
    } catch (error) {
      console.log(`Could not fetch ${websiteUrl}${path}:`, error);
      continue;
    }
  }
  
  return executives;
}

// Merge executives from multiple sources with smart deduplication
function mergeExecutives(
  websiteExecs: ExtractedExecutive[], 
  perplexityExecs: ExtractedExecutive[]
): ExtractedExecutive[] {
  const merged: ExtractedExecutive[] = [];
  const processedNames = new Set<string>();
  
  // Helper to normalize names for comparison
  const normalizeName = (name: string) => {
    return name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  };
  
  // Helper to calculate name similarity (simple approach)
  const nameSimilarity = (name1: string, name2: string) => {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    
    if (n1 === n2) return 1.0;
    
    // Check if one name contains the other (handles "John Smith" vs "John A. Smith")
    if (n1.includes(n2) || n2.includes(n1)) return 0.9;
    
    // Simple word overlap
    const words1 = n1.split(/\s+/);
    const words2 = n2.split(/\s+/);
    const overlap = words1.filter(w => words2.includes(w)).length;
    
    return overlap / Math.max(words1.length, words2.length);
  };
  
  // Process website executives first
  for (const webExec of websiteExecs) {
    const normalizedName = normalizeName(webExec.name);
    
    // Try to find matching Perplexity executive
    const matchingPerplexity = perplexityExecs.find(pExec => 
      nameSimilarity(webExec.name, pExec.name) > 0.8
    );
    
    if (matchingPerplexity && matchingPerplexity.linkedin_url) {
      // Merge: Website executive matched with LinkedIn from Perplexity
      merged.push({
        name: webExec.name,
        position: webExec.position,
        linkedin_url: matchingPerplexity.linkedin_url,
        summary: matchingPerplexity.summary || webExec.summary,
        confidence_level: 'high', // HIGH: Cross-verified with LinkedIn
        source: 'merged'
      });
      processedNames.add(normalizeName(matchingPerplexity.name));
    } else if (matchingPerplexity) {
      // Matched but no LinkedIn
      merged.push({
        name: webExec.name,
        position: webExec.position,
        linkedin_url: undefined,
        summary: matchingPerplexity.summary || webExec.summary,
        confidence_level: 'medium', // MEDIUM: Cross-verified but no LinkedIn
        source: 'merged'
      });
      processedNames.add(normalizeName(matchingPerplexity.name));
    } else {
      // Website-only executive (user's scenario)
      merged.push({
        ...webExec,
        confidence_level: 'medium' // MEDIUM: Found on website but no cross-verification
      });
    }
    
    processedNames.add(normalizedName);
  }
  
  // Add remaining Perplexity executives that weren't matched
  for (const pExec of perplexityExecs) {
    const normalizedName = normalizeName(pExec.name);
    
    if (!processedNames.has(normalizedName)) {
      // Assign confidence based on whether they have LinkedIn
      const confidence: 'high' | 'medium' | 'low' = 
        pExec.source === 'linkedin' && pExec.linkedin_url ? 'high' :
        pExec.linkedin_url ? 'medium' :
        'low';
      
      merged.push({
        ...pExec,
        confidence_level: confidence
      });
      processedNames.add(normalizedName);
    }
  }
  
  return merged;
}

async function searchRealNews(
  companyName: string, 
  websiteUrl: string,
  location: string,
  supabaseClient: any,
  researchJobId: string
) {
  console.log(`Starting news search for: ${companyName}`);
  
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!perplexityApiKey) {
    return [];
  }

  // Extract domain from website URL for filtering
  let companyDomain = '';
  try {
    const urlObj = new URL(websiteUrl);
    companyDomain = urlObj.hostname.replace('www.', '');
  } catch (e) {
    console.log('Could not parse website URL for domain filtering');
  }

  // Changed strategy: Ask for natural language response with citations
  const prompt = `Find and describe 5-10 legitimate, recent news articles (last 6 months) specifically about the company "${companyName}" located in ${location} with website ${websiteUrl}.

IMPORTANT: Research ONLY about "${companyName}" at ${websiteUrl}, NOT any other company with a similar name.

For each news article found:
- Verify the article is specifically about this company (check if company name or website domain appears)
- Only include articles from reputable news sources (TechCrunch, Bloomberg, Reuters, Forbes, WSJ, business journals, etc.)
- Provide the full article URL, title, and a brief summary
- Include the publication date if available

Focus on: company announcements, partnerships, funding, product launches, executive changes, strategic moves, and industry recognition.

Describe each news article with its source URL in natural language.`;

  const requestPayload = {
    model: 'sonar-pro',
    messages: [
      { 
        role: 'system', 
        content: 'You are a news research specialist. Find recent, legitimate news articles about the specific company requested. Provide natural language descriptions with source URLs.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 2000,
    enable_search_classifier: true,
    search_recency_filter: "month", // Focus on recent news
    return_images: false,
    return_related_questions: false
  };

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    const responseText = await response.text();
    
    // Log API response for debugging
    await logApiResponse(
      supabaseClient,
      researchJobId,
      'perplexity',
      'news',
      requestPayload,
      responseText,
      response.status,
      response.ok ? undefined : `HTTP ${response.status}`
    );

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
      return [];
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Perplexity response as JSON:', e);
      return [];
    }

    const content = data.choices?.[0]?.message?.content || '';
    console.log('Raw Perplexity news response:', content.substring(0, 300) + '...');
    
    // Extract URLs from structured Perplexity response
    let newsUrls: string[] = [];
    
    // First try to get URLs from data.citations or data.search_results
    if (data.citations && Array.isArray(data.citations)) {
      newsUrls = data.citations.filter((url: string) => isLegitimateNewsSource(url));
      console.log(`Extracted ${newsUrls.length} URLs from data.citations`);
    }
    
    // Also check search_results if available
    if (data.search_results && Array.isArray(data.search_results)) {
      const searchUrls = data.search_results
        .filter((result: any) => result.url && isLegitimateNewsSource(result.url))
        .map((result: any) => result.url);
      newsUrls = [...new Set([...newsUrls, ...searchUrls])]; // Deduplicate
      console.log(`Total ${newsUrls.length} URLs after adding search_results`);
    }
    
    // Fallback: extract URLs from content with regex
    if (newsUrls.length === 0) {
      const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]()]+/g;
      const matches = content.match(urlPattern) || [];
      newsUrls = matches.filter((url: string) => isLegitimateNewsSource(url));
      console.log(`Extracted ${newsUrls.length} URLs from content text`);
    }
    
    // Validate URLs are about the correct company
    const companyKeywords = companyName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const validatedUrls = newsUrls.filter(url => {
      const urlLower = url.toLowerCase();
      // Check if company name or domain appears in URL
      const hasCompanyInUrl = companyKeywords.some(keyword => urlLower.includes(keyword)) ||
                             (companyDomain && urlLower.includes(companyDomain));
      
      if (!hasCompanyInUrl) {
        console.log(`Filtering out URL (no company match): ${url}`);
      }
      
      return hasCompanyInUrl;
    });
    
    console.log(`✓ Found ${validatedUrls.length} validated news citations`);
    return validatedUrls;
  } catch (error) {
    console.error('Error in searchRealNews:', error);
    return [];
  }
}

// Search for executives using GPT-5 with function calling for structured output
async function searchExecutivesWithGPT5(
  companyName: string,
  websiteUrl: string,
  location: string,
  siteContext: string,
  supabaseClient: any,
  researchJobId: string
): Promise<ExtractedExecutive[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.log('⚠️ OPENAI_API_KEY not configured, skipping GPT-5 search');
    return [];
  }

  console.log(`Starting GPT-5 executive search for: ${companyName}`);

  // Truncate site context for token efficiency
  const siteContextSnippet = siteContext.substring(0, 4000);

  const userPrompt = `Find and describe key company executives specifically for the company ${companyName} located in ${location} with website ${websiteUrl}.

IMPORTANT: Research ONLY about ${companyName} at ${websiteUrl}, NOT any other company with a similar name.

Context from the official website (truncated):
${siteContextSnippet}

Focus on: current c-level executives (CEO, CTO, CFO, CMO, CRO, CIO) and chairman, board members.

Strict output requirements:
- Return ONLY a JSON array (no markdown, no commentary).
- Each object must have: "name", "role", "source_url" (the best primary source page), "linkedin" (nullable), "related_url" (nullable).
- Only include people verifiably tied to this company. If uncertain, omit them.
- Prefer the company website and reputable press releases for "source_url".

Example of valid output format (for illustration only, do not copy names):
[
  {
    "name": "Full Name",
    "role": "Role Title",
    "source_url": "https://company.com/leadership/name",
    "linkedin": "https://www.linkedin.com/in/username",
    "related_url": "https://press.example.com/article"
  }
]`;

  try {
    const requestPayload = {
      model: 'gpt-5-2025-08-07',
      messages: [
        {
          role: 'system',
          content: 'You are a precise business research assistant. Return only valid JSON. No extra text.'
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_completion_tokens: 2000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'return_executives',
            description: 'Return a list of verified company executives',
            parameters: {
              type: 'object',
              properties: {
                executives: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Full name of the executive' },
                      role: { type: 'string', description: 'Job title or role' },
                      source_url: { type: 'string', description: 'Primary source URL verifying this person' },
                      linkedin: { type: 'string', description: 'LinkedIn profile URL', nullable: true },
                      related_url: { type: 'string', description: 'Additional related URL', nullable: true }
                    },
                    required: ['name', 'role', 'source_url']
                  }
                }
              },
              required: ['executives']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'return_executives' } }
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GPT-5 API error (${response.status}):`, errorText);
      return [];
    }

    const data = await response.json();
    
    // Log API response to database
    await logApiResponse(
      supabaseClient,
      researchJobId,
      'gpt5',
      'executives',
      requestPayload,
      JSON.stringify(data),
      response.status
    );

    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function.name === 'return_executives') {
      const argsStr = toolCall.function.arguments;
      const parsedArgs = JSON.parse(argsStr);
      const execs = parsedArgs.executives || [];
      
      console.log(`Raw GPT-5 tool response: ${execs.length} executives`);
      
      const executives: ExtractedExecutive[] = execs
        .filter((e: any) => e.name && e.role)
        .map((e: any) => ({
          name: e.name.trim(),
          position: e.role.trim(),
          linkedin_url: e.linkedin || undefined,
          summary: `${e.name} serves as ${e.role}`,
          confidence_level: e.linkedin ? 'high' : e.source_url ? 'medium' : 'low' as 'high' | 'medium' | 'low',
          source: 'perplexity_content' as const
        }));

      console.log(`✓ Found ${executives.length} executives from GPT-5`);
      
      // Log confidence breakdown
      const highConf = executives.filter(e => e.confidence_level === 'high').length;
      const medConf = executives.filter(e => e.confidence_level === 'medium').length;
      const lowConf = executives.filter(e => e.confidence_level === 'low').length;
      console.log(`Confidence breakdown (GPT-5): High=${highConf}, Medium=${medConf}, Low=${lowConf}`);

      return executives;
    }
    
    console.log('No tool call returned from GPT-5, trying content fallback');
    const content = data.choices?.[0]?.message?.content || '';
    console.log('Raw GPT-5 executives response:', content.substring(0, 500) + '...');
    
    const executives = parseExecutivesFromGPT5JSON(content);
    console.log(`✓ Found ${executives.length} executives from GPT-5 (fallback)`);
    return executives;

  } catch (error) {
    console.error('Error in GPT-5 executive search:', error);
    return [];
  }
}

async function searchRealExecutives(
  companyName: string, 
  websiteUrl: string,
  location: string,
  siteContext: string,
  supabaseClient: any,
  researchJobId: string
): Promise<ExtractedExecutive[]> {
  console.log(`Starting executive search for: ${companyName}`);
  
  // Skip website extraction - use AI providers exclusively
  console.log('Skipping website extraction - using AI providers exclusively');
  
  // Determine which provider(s) to use
  const provider = Deno.env.get('EXECUTIVE_SEARCH_PROVIDER') || 'both';
  console.log(`Executive search provider: ${provider}`);

  // Truncate site context for token efficiency (3500 chars for Perplexity)
  const siteContextSnippet = siteContext.substring(0, 3500);

  // Strict Perplexity prompt with site context and explicit JSON format
  const perplexityPrompt = `Find and describe key company executives specifically for the company ${companyName} located in ${location} with website ${websiteUrl}.

IMPORTANT: Research ONLY about ${companyName} at ${websiteUrl}, NOT any other company with a similar name.

Context from the official website (truncated):
${siteContextSnippet}

Focus on: current c-level executives (CEO, CTO, CFO, CMO, CRO, CIO) and chairman, board members.

Strict output requirements:
- Return ONLY a JSON array (no markdown, no commentary).
- Each object must have: "name", "role", "source_url" (the best primary source page), "linkedin" (nullable), "related_url" (nullable).
- Only include people verifiably tied to this company. If uncertain, omit them.
- Prefer the company website and reputable press releases for "source_url".

Example of valid output format (for illustration only, do not copy names):
[
  {
    "name": "Full Name",
    "role": "Role Title",
    "source_url": "https://company.com/leadership/name",
    "linkedin": "https://www.linkedin.com/in/username",
    "related_url": "https://press.example.com/article"
  }
]`;

  // Run searches based on provider configuration
  let perplexityExecutives: ExtractedExecutive[] = [];
  let gpt5Executives: ExtractedExecutive[] = [];

  if (provider === 'perplexity' || provider === 'both') {
    console.log('Running Perplexity executive search...');
    
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.log('No Perplexity API key configured');
    } else {

      const requestPayload = {
        model: 'sonar-pro',
        messages: [
          { 
            role: 'system', 
            content: 'Return only valid JSON. No extra text.' 
          },
          { role: 'user', content: perplexityPrompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        enable_search_classifier: true,
        return_images: false,
        return_related_questions: false
      };

      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        const responseText = await response.text();
        
        // Log API response for debugging
        await logApiResponse(
          supabaseClient,
          researchJobId,
          'perplexity',
          'executives',
          requestPayload,
          responseText,
          response.status,
          response.ok ? undefined : `HTTP ${response.status}`
        );

        if (!response.ok) {
          console.error(`Perplexity API error: ${response.status} ${response.statusText}`);
        } else {
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            console.error('Failed to parse Perplexity response as JSON:', e);
          }

          if (data) {
            const content = data.choices?.[0]?.message?.content || '';
            console.log('Raw Perplexity executives response:', content.substring(0, 400) + '...');

            // Parse executives from JSON response (no more LinkedIn scraping from search_results)
            const parsedExecs = parseExecutivesFromJSON(content);

            // Filter valid executives
            perplexityExecutives = parsedExecs.filter(exec => 
              exec.name && exec.position && exec.name.trim() !== '' && exec.position.trim() !== ''
            );

            console.log(`✓ Found ${perplexityExecutives.length} executives from Perplexity`);
            
            // Log confidence breakdown and first 2 entries
            const highConf = perplexityExecutives.filter(e => e.confidence_level === 'high').length;
            const medConf = perplexityExecutives.filter(e => e.confidence_level === 'medium').length;
            const lowConf = perplexityExecutives.filter(e => e.confidence_level === 'low').length;
            console.log(`Confidence breakdown (Perplexity): High=${highConf}, Medium=${medConf}, Low=${lowConf}`);
            if (perplexityExecutives.length > 0) {
              console.log('First 2 Perplexity executives:', JSON.stringify(perplexityExecutives.slice(0, 2), null, 2));
            }
          }
        }
      } catch (error) {
        console.error('Error in Perplexity executive search:', error);
      }
    }
  }

  if (provider === 'gpt5' || provider === 'both') {
    console.log('Running GPT-5 executive search...');
    gpt5Executives = await searchExecutivesWithGPT5(
      companyName,
      websiteUrl,
      location,
      siteContext,
      supabaseClient,
      researchJobId
    );
    
    if (gpt5Executives.length > 0) {
      console.log('First 2 GPT-5 executives:', JSON.stringify(gpt5Executives.slice(0, 2), null, 2));
    }
  }

  // Merge results from both providers
  let mergedExecutives: ExtractedExecutive[] = [];
  
  if (provider === 'both') {
    console.log('Merging results from both providers...');
    const nameMap = new Map<string, ExtractedExecutive>();
    
    // Add all executives, preferring higher confidence
    const allExecutives = [...perplexityExecutives, ...gpt5Executives];
    
    for (const exec of allExecutives) {
      const normalizedName = exec.name.toLowerCase().trim();
      const existing = nameMap.get(normalizedName);
      
      if (!existing) {
        nameMap.set(normalizedName, exec);
      } else {
        // Keep the one with higher confidence
        const confOrder = { high: 3, medium: 2, low: 1 };
        const existingConf = confOrder[existing.confidence_level || 'low'];
        const newConf = confOrder[exec.confidence_level || 'low'];
        
        if (newConf > existingConf) {
          // Merge LinkedIn URLs if new one has it and existing doesn't
          if (exec.linkedin_url && !existing.linkedin_url) {
            existing.linkedin_url = exec.linkedin_url;
            existing.confidence_level = exec.confidence_level;
          }
          nameMap.set(normalizedName, exec);
        } else if (!existing.linkedin_url && exec.linkedin_url) {
          // Add LinkedIn URL if existing entry doesn't have it
          existing.linkedin_url = exec.linkedin_url;
          existing.confidence_level = 'high';
        }
      }
    }
    
    mergedExecutives = Array.from(nameMap.values());
    console.log(`✓ Merged to ${mergedExecutives.length} unique executives`);
    console.log(`  - From Perplexity: ${perplexityExecutives.length}`);
    console.log(`  - From GPT-5: ${gpt5Executives.length}`);
  } else if (provider === 'gpt5') {
    mergedExecutives = gpt5Executives;
  } else {
    mergedExecutives = perplexityExecutives;
  }

  // Calculate final confidence breakdown for logging
  const highCount = mergedExecutives.filter(e => e.confidence_level === 'high').length;
  const mediumCount = mergedExecutives.filter(e => e.confidence_level === 'medium').length;
  const lowCount = mergedExecutives.filter(e => e.confidence_level === 'low').length;

  console.log(`Successfully validated ${mergedExecutives.length} executives`);
  console.log(`Confidence breakdown: High=${highCount}, Medium=${mediumCount}, Low=${lowCount}`);
  
  return mergedExecutives;
}

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header provided' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Authenticated user:', user.id);

    const body = await req.json();
    
    // Validate input
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input: ' + validationResult.error.issues.map(i => i.message).join(', ')
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const { research_job_id } = validationResult.data;

    // Fetch research job details
    const { data: job, error: jobError } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', research_job_id)
      .maybeSingle();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Research job not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the authenticated user owns this research job
    if (job.user_id !== user.id) {
      console.error('User does not own this research job:', { userId: user.id, jobUserId: job.user_id });
      return new Response(
        JSON.stringify({ error: 'Forbidden - You do not have permission to process this research job' }), 
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ error: 'PERPLEXITY_API_KEY is not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  try {
    console.log('=== STARTING STAGED RESEARCH PIPELINE ===');
    
    // Stage A: Fetch website context
    const urlsToFetch = [job.website_url];
    if (job.additional_urls && Array.isArray(job.additional_urls)) {
      urlsToFetch.push(...job.additional_urls);
    }
    
    const siteContext = await fetchSiteContext(urlsToFetch);
    console.log(`Site context extracted: ${siteContext.length} characters`);

    // Stage B: Get background research with citations  
    const { backgroundText, citations: backgroundCitations } = await getBackgroundWithCitations(siteContext, job, supabase, research_job_id);
    
    if (!backgroundText || backgroundCitations.length < 2) {
      console.log('Low citation yield in background research, attempting retry...');
      // Could implement retry with country-specific hints here
    }

    // Stage C: Extract structured profile (DO NOT abort pipeline if this fails)
    let researchData = await getStructuredProfile(backgroundText, backgroundCitations, job);
    
    if (!researchData) {
      console.log("⚠️ Structured profile extraction failed, using fallback data structure");
      // Use safe fallback structure so pipeline continues
      researchData = {
        company_overview: "Unknown",
        company_keywords: [],
        industry_business_model: "Unknown",
        key_products_customers: "Unknown",
        market_position: "Unknown",
        recent_developments: "Unknown",
        financial_information: "Unknown",
        key_partnerships: "Unknown",
        top_5: [],
        discussion_topics: []
      };
    }

    // Stage D: Get competitors and acquirers separately  
    const { competitors, likely_acquirers, apiCitations } = await getCompetitorsAcquirers(backgroundText, backgroundCitations, job);
    
    console.log('=== RESEARCH PIPELINE COMPLETED ===');
    console.log(`Background citations: ${backgroundCitations.length}`);
    console.log(`Competitor/acquirer citations: ${apiCitations.length}`);
    console.log(`Structured sections extracted: ${Object.keys(researchData).length}`);

    // Update research job with the extracted data and citations
    const { error: updateError } = await supabase
      .from('research_jobs')
      .update({
        company_overview: researchData.company_overview || null,
        company_keywords: researchData.company_keywords || null,
        industry_business_model: researchData.industry_business_model || null,
        key_products_customers: researchData.key_products_customers || null,
        market_position: researchData.market_position || null,
        recent_developments: researchData.recent_developments || null,
        financial_information: researchData.financial_information || null,
        key_partnerships: researchData.key_partnerships || null,
        competitors: competitors.length > 0 ? competitors.map((c: any) => `${c.name} (${c.location || 'Unknown location'}): ${c.description}`).join('\n\n') : null,
        likely_acquirers: likely_acquirers.length > 0 ? likely_acquirers.map((a: any) => `${a.name}: ${a.rationale}`).join('\n\n') : null,
        top_5: JSON.stringify(researchData.top_5) || null,
        overview_citations: backgroundCitations || null,
        competitors_citations: competitors.map((c: any) => ({ name: c.name, sources: c.sources })) || null,
        likely_acquirers_citations: likely_acquirers.map((a: any) => ({ name: a.name, sources: a.sources })) || null,
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', research_job_id);

    if (updateError) {
      throw updateError;
    }

    // Process discussion topics
    if (researchData.discussion_topics && Array.isArray(researchData.discussion_topics)) {
      // Clear existing discussion topics
      await supabase
        .from('discussion_topics')
        .delete()
        .eq('research_job_id', research_job_id);

      // Insert new discussion topics
      const topicsToInsert = researchData.discussion_topics.map((topic: any) => ({
        research_job_id: research_job_id,
        title: topic.title || 'Untitled Topic',
        description: topic.description || '',
        topic_type: topic.topic_type || 'touchpoint',
        source_references: topic.source_references || []
      }));

      if (topicsToInsert.length > 0) {
        const { error: topicsError } = await supabase
          .from('discussion_topics')
          .insert(topicsToInsert);

        if (topicsError) {
          console.error('Error inserting discussion topics:', topicsError);
        } else {
          console.log(`Inserted ${topicsToInsert.length} discussion topics`);
        }
      }
    }

    // Stage E1: Add user-provided CEO to executives table
    console.log('Adding user-provided CEO to executives...');
    let ceoConfidenceLevel: 'high' | 'medium' | 'low' = 'medium';
    
    if (job.ceo_linkedin_url) {
      const isValidLinkedIn = isValidLinkedInProfile(job.ceo_linkedin_url);
      if (isValidLinkedIn) {
        try {
          const response = await fetch(job.ceo_linkedin_url, { 
            method: 'HEAD', 
            signal: AbortSignal.timeout(10000) 
          });
          ceoConfidenceLevel = (response.ok || response.status === 405 || response.status === 429) ? 'high' : 'low';
        } catch {
          ceoConfidenceLevel = 'medium'; // Network issue, but URL format is valid
        }
      } else {
        ceoConfidenceLevel = 'low'; // Invalid LinkedIn URL format
      }
    } else {
      ceoConfidenceLevel = 'low'; // No LinkedIn provided
    }
    
    try {
      const { error: ceoInsertError } = await supabase
        .from('executives')
        .insert({
          research_job_id: research_job_id,
          name: job.ceo_name,
          position: 'CEO',
          linkedin_url: job.ceo_linkedin_url || null,
          summary: `CEO of ${job.company_name} (User-provided information)`,
          confidence_level: ceoConfidenceLevel,
          is_user_provided: true
        });
      
      if (ceoInsertError) {
        console.error('Error inserting user-provided CEO:', ceoInsertError);
      } else {
        console.log(`✓ User-provided CEO added with confidence level: ${ceoConfidenceLevel}`);
      }
    } catch (error) {
      console.error('Exception inserting CEO:', error);
    }

    // Stage E2: Search for additional executives
    console.log('Starting executive search...');
    const executives = await searchRealExecutives(job.company_name, job.website_url, job.location, siteContext, supabase, research_job_id);
    
    if (executives && executives.length > 0) {
      // Delete only Perplexity-found executives, keep user-provided CEO
      await supabase
        .from('executives')
        .delete()
        .eq('research_job_id', research_job_id)
        .eq('is_user_provided', false);

      // Use executives directly from Perplexity without complex deduplication
      const deduplicatedExecutives = executives;
      
      // Insert new executives from Perplexity (preserve confidence levels from extraction)
      const executivesToInsert = deduplicatedExecutives.map((exec: any) => ({
        research_job_id: research_job_id,
        name: exec.name,
        position: exec.position,
        linkedin_url: exec.linkedin_url,
        summary: exec.summary || '',
        confidence_level: exec.confidence_level
      }));
      
      console.log(`✓ Inserting ${executivesToInsert.length} deduplicated executives`);
      executivesToInsert.forEach(exec => {
        console.log(`  - ${exec.name} (${exec.position}): confidence=${exec.confidence_level}, linkedin=${exec.linkedin_url ? 'Yes' : 'No'}`);
      });

      const { error: execError } = await supabase
        .from('executives')
        .insert(executivesToInsert);

      if (execError) {
        console.error('Error inserting executives:', execError);
      } else {
        console.log(`Inserted ${executivesToInsert.length} verified executives`);
      }
    }

    // Stage F: Search for and process news
    console.log('Starting news search...');
    const newsCitations = await searchRealNews(job.company_name, job.website_url, job.location, supabase, research_job_id);
    
    if (newsCitations && newsCitations.length > 0) {
      console.log(`Verifying ${newsCitations.length} news articles from citations`);
      
      const verifiedNewsItems = [];
      
      // Process each citation to extract news metadata
      for (const citation of newsCitations.slice(0, 10)) { // Limit to 10 articles
        try {
          if (!isLegitimateNewsSource(citation)) {
            console.log(`Skipping non-whitelisted source: ${citation}`);
            continue;
          }

          // Fetch metadata from the news article
          const newsResponse = await fetch(citation, { 
            signal: AbortSignal.timeout(10000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)'
            }
          });
          
          if (newsResponse.ok) {
            const html = await newsResponse.text();
            
            // Extract title and description using simple parsing
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
            
            const title = titleMatch ? titleMatch[1].trim() : 'News Article';
            const summary = descMatch ? descMatch[1].trim() : 'Summary not available';
            
            // Try to extract publish date
            const dateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
            
            let publishedDate = new Date();
            if (dateMatch) {
              const parsedDate = parseDate(dateMatch[1]);
              if (parsedDate) {
                publishedDate = parsedDate;
              }
            }

            verifiedNewsItems.push({
              research_job_id: research_job_id,
              title: title.substring(0, 255), // Limit title length
              url: citation,
              summary: summary.substring(0, 1000), // Limit summary length
              published_date: publishedDate.toISOString(),
              confidence_level: 'high' // Verified through citation
            });
          } else {
            console.log(`Fetch failed for ${citation}: ${newsResponse.status} ${newsResponse.statusText}`);
            console.log(`Skipping unverified or incomplete citation: ${citation}`);
          }
        } catch (error) {
          console.error(`Error processing news citation ${citation}:`, error);
        }
      }

      if (verifiedNewsItems.length > 0) {
        // Clear existing news items for this research job
        await supabase
          .from('news_items')
          .delete()
          .eq('research_job_id', research_job_id);

        // Insert verified news items
        const { error: newsError } = await supabase
          .from('news_items')
          .insert(verifiedNewsItems);

        if (newsError) {
          console.error('Error inserting news items:', newsError);
        } else {
          console.log(`Inserted ${verifiedNewsItems.length} verified news articles`);
        }
      }
    }

    // Final status update
    const { error: finalUpdateError } = await supabase
      .from('research_jobs')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', research_job_id);

    if (finalUpdateError) {
      console.error('Error updating final status:', finalUpdateError);
    }

    console.log('Research processing completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Research processing completed successfully',
        backgroundCitations: backgroundCitations.length,
        competitorCitations: apiCitations.length,
        executivesFound: executives?.length || 0,
        newsFound: newsCitations?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in research processing:', error);
    
    // Update job status to error
    await supabase
      .from('research_jobs')
      .update({
        status: 'error',
        updated_at: new Date().toISOString()
      })
      .eq('id', research_job_id);

    return new Response(
      JSON.stringify({ 
        error: 'Research processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
