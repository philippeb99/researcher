import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useGenerateEmbeddings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (researchJobId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { research_job_id: researchJobId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, researchJobId) => {
      toast.success('Embeddings generated successfully');
      queryClient.invalidateQueries({ queryKey: ['research-embeddings', researchJobId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to generate embeddings: ' + error.message);
    }
  });
};
