import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useHistoricalInsights = (researchJobId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['historical-insights', researchJobId],
    queryFn: async () => {
      if (!researchJobId) return null;

      const { data, error } = await supabase.functions.invoke('get-historical-insights', {
        body: { research_job_id: researchJobId }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!researchJobId && enabled,
  });
};
