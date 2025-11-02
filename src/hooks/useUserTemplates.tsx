import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface CreateUserTemplateParams {
  scriptType: string;
  templateName: string;
  contentPlain: string;
  contentHtml: string;
}

interface UpdateUserTemplateParams {
  templateId: string;
  templateName: string;
  contentPlain: string;
  contentHtml: string;
}

export const useUserTemplates = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async (params: CreateUserTemplateParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check for duplicate names
      const { data: existing } = await supabase
        .from('user_baseline_templates')
        .select('id')
        .eq('user_id', user.id)
        .eq('script_type', params.scriptType)
        .eq('template_name', params.templateName)
        .eq('is_active', true);

      if (existing && existing.length > 0) {
        throw new Error('A template with this name already exists for this script type');
      }

      const { error } = await supabase
        .from('user_baseline_templates')
        .insert({
          user_id: user.id,
          script_type: params.scriptType,
          template_name: params.templateName,
          template_content_plain: params.contentPlain,
          template_content_html: params.contentHtml,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-templates'] });
      toast({
        title: 'Success',
        description: 'Custom template created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create template',
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (params: UpdateUserTemplateParams) => {
      const { error } = await supabase
        .from('user_baseline_templates')
        .update({
          template_name: params.templateName,
          template_content_plain: params.contentPlain,
          template_content_html: params.contentHtml,
        })
        .eq('id', params.templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-templates'] });
      toast({
        title: 'Success',
        description: 'Custom template updated successfully',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update template',
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('user_baseline_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-templates'] });
      toast({
        title: 'Success',
        description: 'Custom template deleted successfully',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete template',
      });
    },
  });

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
