import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import RoleGuard from '@/components/RoleGuard';

const formSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  website_url: z.string().url('Valid website URL is required'),
  ceo_name: z.string().min(1, 'CEO name is required'),
  ceo_linkedin_url: z.string().url('Valid LinkedIn URL is required').optional().or(z.literal('')),
  additional_urls: z.array(z.string().url('Valid URL required')).optional()
});

type FormData = z.infer<typeof formSchema>;

interface ResearchJobFormProps {
  onSuccess?: () => void;
  editData?: any;
  onCancel?: () => void;
}

export function ResearchJobForm({ onSuccess, editData, onCancel }: ResearchJobFormProps) {
  const { user } = useAuth();
  const { permissions } = useUserRole();
  const { toast } = useToast();
  const [additionalUrls, setAdditionalUrls] = React.useState<string[]>(editData?.additional_urls || ['']);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: editData?.company_name || '',
      city: editData?.city || '',
      state: editData?.state || '',
      country: editData?.country || '',
      website_url: editData?.website_url || '',
      ceo_name: editData?.ceo_name || '',
      ceo_linkedin_url: editData?.ceo_linkedin_url || '',
      additional_urls: editData?.additional_urls || []
    }
  });

  const handleSubmit = async (data: FormData) => {
    if (!user) return;

    try {
      const filteredUrls = additionalUrls.filter(url => url.trim() !== '');
      
      // Build location string from components for backwards compatibility
      const locationParts = [
        data.city?.trim(),
        data.state?.trim(),
        data.country?.trim()
      ].filter(Boolean);
      const location = locationParts.join(", ");
      
      const jobData = {
        company_name: data.company_name,
        city: data.city || null,
        state: data.state || null,
        country: data.country,
        location: location,
        website_url: data.website_url,
        ceo_name: data.ceo_name,
        ceo_linkedin_url: data.ceo_linkedin_url || '',
        additional_urls: filteredUrls,
        user_id: user.id
      };

      if (editData) {
        const { error } = await supabase
          .from('research_jobs')
          .update(jobData)
          .eq('id', editData.id);
        
        if (error) throw error;
        toast({ title: 'Research job updated successfully' });
      } else {
        const { error } = await supabase
          .from('research_jobs')
          .insert([jobData]);
        
        if (error) throw error;
        toast({ title: 'Research job created successfully' });
      }

      form.reset();
      setAdditionalUrls(['']);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const addUrlField = () => {
    setAdditionalUrls([...additionalUrls, '']);
  };

  const removeUrlField = (index: number) => {
    const newUrls = additionalUrls.filter((_, i) => i !== index);
    setAdditionalUrls(newUrls);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...additionalUrls];
    newUrls[index] = value;
    setAdditionalUrls(newUrls);
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'editor']} fallback={
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            You don't have permission to create research jobs. Contact an administrator to upgrade your role.
          </p>
        </CardContent>
      </Card>
    }>
      <Card>
      <CardHeader>
        <CardTitle>{editData ? 'Edit Research Job' : 'New Research Job'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="San Francisco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="California" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input placeholder="United States" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL *</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ceo_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEO Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ceo_linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEO LinkedIn Profile (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/john-smith (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Additional URLs (Optional)</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addUrlField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add URL
                </Button>
              </div>
              
              {additionalUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="https://additional-resource.com"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    className="flex-1"
                  />
                  {additionalUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeUrlField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editData ? 'Update Research Job' : 'Create Research Job'}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    </RoleGuard>
  );
}