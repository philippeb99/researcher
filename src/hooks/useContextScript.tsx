import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContextScriptParams {
  research_job_id: string;
  script_type: string;
  user_context?: string;
  include_similar_companies?: boolean;
}

export const useContextScript = () => {
  return useMutation({
    mutationFn: async (params: ContextScriptParams) => {
      const { data, error } = await supabase.functions.invoke('generate-context-script', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      toast.error('Failed to generate script: ' + error.message);
    }
  });
};
