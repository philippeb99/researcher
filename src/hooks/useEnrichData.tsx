import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseEnrichDataOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

export const useEnrichData = (options?: UseEnrichDataOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (researchJobId: string) => {
      const { data, error } = await supabase.functions.invoke('orchestrate-research', {
        body: { 
          research_job_id: researchJobId,
          phases: ['all'] // Run all enrichment phases
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, researchJobId) => {
      const summary = data.summary;
      toast.success(
        `Enrichment completed! ${summary.successful_sources}/${summary.total_sources} sources successful`,
        { description: `Data quality score: ${Math.round(data.validation_score)}%` }
      );
      queryClient.invalidateQueries({ queryKey: ['research-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['research-job', researchJobId] });
      queryClient.invalidateQueries({ queryKey: ['executives', researchJobId] });
      queryClient.invalidateQueries({ queryKey: ['news-items', researchJobId] });
      queryClient.invalidateQueries({ queryKey: ['news', researchJobId] });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error('Enrichment failed: ' + error.message);
      options?.onError?.();
    }
  });
};
