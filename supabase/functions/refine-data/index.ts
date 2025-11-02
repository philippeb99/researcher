import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  research_job_id: z.string().uuid()
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const googleApiKey = Deno.env.get('GOOGLE_CUSTOM_SEARCH_API_KEY');
const googleSearchEngineId = Deno.env.get('GOOGLE_CUSTOM_SEARCH_ENGINE_ID');

// API Credentials Debugging
console.log('=== API CREDENTIALS CHECK ===');
console.log(`Google API Key present: ${!!googleApiKey}`);
console.log(`Google API Key length: ${googleApiKey ? googleApiKey.length : 0}`);
console.log(`Search Engine ID present: ${!!googleSearchEngineId}`);
console.log(`Search Engine ID: ${googleSearchEngineId || 'NOT SET'}`);
console.log('==============================');

// Enhanced URL validation function
const validateUrl = async (url: string): Promise<boolean> => {
  try {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      console.log(`Invalid URL format: ${url}`);
      return false;
    }

    // Check for suspicious/placeholder URLs
    const suspiciousPatterns = [
      'example.com',
      'placeholder.com',
      'fake-news.com',
      'made-up-news.com',
      'fictional-news.com',
      'test.com',
      'sample.com'
    ];
    
    if (suspiciousPatterns.some(pattern => url.includes(pattern))) {
      console.log(`Suspicious URL pattern detected: ${url}`);
      return false;
    }

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    
      if (!response.ok) {
        console.log(`URL validation failed for ${url}: ${response.status} ${response.statusText}`);
        return false;
      }
      
      console.log(`URL validation successful for ${url}`);
      return true;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error(`URL validation failed for ${url}:`, fetchError);
      return false;
    }
  } catch (error) {
    console.error(`URL validation error for ${url}:`, error);
    return false;
  }
};

// Function to search Google for company acquisition information
const checkCompanyAcquisition = async (companyName: string, city: string | null, state: string | null, country: string) => {
  const startTime = Date.now();
  const locationString = [city, state, country].filter(Boolean).join(", ");
  console.log('\n=== ACQUISITION SEARCH START ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Company: "${companyName}"`);
  console.log(`Location: "${locationString}"`);
  
  if (!googleApiKey || !googleSearchEngineId) {
    console.error('❌ Google API credentials missing');
    console.error(`API Key present: ${!!googleApiKey}`);
    console.error(`Search Engine ID present: ${!!googleSearchEngineId}`);
    return null;
  }

  try {
    const query = `Has "${companyName}" ${location} been acquired by another company? acquisition merger bought purchased`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodedQuery}&num=5`;
    
    console.log(`🔍 Search Query: "${query}"`);
    console.log(`📡 Request URL: ${url.replace(googleApiKey, 'API_KEY_HIDDEN')}`);
    console.log(`🕒 Making API call...`);
    
    const response = await fetch(url);
    
    console.log(`📈 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Google search failed:`);
      console.error(`Status: ${response.status}`);
      console.error(`Status Text: ${response.statusText}`);
      console.error(`Error Body: ${errorBody}`);
      return null;
    }

    const data = await response.json();
    console.log(`📊 Full Response Data:`, JSON.stringify(data, null, 2));
    
    const items = data.items || [];
    console.log(`📄 Results Count: ${items.length}`);
    
    if (items.length === 0) {
      console.log(`⚠️  No search results found for acquisition query`);
      return null;
    }

    // Log each result for debugging
    items.forEach((item: any, index: number) => {
      console.log(`\n--- Result ${index + 1} ---`);
      console.log(`Title: ${item.title}`);
      console.log(`Link: ${item.link}`);
      console.log(`Snippet: ${item.snippet}`);
      console.log(`Display Link: ${item.displayLink || 'N/A'}`);
    });
    
    // Analyze search results for acquisition information with improved context detection
    let acquisitionInfo = null;
    const companyLower = companyName.toLowerCase();
    
    console.log(`\n🔍 Analyzing results for acquisition info...`);
    console.log(`Looking for company: "${companyLower}"`);
    
    // Positive patterns (company is being acquired)
    const positivePatterns = [
      `${companyLower} was acquired by`,
      `${companyLower} has been acquired`,
      `${companyLower} sold to`,
      `acquisition of ${companyLower}`,
      `${companyLower} bought by`,
      `${companyLower} purchased by`,
      `${companyLower} merged with`,
      `merger between ${companyLower}`,
      `${companyLower} joins`,
      `${companyLower} acquired for`
    ];
    
    // Negative patterns (company provides services, not being acquired)
    const excludePatterns = [
      'advisory', 'consulting', 'services', 'provides', 'helps with', 
      'specializes in', 'offers', 'assists', 'expertise in', 'focuses on',
      'announces acquisition of', 'completed acquisition of', 'to acquire',
      'acquiring', 'merger and acquisition services', 'm&a advisory',
      'investment banking', 'financial advisor'
    ];
    
    for (const [index, item] of items.entries()) {
      const text = `${item.title} ${item.snippet}`.toLowerCase();
      console.log(`\n--- Analyzing Result ${index + 1} ---`);
      console.log(`Combined text: "${text}"`);
      console.log(`Contains company name: ${text.includes(companyLower)}`);
      
      // Skip if text contains exclude patterns (false positive indicators)
      const hasExcludePattern = excludePatterns.some(pattern => text.includes(pattern));
      if (hasExcludePattern) {
        console.log(`❌ Result ${index + 1} contains exclude pattern - likely M&A service provider`);
        continue;
      }
      
      // Check for positive acquisition patterns
      const matchedPattern = positivePatterns.find(pattern => text.includes(pattern));
      
      if (matchedPattern) {
        console.log(`✅ Found positive acquisition pattern: "${matchedPattern}"`);
        
        // Extract acquisition details with context
        const sentences = item.snippet.split('.');
        console.log(`Analyzing ${sentences.length} sentences for acquisition details...`);
        
        for (const [sentenceIndex, sentence] of sentences.entries()) {
          const sentenceLower = sentence.toLowerCase();
          console.log(`Sentence ${sentenceIndex + 1}: "${sentence.trim()}"`);
          
          // Look for sentences that contain the company name and acquisition keywords
          if (sentenceLower.includes(companyLower) && 
              (sentenceLower.includes('acquired') || sentenceLower.includes('merger') || 
               sentenceLower.includes('bought') || sentenceLower.includes('purchased'))) {
            
            // Additional validation - ensure company is target, not acquirer
            const isTarget = sentenceLower.includes(`${companyLower} was`) ||
                           sentenceLower.includes(`${companyLower} has been`) ||
                           sentenceLower.includes(`acquisition of ${companyLower}`) ||
                           sentenceLower.includes(`${companyLower} sold`) ||
                           sentenceLower.includes(`${companyLower} bought by`) ||
                           sentenceLower.includes(`${companyLower} purchased by`);
            
            if (isTarget) {
              acquisitionInfo = {
                summary: sentence.trim(),
                source_url: item.link,
                title: item.title,
                pattern_matched: matchedPattern
              };
              console.log(`🎯 Extracted verified acquisition info:`, acquisitionInfo);
              break;
            } else {
              console.log(`⚠️  Sentence mentions acquisition but company appears to be acquirer, not target`);
            }
          }
        }
        
        if (acquisitionInfo) break;
      } else if (text.includes(companyLower)) {
        // Fallback: check for basic acquisition keywords with company name
        const basicKeywords = ['acquired', 'merger', 'bought', 'purchased'];
        const foundKeywords = basicKeywords.filter(keyword => text.includes(keyword));
        console.log(`Found basic acquisition keywords: [${foundKeywords.join(', ')}]`);
        
        if (foundKeywords.length > 0) {
          console.log(`⚠️  Basic keyword match found but no positive pattern - needs manual review`);
        } else {
          console.log(`❌ Result ${index + 1} contains company name but no acquisition keywords`);
        }
      } else {
        console.log(`❌ Result ${index + 1} doesn't contain company name`);
      }
    }
    
    const endTime = Date.now();
    console.log(`\n=== ACQUISITION SEARCH END ===`);
    console.log(`Duration: ${endTime - startTime}ms`);
    console.log(`Result: ${acquisitionInfo ? 'FOUND' : 'NOT FOUND'}`);
    if (acquisitionInfo) {
      console.log(`Final result:`, JSON.stringify(acquisitionInfo, null, 2));
    }
    console.log('================================\n');
    
    return acquisitionInfo;
  } catch (error) {
    console.error('💥 Error in checkCompanyAcquisition:', error);
    const err = error as Error;
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    return null;
  }
};

// Function to find more executives using Google search
const findMoreExecutives = async (companyName: string, city: string | null, state: string | null, country: string) => {
  const startTime = Date.now();
  const locationString = [city, state, country].filter(Boolean).join(", ");
  console.log('\n=== EXECUTIVES SEARCH START ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Company: "${companyName}"`);
  console.log(`Location: "${locationString}"`);
  
  if (!googleApiKey || !googleSearchEngineId) {
    console.error('❌ Google API credentials missing for executives search');
    console.error(`API Key present: ${!!googleApiKey}`);
    console.error(`Search Engine ID present: ${!!googleSearchEngineId}`);
    return [];
  }

  try {
    const query = `"${companyName}" ${location} executives "board members" leadership team CEO CTO CFO COO VP`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodedQuery}&num=10`;
    
    console.log(`🔍 Search Query: "${query}"`);
    console.log(`📡 Request URL: ${url.replace(googleApiKey, 'API_KEY_HIDDEN')}`);
    console.log(`🕒 Making API call for executives...`);
    
    const response = await fetch(url);
    
    console.log(`📈 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Google search failed for executives:`);
      console.error(`Status: ${response.status}`);
      console.error(`Status Text: ${response.statusText}`);
      console.error(`Error Body: ${errorBody}`);
      return [];
    }

    const data = await response.json();
    console.log(`📊 Full Response Data:`, JSON.stringify(data, null, 2));
    
    const items = data.items || [];
    console.log(`📄 Results Count: ${items.length}`);
    
    if (items.length === 0) {
      console.log(`⚠️  No search results found for executives query`);
      return [];
    }

    // Log each result for debugging
    items.forEach((item: any, index: number) => {
      console.log(`\n--- Executive Result ${index + 1} ---`);
      console.log(`Title: ${item.title}`);
      console.log(`Link: ${item.link}`);
      console.log(`Snippet: ${item.snippet}`);
      console.log(`Display Link: ${item.displayLink || 'N/A'}`);
      console.log(`Is LinkedIn: ${item.link.includes('linkedin.com/in/')}`);
      console.log(`Contains company: ${item.link.includes(companyName.toLowerCase().replace(/\s+/g, ''))}`);
    });
    
    const foundExecutives: any[] = [];
    const companyNameForUrl = companyName.toLowerCase().replace(/\s+/g, '');
    
    console.log(`\n🔍 Analyzing results for executives...`);
    console.log(`Company name for URL matching: "${companyNameForUrl}"`);
    
    for (const [index, item] of items.entries()) {
      console.log(`\n--- Processing Result ${index + 1} ---`);
      
      const isLinkedIn = item.link.includes('linkedin.com/in/');
      const hasCompanyInUrl = item.link.includes(companyNameForUrl);
      const snippetLower = item.snippet.toLowerCase();
      const hasCEO = snippetLower.includes('ceo');
      const hasCTO = snippetLower.includes('cto');
      const hasCFO = snippetLower.includes('cfo');
      
      console.log(`LinkedIn profile: ${isLinkedIn}`);
      console.log(`Company in URL: ${hasCompanyInUrl}`);
      console.log(`Has CEO: ${hasCEO}`);
      console.log(`Has CTO: ${hasCTO}`);
      console.log(`Has CFO: ${hasCFO}`);
      
      // Look for LinkedIn profiles and corporate pages
      if (isLinkedIn || hasCompanyInUrl || hasCEO || hasCTO || hasCFO) {
        console.log(`✅ Result ${index + 1} matches executive criteria`);
        
        // Extract executive information from snippet
        const titlePatterns = [
          /(?:CEO|Chief Executive Officer)/i,
          /(?:CTO|Chief Technology Officer)/i,
          /(?:CFO|Chief Financial Officer)/i,
          /(?:COO|Chief Operating Officer)/i,
          /(?:VP|Vice President)/i,
          /(?:President)/i,
          /(?:Director)/i,
          /(?:Manager)/i
        ];
        
        let foundTitle = null;
        console.log(`Searching for executive titles in snippet: "${item.snippet}"`);
        
        for (const [patternIndex, pattern] of titlePatterns.entries()) {
          const match = item.snippet.match(pattern);
          if (match) {
            foundTitle = match[0];
            console.log(`🎯 Found title "${foundTitle}" with pattern ${patternIndex + 1}`);
            break;
          }
        }
        
        if (foundTitle && foundExecutives.length < 5) {
          console.log(`📝 Extracting executive info...`);
          
          // Try to extract name from title or LinkedIn URL
          let name = null;
          if (isLinkedIn) {
            const usernameMatch = item.link.match(/linkedin\.com\/in\/([^\/]+)/);
            if (usernameMatch) {
              name = usernameMatch[1].replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
              console.log(`👤 Extracted name from LinkedIn URL: "${name}"`);
            }
          } else if (item.title) {
            // Try to extract name from title
            const nameMatch = item.title.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
            if (nameMatch) {
              name = nameMatch[1];
              console.log(`👤 Extracted name from title: "${name}"`);
            }
          }
          
          if (name && foundTitle) {
            const executive = {
              name: name,
              position: foundTitle,
              linkedin_url: isLinkedIn ? item.link : null,
              source_url: item.link,
              summary: `${foundTitle} at ${companyName}`,
              keywords: [foundTitle, 'Leadership', 'Executive']
            };
            
            foundExecutives.push(executive);
            console.log(`✅ Added executive:`, JSON.stringify(executive, null, 2));
          } else {
            console.log(`❌ Could not extract name or title for result ${index + 1}`);
            console.log(`Name: ${name}, Title: ${foundTitle}`);
          }
        } else {
          console.log(`❌ No title found or executive limit reached for result ${index + 1}`);
          console.log(`Found Title: ${foundTitle}, Current Count: ${foundExecutives.length}`);
        }
      } else {
        console.log(`❌ Result ${index + 1} doesn't match executive criteria`);
      }
    }
    
    const endTime = Date.now();
    console.log(`\n=== EXECUTIVES SEARCH END ===`);
    console.log(`Duration: ${endTime - startTime}ms`);
    console.log(`Executives Found: ${foundExecutives.length}`);
    foundExecutives.forEach((exec, index) => {
      console.log(`Executive ${index + 1}: ${exec.name} - ${exec.position}`);
    });
    console.log('=================================\n');
    
    return foundExecutives;
  } catch (error) {
    console.error('💥 Error in findMoreExecutives:', error);
    const err = error as Error;
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    return [];
  }
};

// Function to verify executive authenticity with confidence levels
const verifyExecutiveAuthenticity = async (executiveName: string, companyName: string, location: string) => {
  const startTime = Date.now();
  console.log('\n=== EXECUTIVE VERIFICATION START ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Executive: "${executiveName}"`);
  console.log(`Company: "${companyName}"`);
  console.log(`Location: "${location}"`);
  
  if (!googleApiKey || !googleSearchEngineId) {
    console.error('❌ Google API credentials missing for executive verification');
    console.error(`API Key present: ${!!googleApiKey}`);
    console.error(`Search Engine ID present: ${!!googleSearchEngineId}`);
    return { confidenceLevel: 'low', verificationSources: [], totalMatches: 0 };
  }

  try {
    const query = `"${executiveName}" "${companyName}" ${location}`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodedQuery}&num=10`;
    
    console.log(`🔍 Verification Query: "${query}"`);
    console.log(`📡 Request URL: ${url.replace(googleApiKey, 'API_KEY_HIDDEN')}`);
    console.log(`🕒 Making API call for verification...`);
    
    const response = await fetch(url);
    
    console.log(`📈 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Google search failed for verification:`);
      console.error(`Status: ${response.status}`);
      console.error(`Status Text: ${response.statusText}`);
      console.error(`Error Body: ${errorBody}`);
      return { confidenceLevel: 'low', verificationSources: [], totalMatches: 0 };
    }

    const data = await response.json();
    console.log(`📊 Full Response Data:`, JSON.stringify(data, null, 2));
    
    const items = data.items || [];
    console.log(`📄 Results Count: ${items.length}`);
    
    if (items.length === 0) {
      console.log(`⚠️  No search results found for verification query`);
      return { confidenceLevel: 'low', verificationSources: [], totalMatches: 0 };
    }

    // Log each result for debugging
    items.forEach((item: any, index: number) => {
      console.log(`\n--- Verification Result ${index + 1} ---`);
      console.log(`Title: ${item.title}`);
      console.log(`Link: ${item.link}`);
      console.log(`Snippet: ${item.snippet}`);
      console.log(`Display Link: ${item.displayLink || 'N/A'}`);
    });
    
    const verificationSources = [];
    let linkedinCount = 0;
    let corporateCount = 0;
    let crunchbaseCount = 0;
    
    console.log(`\n🔍 Analyzing verification sources...`);
    console.log(`Looking for domains matching company: "${companyName}"`);
    
    for (const [index, item] of items.entries()) {
      console.log(`\n--- Processing Verification Result ${index + 1} ---`);
      
      let domain;
      try {
        domain = new URL(item.link).hostname.toLowerCase();
        console.log(`🌐 Domain: ${domain}`);
      } catch (e) {
        console.warn(`⚠️  Invalid URL: ${item.link}`);
        continue;
      }
      
      const companyNameForDomain = companyName.toLowerCase().replace(/\s+/g, '');
      const isLinkedIn = domain.includes('linkedin.com');
      const isCrunchbase = domain.includes('crunchbase.com');
      const isCorporate = domain.includes(companyNameForDomain) || item.snippet.toLowerCase().includes(companyName.toLowerCase());
      
      console.log(`LinkedIn: ${isLinkedIn}`);
      console.log(`Crunchbase: ${isCrunchbase}`);
      console.log(`Corporate (domain/content): ${isCorporate}`);
      
      // Count authoritative sources
      if (isLinkedIn) {
        linkedinCount++;
        const source = {
          type: 'LinkedIn',
          url: item.link,
          title: item.title
        };
        verificationSources.push(source);
        console.log(`✅ Added LinkedIn source:`, source);
      } else if (isCrunchbase) {
        crunchbaseCount++;
        const source = {
          type: 'Crunchbase',
          url: item.link,
          title: item.title
        };
        verificationSources.push(source);
        console.log(`✅ Added Crunchbase source:`, source);
      } else if (isCorporate) {
        corporateCount++;
        const source = {
          type: 'Corporate',
          url: item.link,
          title: item.title
        };
        verificationSources.push(source);
        console.log(`✅ Added Corporate source:`, source);
      } else {
        console.log(`❌ Result ${index + 1} doesn't match verification criteria`);
      }
    }
    
    // Calculate confidence level based on matches instead of binary pass/fail
    const totalMatches = linkedinCount + corporateCount + crunchbaseCount;
    let confidenceLevel: string;
    
    if (totalMatches >= 3) {
      confidenceLevel = 'high';  // 3+ authoritative sources
    } else if (totalMatches >= 1) {
      confidenceLevel = 'medium';  // 1-2 authoritative sources
    } else {
      confidenceLevel = 'low';  // No authoritative sources
    }
    
    console.log(`\n📊 Verification Statistics:`);
    console.log(`LinkedIn matches: ${linkedinCount}`);
    console.log(`Corporate matches: ${corporateCount}`);
    console.log(`Crunchbase matches: ${crunchbaseCount}`);
    console.log(`Total matches: ${totalMatches}`);
    console.log(`Confidence Level: ${confidenceLevel.toUpperCase()}`);
    
    const endTime = Date.now();
    console.log(`\n=== EXECUTIVE VERIFICATION END ===`);
    console.log(`Duration: ${endTime - startTime}ms`);
    console.log(`Executive: ${executiveName} - ${confidenceLevel.toUpperCase()} confidence`);
    console.log(`Sources Found: ${verificationSources.length}`);
    console.log('====================================\n');
    
    return { confidenceLevel, verificationSources: verificationSources.slice(0, 5), totalMatches };
  } catch (error) {
    console.error('💥 Error in verifyExecutiveAuthenticity:', error);
    const err = error as Error;
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    return { confidenceLevel: 'low', verificationSources: [], totalMatches: 0 };
  }
};

// Function to find and verify news articles
const findVerifiedNews = async (companyName: string, location: string) => {
  const startTime = Date.now();
  console.log('\n=== NEWS SEARCH START ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Company: "${companyName}"`);
  console.log(`Location: "${location}"`);
  
  if (!googleApiKey || !googleSearchEngineId) {
    console.error('❌ Google API credentials missing for news search');
    console.error(`API Key present: ${!!googleApiKey}`);
    console.error(`Search Engine ID present: ${!!googleSearchEngineId}`);
    return [];
  }

  try {
    const query = `"${companyName}" ${location} news -site:example.com -site:placeholder.com`;
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodedQuery}&num=10&sort=date&dateRestrict=y5`; // Last 5 years
    
    console.log(`🔍 News Query: "${query}"`);
    console.log(`📡 Request URL: ${url.replace(googleApiKey, 'API_KEY_HIDDEN')}`);
    console.log(`🕒 Making API call for news...`);
    
    const response = await fetch(url);
    
    console.log(`📈 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Google search failed for news:`);
      console.error(`Status: ${response.status}`);
      console.error(`Status Text: ${response.statusText}`);
      console.error(`Error Body: ${errorBody}`);
      return [];
    }

    const data = await response.json();
    console.log(`📊 Full Response Data:`, JSON.stringify(data, null, 2));
    
    const items = data.items || [];
    console.log(`📄 Results Count: ${items.length}`);
    
    if (items.length === 0) {
      console.log(`⚠️  No search results found for news query`);
      return [];
    }

    // Log each result for debugging
    items.forEach((item: any, index: number) => {
      console.log(`\n--- News Result ${index + 1} ---`);
      console.log(`Title: ${item.title}`);
      console.log(`Link: ${item.link}`);
      console.log(`Snippet: ${item.snippet}`);
      console.log(`Display Link: ${item.displayLink || 'N/A'}`);
    });
    
    const verifiedNews = [];
    const companyLower = companyName.toLowerCase();
    const locationLower = location.toLowerCase();
    
    console.log(`\n🔍 Analyzing news articles for relevance...`);
    console.log(`Looking for company: "${companyLower}"`);
    console.log(`Looking for location: "${locationLower}"`);
    
    for (const [index, item] of items.entries()) {
      console.log(`\n--- Processing News Result ${index + 1} ---`);
      
      // Verify the article is actually about the correct company
      const snippet = item.snippet.toLowerCase();
      const title = item.title.toLowerCase();
      
      const companyInSnippet = snippet.includes(companyLower);
      const companyInTitle = title.includes(companyLower);
      const locationInSnippet = snippet.includes(locationLower);
      const locationInTitle = title.includes(locationLower);
      
      console.log(`Company in snippet: ${companyInSnippet}`);
      console.log(`Company in title: ${companyInTitle}`);
      console.log(`Location in snippet: ${locationInSnippet}`);
      console.log(`Location in title: ${locationInTitle}`);
      
      // Calculate confidence level based on relevance criteria
      const hasCompany = companyInSnippet || companyInTitle;
      const hasLocation = locationInSnippet || locationInTitle;
      
      let confidenceLevel: string;
      let shouldInclude = false;
      
      if (hasCompany && hasLocation) {
        confidenceLevel = 'high';  // Both company and location mentioned
        shouldInclude = true;
        console.log(`✅ Article ${index + 1} matches HIGH confidence criteria`);
      } else if (hasCompany) {
        confidenceLevel = 'medium';  // Only company mentioned
        shouldInclude = true;
        console.log(`⚠️  Article ${index + 1} matches MEDIUM confidence criteria (company only)`);
      } else {
        confidenceLevel = 'low';  // Neither company nor location clearly mentioned
        shouldInclude = false;
        console.log(`❌ Article ${index + 1} has LOW confidence (no clear company match)`);
      }
      
      if (shouldInclude) {
        // Validate the URL
        console.log(`🔗 Validating URL: ${item.link}`);
        const isValidUrl = await validateUrl(item.link);
        
        if (!isValidUrl) {
          console.log(`❌ Invalid news URL: ${item.link}`);
          continue;
        }
        
        console.log(`✅ URL validation passed`);
        
        // Extract keywords from content
        const keywords = [];
        console.log(`🏷️  Extracting keywords...`);
        
        const keywordChecks = [
          { keyword: 'funding', found: snippet.includes('funding') || title.includes('funding') },
          { keyword: 'acquisition', found: snippet.includes('acquisition') || title.includes('acquisition') },
          { keyword: 'partnership', found: snippet.includes('partnership') || title.includes('partnership') },
          { keyword: 'launch', found: snippet.includes('launch') || title.includes('launch') },
          { keyword: 'expansion', found: snippet.includes('expansion') || title.includes('expansion') }
        ];
        
        keywordChecks.forEach(check => {
          console.log(`Keyword "${check.keyword}": ${check.found}`);
          if (check.found) {
            const keywordMap: { [key: string]: string } = {
              'funding': 'Funding',
              'acquisition': 'Acquisition', 
              'partnership': 'Partnership',
              'launch': 'Product Launch',
              'expansion': 'Expansion'
            };
            keywords.push(keywordMap[check.keyword]);
          }
        });
        
        if (keywords.length === 0) {
          keywords.push('News', 'Company Update');
          console.log(`No specific keywords found, using default: [News, Company Update]`);
        }
        
        const newsArticle = {
          title: item.title,
          url: item.link,
          summary: item.snippet.substring(0, 200) + (item.snippet.length > 200 ? '...' : ''),
          keywords: keywords,
          published_date: new Date().toISOString(), // Google doesn't always provide publish date
          source_url: item.link,
          confidence_level: confidenceLevel
        };
        
        verifiedNews.push(newsArticle);
        console.log(`✅ Added news article with ${confidenceLevel.toUpperCase()} confidence:`, JSON.stringify(newsArticle, null, 2));
        
        // Limit to 5 articles
        if (verifiedNews.length >= 5) {
          console.log(`📰 Reached maximum of 5 articles, stopping search`);
          break;
        }
      } else {
        console.log(`❌ Article ${index + 1} doesn't meet minimum criteria for inclusion`);
        console.log(`Has Company: ${hasCompany}, Has Location: ${hasLocation}`);
      }
    }
    
    const endTime = Date.now();
    console.log(`\n=== NEWS SEARCH END ===`);
    console.log(`Duration: ${endTime - startTime}ms`);
    console.log(`News Articles Found: ${verifiedNews.length}`);
    verifiedNews.forEach((article, index) => {
      console.log(`Article ${index + 1}: ${article.title.substring(0, 50)}...`);
    });
    console.log('========================\n');
    
    return verifiedNews;
  } catch (error) {
    console.error('💥 Error in findVerifiedNews:', error);
    const err = error as Error;
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    return [];
  }
};

// Main refine data function
const refineResearchData = async (researchJobId: string) => {
  try {
    console.log(`Starting data refinement for research job: ${researchJobId}`);
    
    // Get the research job
    const { data: job, error: jobError } = await supabase
      .from('research_jobs')
      .select('*')
      .eq('id', researchJobId)
      .single();
    
    if (jobError || !job) {
      console.error('Error fetching research job:', jobError);
      return { error: 'Research job not found' };
    }
    
    const companyName = job.company_name;
    const locationString = [job.city, job.state, job.country].filter(Boolean).join(", ");
    
    console.log(`Refining data for: ${companyName}, ${locationString}`);
    
    let updatedFields = {};
    let stats = {
      acquisitionChecked: false,
      newExecutivesFound: 0,
      executivesVerified: 0,
      executivesRemoved: 0,
      newsArticlesFound: 0,
      newsArticlesRemoved: 0
    };
    
    // 1. Check for company acquisitions
    console.log('Checking for company acquisitions...');
    const acquisitionInfo = await checkCompanyAcquisition(companyName, job.city, job.state, job.country);
    let acquisitionSignal = "No Acquisition Signal Found";
    
    if (acquisitionInfo) {
      acquisitionSignal = `${acquisitionInfo.summary} (Source: ${acquisitionInfo.title})`;
      stats.acquisitionChecked = true;
      console.log('Found acquisition information');
    } else {
      console.log('No credible acquisition information found');
    }
    
    // Update acquisition_signal field
    updatedFields = { ...updatedFields, acquisition_signal: acquisitionSignal };
    
    // 2. Find and verify executives
    console.log('Finding and verifying executives...');
    
    // Get existing executives
    const { data: existingExecutives } = await supabase
      .from('executives')
      .select('*')
      .eq('research_job_id', researchJobId);
    
    const existingNames = new Set(
      (existingExecutives || []).map(exec => exec.name.toLowerCase())
    );
    
    // Find new executives
    const newExecutives = await findMoreExecutives(companyName, job.city, job.state, job.country);
    const executivesToAdd = [];
    
    for (const executive of newExecutives) {
      // Skip if already exists
      if (existingNames.has(executive.name.toLowerCase())) {
        continue;
      }
      
      // Verify authenticity and assign confidence level
      const verification = await verifyExecutiveAuthenticity(executive.name, companyName, locationString);
      
      // Include executives with medium or high confidence
      if (verification.confidenceLevel !== 'low') {
        executivesToAdd.push({
          ...executive,
          research_job_id: researchJobId,
          confidence_level: verification.confidenceLevel,
          history: `${executive.position} at ${companyName}. Confidence: ${verification.confidenceLevel} (${verification.totalMatches} sources).`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        stats.executivesVerified++;
        console.log(`Prepared executive for addition: ${executive.name} with ${verification.confidenceLevel} confidence`);
      } else {
        console.log(`Skipped executive with low confidence: ${executive.name}`);
      }
    }
    
    // Insert new executives with confidence levels
    if (executivesToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('executives')
        .insert(executivesToAdd);
      
      if (!insertError) {
        stats.newExecutivesFound = executivesToAdd.length;
        console.log(`Added ${executivesToAdd.length} new executives with confidence levels`);
      }
    }
    
    // Update confidence levels for existing executives (don't remove, just update confidence)
    for (const executive of existingExecutives || []) {
      const verification = await verifyExecutiveAuthenticity(executive.name, companyName, locationString);
      
      // Update confidence level instead of removing
      await supabase
        .from('executives')
        .update({ 
          confidence_level: verification.confidenceLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', executive.id);
      
      console.log(`Updated executive ${executive.name} confidence level to: ${verification.confidenceLevel}`);
      
      // Only remove if confidence level is 'low' AND there are no sources at all
      if (verification.confidenceLevel === 'low' && verification.totalMatches === 0) {
        await supabase
          .from('executives')
          .delete()
          .eq('id', executive.id);
        stats.executivesRemoved++;
        console.log(`Removed executive with no verification sources: ${executive.name}`);
      }
    }
    
    // 3. Find and verify news articles
    console.log('Finding and verifying news articles...');
    
    // Get existing news to update confidence levels instead of removing all
    const { data: existingNews } = await supabase
      .from('news_items')
      .select('*')
      .eq('research_job_id', researchJobId);
    
    // Find new verified news with confidence levels
    const verifiedNews = await findVerifiedNews(companyName, locationString);
    
    if (verifiedNews.length > 0) {
      // Filter out any that might already exist (by URL)
      const existingUrls = new Set((existingNews || []).map(item => item.url));
      const newNewsItems = verifiedNews.filter(news => !existingUrls.has(news.url));
      
      if (newNewsItems.length > 0) {
        const newsToInsert = newNewsItems.map(news => ({
          ...news,
          research_job_id: researchJobId,
          created_at: new Date().toISOString()
        }));
        
        const { error: newsError } = await supabase
          .from('news_items')
          .insert(newsToInsert);
        
        if (!newsError) {
          stats.newsArticlesFound = newNewsItems.length;
          console.log(`Added ${newNewsItems.length} new news articles with confidence levels`);
        }
      }
    }
    
    // Update confidence levels for existing news items if they don't already have confidence_level set
    if (existingNews && existingNews.length > 0) {
      for (const newsItem of existingNews) {
        if (!newsItem.confidence_level) {
          // Assign medium confidence to existing news items as they were previously validated
          await supabase
            .from('news_items')
            .update({ 
              confidence_level: 'medium',
              updated_at: new Date().toISOString()
            })
            .eq('id', newsItem.id);
          
          console.log(`Updated existing news item confidence level: ${newsItem.title?.substring(0, 50)}...`);
        }
      }
    }
    
    // Update research job with refined data
    if (Object.keys(updatedFields).length > 0) {
      await supabase
        .from('research_jobs')
        .update({
          ...updatedFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', researchJobId);
    }
    
    console.log('Data refinement completed successfully');
    
    return {
      success: true,
      stats,
      message: `Data refinement completed. Found ${stats.newExecutivesFound} new executives, verified ${stats.executivesVerified} executives, removed ${stats.executivesRemoved} unverified executives, added ${stats.newsArticlesFound} verified news articles, and removed ${stats.newsArticlesRemoved} unverified articles.`
    };
    
  } catch (error) {
    console.error('Error during data refinement:', error);
    return {
      error: 'Data refinement failed',
      details: (error as Error).message
    };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Initialize Supabase client for auth verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

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

    // Verify the authenticated user owns this research job before processing
    const { data: job, error: jobError } = await supabaseClient
      .from('research_jobs')
      .select('user_id')
      .eq('id', research_job_id)
      .maybeSingle();

    if (jobError || !job) {
      console.error('Failed to fetch research job:', jobError?.message);
      return new Response(
        JSON.stringify({ error: 'Research job not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify ownership
    if (job.user_id !== user.id) {
      console.error('User does not own this research job:', { userId: user.id, jobUserId: job.user_id });
      return new Response(
        JSON.stringify({ error: 'Forbidden - You do not have permission to refine this research job' }), 
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Starting data refinement process for job: ${research_job_id}`);
    
    const result = await refineResearchData(research_job_id);
    
    if (result.error) {
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in refine-data function:', error);
    return new Response(JSON.stringify({ 
      error: 'Data refinement failed', 
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
