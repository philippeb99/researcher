import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'super_admin' | 'editor' | 'viewer';

interface UserRoleData {
  role: UserRole | null;
  loading: boolean;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewAll: boolean;
    canManageUsers: boolean;
  };
}

export const useUserRole = (): UserRoleData => {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user || authLoading) {
        setLoading(authLoading);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_user_role', { 
          _user_id: user.id 
        });

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('viewer'); // Default to most restrictive role
        } else {
          setRole(data as UserRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('viewer');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user, authLoading]);

  const permissions = {
    canCreate: role === 'super_admin' || role === 'editor',
    canEdit: role === 'super_admin' || role === 'editor',
    canDelete: role === 'super_admin',
    canViewAll: role === 'super_admin',
    canManageUsers: role === 'super_admin'
  };

  return {
    role,
    loading,
    permissions
  };
};