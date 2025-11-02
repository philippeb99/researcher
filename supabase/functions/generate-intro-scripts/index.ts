import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  research_job_id: z.string().uuid(),
  script_types: z.array(z.string()).optional()
});

interface UserProfile {
  user_id: string;
  user_name: string | null;
  user_email_address: string | null;
  user_last_ceo_position: string | null;
  user_last_company: string | null;
  user_phone_number: string | null;
  user_industry_experience: string[] | null;
  user_interests: string[] | null;
  user_location: string | null;
  linkedin_url: string | null;
}

interface ResearchJob {
  id: string;
  company_name: string;
  ceo_name: string;
  industry_business_model: string | null;
  company_keywords: string[] | null;
  location: string;
}

interface Template {
  id: string;
  script_type: string;
  template_name: string;
  template_content: string;
  source: 'superadmin' | 'user';
}

const BASELINE_TEMPLATES = {
  phone_call: `Hi [[customer_name]], this is [[user_name]], former [[user_last_ceo_position]] at [[user_last_company]]. I'm calling because I've been following [[company_name]] and I'm impressed by [specific achievement or development]. 

Based on my experience in [[user_industries]], I wanted to reach out personally to discuss [specific value proposition or opportunity].

Would you have 15 minutes this week for a brief conversation? I'm available [suggest 2-3 specific time slots].

You can reach me at [[user_phone_number]] or respond to this message. Looking forward to connecting.

Best regards,
[[user_name]]`,

  voice_mail: `Hi [[customer_name]], this is [[user_name]] from [[user_location]]. I was the [[user_last_ceo_position]] at [[user_last_company]].

I've been following [[company_name]]'s progress in [[customer_industry]] and wanted to connect regarding [specific opportunity or value proposition].

I'd love to schedule a brief 15-minute call to discuss how my experience in [[user_industries]] might be relevant to your current initiatives.

Please call me back at [[user_phone_number]] or feel free to email me. I'm flexible with timing and happy to work around your schedule.

Thank you, and I look forward to speaking with you soon.`,

  email: `Subject: [Compelling subject line related to their company/industry]

Hi [[CEO_first_name]],

I hope this email finds you well. My name is [[user_name]], and I'm reaching out because [specific reason related to their company].

A bit about my background: I was previously the [[user_last_ceo_position]] at [[user_last_company]], where [brief relevant achievement]. I've spent my career focused on [[user_industries]], and I've been particularly impressed by [[company_name]]'s [specific accomplishment or initiative].

[2-3 sentences explaining the specific value proposition or opportunity you're offering]

Would you be open to a brief 15-minute call to explore this further? I'm confident we could have a mutually beneficial conversation about [specific topic].

I'm based in [[user_location]] and happy to work around your schedule. Feel free to reach me at [[user_phone_number]] or simply reply to this email.

Best regards,
[[user_name]]

P.S. [Optional: Add a specific call-to-action or additional relevant detail]`,

  linkedin: `Hi [[CEO_first_name]],

I came across [[company_name]] while researching companies in [[customer_industry]], and I was particularly impressed by [specific recent achievement or initiative].

I'm [[user_name]], former [[user_last_ceo_position]] at [[user_last_company]]. With my background in [[user_industries]], I believe there could be an interesting opportunity to discuss [specific value proposition].

Would you be open to a brief conversation? I'd love to learn more about your work at [[company_name]] and share some insights from my experience.

Feel free to connect here or reach me at [[user_phone_number]].

Best,
[[user_name]]`
};

// Fetch ONLY user templates (not superadmin)
async function getAllTemplates(supabase: any, userId: string): Promise<Template[]> {
  const templates: Template[] = [];

  try {
    // Fetch ONLY user templates
    const { data: userData, error: userError } = await supabase
      .from('user_baseline_templates')
      .select('id, script_type, template_name, template_content_plain, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (userError) {
      console.error('Error fetching user templates:', userError);
    } else if (userData && userData.length > 0) {
      userData.forEach((t: any) => {
        templates.push({
          id: t.id,
          script_type: t.script_type,
          template_name: t.template_name,
          template_content: t.template_content_plain,
          source: 'user'
        });
      });
    }

    // If no user templates found, use baseline templates
    if (templates.length === 0) {
      console.log('No user templates found, using baselines');
      Object.entries(BASELINE_TEMPLATES).forEach(([type, content]) => {
        templates.push({
          id: `baseline_${type}`,
          script_type: type,
          template_name: 'Default Template',
          template_content: content,
          source: 'user'
        });
      });
    }

    console.log(`Found ${templates.length} user templates`);
    return templates;
  } catch (err) {
    console.error('Error in getAllTemplates:', err);
    // Return baseline templates as fallback
    return Object.entries(BASELINE_TEMPLATES).map(([type, content]) => ({
      id: `baseline_${type}`,
      script_type: type,
      template_name: 'Default Template',
      template_content: content,
      source: 'user' as const
    }));
  }
}

function validateProfile(profile: UserProfile): { valid: boolean; missing: string[] } {
  const requiredFields = [
    { key: 'user_name', label: 'Full Name' },
    { key: 'user_last_ceo_position', label: 'Last CEO/Founder Position' },
    { key: 'user_last_company', label: 'Last Company' },
    { key: 'user_phone_number', label: 'Phone Number' },
    { key: 'user_location', label: 'Location' },
    { key: 'linkedin_url', label: 'LinkedIn URL' }
  ];

  const missing = requiredFields
    .filter(field => !profile[field.key as keyof UserProfile])
    .map(field => field.label);

  return { valid: missing.length === 0, missing };
}

function mergeTemplate(
  template: string,
  userData: UserProfile,
  companyData: ResearchJob
): string {
  let merged = template;

  // User data replacements
  merged = merged.replace(/\[\[user_name\]\]/g, userData.user_name || '[Your Name]');
  merged = merged.replace(/\[\[user_email_address\]\]/g, userData.user_email_address || '[Your Email]');
  merged = merged.replace(/\[\[user_last_ceo_position\]\]/g, userData.user_last_ceo_position || '[Position]');
  merged = merged.replace(/\[\[user_last_company\]\]/g, userData.user_last_company || '[Company]');
  merged = merged.replace(/\[\[user_phone_number\]\]/g, userData.user_phone_number || '[Phone]');
  merged = merged.replace(/\[\[user_location\]\]/g, userData.user_location || '[Location]');
  merged = merged.replace(/\[\[linkedin_url\]\]/g, userData.linkedin_url || '[LinkedIn URL]');
  
  // Format arrays as comma-separated strings
  const industries = userData.user_industry_experience?.join(', ') || '[industries]';
  const interests = userData.user_interests?.join(', ') || '[interests]';
  merged = merged.replace(/\[\[user_industries\]\]/g, industries);
  merged = merged.replace(/\[\[user_interests\]\]/g, interests);

  // Company data replacements
  merged = merged.replace(/\[\[customer_name\]\]/g, companyData.ceo_name || '[CEO Name]');
  
  // Extract CEO first and last name
  const nameParts = companyData.ceo_name?.split(' ') || [];
  const ceoFirstName = nameParts[0] || '[First Name]';
  const ceoLastName = nameParts.slice(1).join(' ') || '[Last Name]';
  
  merged = merged.replace(/\[\[ceo_first_name\]\]/g, ceoFirstName);
  merged = merged.replace(/\[\[ceo_last_name\]\]/g, ceoLastName);
  
  merged = merged.replace(/\[\[company_name\]\]/g, companyData.company_name || '[Company Name]');
  
  // Format company keywords as comma-separated string for industry
  const companyIndustry = companyData.company_keywords?.join(', ') || '[Industry]';
  merged = merged.replace(/\[\[customer_industry\]\]/g, companyIndustry);
  
  // Business model field
  merged = merged.replace(/\[\[customer_business_model\]\]/g, companyData.industry_business_model || '[Business Model]');

  return merged;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      throw new Error('Server configuration error');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error('Auth error:', authError.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!user) {
      console.error('No user found from token');
      return new Response(
        JSON.stringify({ error: 'User not found' }),
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

    const { research_job_id, script_types } = validationResult.data;

    console.log(`Generating scripts for research job ${research_job_id}, user ${user.id}`);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    // Add user email from auth.users
    const profileWithEmail: UserProfile = {
      ...(profile || {}),
      user_email_address: user.email || null
    } as UserProfile;

    console.log('Profile loaded keys:', Object.keys(profile || {}));

    // Validate profile completeness
    const validation = validateProfile(profileWithEmail);
    if (!validation.valid) {
      console.log('Profile validation failed:', validation.missing);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Profile incomplete',
          missing_fields: validation.missing
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch research job
    const { data: researchJob, error: jobError } = await supabase
      .from('research_jobs')
      .select('id, company_name, ceo_name, industry_business_model, company_keywords, location')
      .eq('id', research_job_id)
      .eq('user_id', user.id)
      .single();

    if (jobError) {
      throw new Error(`Failed to fetch research job: ${jobError.message}`);
    }

    console.log('Generating scripts for:', {
      company: researchJob.company_name,
      user: profileWithEmail.user_name,
      types: script_types || 'all'
    });

    // Get ALL templates (global + user)
    const allTemplates = await getAllTemplates(supabase, user.id);
    
    // Filter by requested types if specified
    const templatesToGenerate = script_types 
      ? allTemplates.filter(t => script_types.includes(t.script_type))
      : allTemplates;

    console.log(`Generating ${templatesToGenerate.length} scripts from templates`);

    // Generate one script for EACH template (append mode - don't delete existing)
    const generatedScripts = [];

    for (const template of templatesToGenerate) {
      const scriptContent = mergeTemplate(template.template_content, profileWithEmail, researchJob);
      
      // Get current max version for this combination
      const { data: existingScripts } = await supabase
        .from('generated_scripts')
        .select('version')
        .eq('research_job_id', research_job_id)
        .eq('script_type', template.script_type)
        .eq('template_id', template.id)
        .order('version', { ascending: false })
        .limit(1);
      
      const nextVersion = existingScripts && existingScripts.length > 0 
        ? (existingScripts[0].version || 1) + 1 
        : 1;

      const { data: script, error: insertError } = await supabase
        .from('generated_scripts')
        .insert({
          research_job_id,
          user_id: user.id,
          script_type: template.script_type,
          template_id: template.id,
          template_source: template.source,
          script_content_plain: scriptContent,
          script_content_html: scriptContent,
          version: nextVersion
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Failed to save ${template.script_type} script (${template.template_name}):`, insertError);
        // Continue with other scripts instead of throwing
        continue;
      }

      generatedScripts.push(script);
    }

    console.log(`Successfully generated ${generatedScripts.length} new scripts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        scripts: generatedScripts,
        count: generatedScripts.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-intro-scripts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});