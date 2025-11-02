import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useStatsData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stats-data', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      // Get total research jobs
      const { count: totalResearch } = await supabase
        .from('research_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get completed research jobs (companies analyzed)
      const { count: companiesAnalyzed } = await supabase
        .from('research_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'processed');

      // Get total executives (key contacts)
      const { count: keyContacts } = await supabase
        .from('executives')
        .select('*, research_jobs!inner(*)', { count: 'exact', head: true })
        .eq('research_jobs.user_id', user.id);

      return {
        totalResearch: totalResearch || 0,
        companiesAnalyzed: companiesAnalyzed || 0,
        keyContacts: keyContacts || 0,
      };
    },
    enabled: !!user?.id,
  });
};