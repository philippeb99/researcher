import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  status: string;
  role: string;
}

export const useUserList = () => {
  const { permissions } = useUserRole();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['user-profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_profiles_with_emails');
      
      if (error) {
        console.error('Error fetching user list:', error);
        throw error;
      }
      
      return (data || []) as UserProfile[];
    },
    enabled: permissions.canViewAll, // Only fetch if user is super_admin
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    users,
    isLoading,
    error,
  };
};
