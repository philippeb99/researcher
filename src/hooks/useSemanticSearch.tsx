import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SemanticSearchParams {
  query: string;
  content_type?: string;
  limit?: number;
  threshold?: number;
}

export const useSemanticSearch = () => {
  return useMutation({
    mutationFn: async (params: SemanticSearchParams) => {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: params
      });

      if (error) throw error;
      return data;
    }
  });
};
