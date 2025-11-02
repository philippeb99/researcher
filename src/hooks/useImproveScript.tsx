import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ImproveScriptParams {
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

export interface ImproveScriptResponse {
  success: boolean;
  improved_content: string;
  overall_rationale: string;
  metadata: {
    model: string;
    timestamp: string;
    script_type: string;
    is_template: boolean;
  };
}

export const useImproveScript = () => {
  return useMutation({
    mutationFn: async (params: ImproveScriptParams): Promise<ImproveScriptResponse> => {
      const { data, error } = await supabase.functions.invoke('improve-script', {
        body: params
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to improve script');
      
      return data;
    }
  });
};