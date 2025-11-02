import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const improveScriptSchema = z.object({
  script_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  script_type: z.string().min(1).max(50),
  current_content: z.string().min(1).max(10000),
  custom_instructions: z.string().max(500).optional(),
  context: z.object({
    company_name: z.string().max(200).optional(),
    ceo_name: z.string().max(100).optional(),
    industry: z.string().max(100).optional()
  }).optional()
});

interface ImproveScriptRequest {
  script_id?: string;
  template_id?: string;
  script_type: string;
  current_content: string;
  custom_instructions?: string;
  context?: {
    company_name?: string;
    ceo_name?: string;
    industry?: string;
  };
}

interface Change {
  type: 'addition' | 'deletion' | 'modification';
  original: string;
  improved: string;
  rationale: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !lovableApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    
    // Validate input
    const validationResult = improveScriptSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid input: ' + validationResult.error.issues.map(i => i.message).join(', ')
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const {
      script_type,
      current_content,
      custom_instructions,
      context,
      script_id,
      template_id
    } = validationResult.data;

    console.log('Improving script:', { script_type, script_id, template_id, user_id: user.id });

    // Build context-aware system prompt
    const isTemplate = !!template_id;
    const scriptTypeLabel = script_type.replace(/_/g, ' ');

    let systemPrompt = `You are an expert business communication writer specializing in ${scriptTypeLabel} scripts for corporate development and M&A professionals.`;
    
    if (isTemplate) {
      systemPrompt += `\n\nYou are improving a TEMPLATE that uses merge fields/placeholders like {{company_name}}, {{ceo_name}}, etc. 
CRITICAL: You MUST preserve ALL placeholder syntax exactly as {{field_name}}. Do not replace or remove placeholders.`;
    } else {
      systemPrompt += `\n\nYou are improving a specific outreach script that has already been personalized with company details.`;
    }

    systemPrompt += `\n\nYour task is to:
1. Improve clarity, professionalism, and persuasiveness
2. Ensure the tone is appropriate for senior executive communication
3. Make the script concise yet comprehensive
4. Enhance the call-to-action
5. Fix any grammatical or stylistic issues`;

    if (isTemplate) {
      systemPrompt += `\n6. PRESERVE all {{placeholder}} syntax exactly`;
    }

    let userPrompt = `Current ${scriptTypeLabel} script:\n\n${current_content}`;

    if (context) {
      userPrompt += `\n\nContext:`;
      if (context.company_name) userPrompt += `\n- Target Company: ${context.company_name}`;
      if (context.ceo_name) userPrompt += `\n- CEO: ${context.ceo_name}`;
      if (context.industry) userPrompt += `\n- Industry: ${context.industry}`;
    }

    if (custom_instructions) {
      userPrompt += `\n\nAdditional Instructions: ${custom_instructions}`;
    }

    userPrompt += `\n\nProvide your improved version and explain the key changes you made.`;

    // Call Lovable AI Gateway (Gemini)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      // Handle specific error codes
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Rate limit exceeded. Please try again in a moment.',
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'AI credits depleted. Please add credits to your Lovable workspace.',
          }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const improvedContent = aiData.choices[0].message.content;

    console.log('AI improvement completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        improved_content: improvedContent,
        overall_rationale: 'AI-generated improvements using Gemini for enhanced clarity and professionalism',
        metadata: {
          model: 'google/gemini-2.5-flash',
          timestamp: new Date().toISOString(),
          script_type,
          is_template: isTemplate
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in improve-script function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});