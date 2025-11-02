import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ContactStatus = Database['public']['Tables']['contact_statuses']['Row'];
type ContactStatusInsert = Database['public']['Tables']['contact_statuses']['Insert'];
type ContactStatusUpdate = Database['public']['Tables']['contact_statuses']['Update'];

export const useContactStatuses = () => {
  const queryClient = useQueryClient();

  const { data: statuses, isLoading, error } = useQuery({
    queryKey: ['contact-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_statuses')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as ContactStatus[];
    },
  });

  const createStatus = useMutation({
    mutationFn: async (newStatus: ContactStatusInsert) => {
      const { data, error } = await supabase
        .from('contact_statuses')
        .insert(newStatus)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-statuses'] });
      toast({
        title: 'Success',
        description: 'Contact status created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create contact status',
        variant: 'destructive',
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ContactStatusUpdate }) => {
      const { data, error } = await supabase
        .from('contact_statuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-statuses'] });
      toast({
        title: 'Success',
        description: 'Contact status updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update contact status',
        variant: 'destructive',
      });
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_statuses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-statuses'] });
      toast({
        title: 'Success',
        description: 'Contact status deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete contact status',
        variant: 'destructive',
      });
    },
  });

  return {
    statuses: statuses || [],
    isLoading,
    error,
    createStatus,
    updateStatus,
    deleteStatus,
  };
};
