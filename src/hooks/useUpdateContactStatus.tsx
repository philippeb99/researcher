import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpdateContactStatusParams {
  jobId: string;
  status: string;
}

export const useUpdateContactStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ jobId, status }: UpdateContactStatusParams) => {
      const { error } = await supabase
        .from('research_jobs')
        .update({ 
          contact_status: status,
          last_contact_datetime: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['stats-data'] });
      toast({
        title: "Contact Status Updated",
        description: "The contact status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update contact status. Please try again.",
        variant: "destructive",
      });
      console.error('Contact status update error:', error);
    },
  });
};
