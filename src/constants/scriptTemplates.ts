export const SCRIPT_TEMPLATES = {
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

export const PLACEHOLDER_FIELDS = {
  user: [
    'user_name',
    'user_last_ceo_position',
    'user_last_company',
    'user_phone_number',
    'user_industries',
    'user_interests',
    'user_location',
    'linkedin_url'
  ],
  company: [
    'customer_name',
    'CEO_first_name',
    'customer_industry',
    'customer_business_model',
    'company_name'
  ]
};

export type ScriptType = keyof typeof SCRIPT_TEMPLATES;

export const SCRIPT_TYPE_LABELS: Record<ScriptType, string> = {
  phone_call: 'Initial Phone Call',
  voice_mail: 'Voice Mail',
  email: 'Follow-up Email',
  linkedin: 'LinkedIn Message'
};
