import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Loader2,
  AlertCircle,
  ArrowUp
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GenerateScriptsDialog } from './GenerateScriptsDialog';
import { GeneratedScriptsGrid } from './GeneratedScriptsGrid';

interface IntroScriptsProps {
  researchJobId: string;
}

export const IntroScripts = ({ researchJobId }: IntroScriptsProps) => {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [profileError, setProfileError] = useState<string[] | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateScripts = useMutation({
    mutationFn: async (scriptTypes: string[] | null = null) => {
      const body: any = { 
        research_job_id: researchJobId
      };

      // Only include script_types when specific types are selected
      if (scriptTypes && scriptTypes.length > 0) {
        body.script_types = scriptTypes;
      }

      const { data, error } = await supabase.functions.invoke('generate-intro-scripts', {
        body
      });

      if (error) throw error;
      
      // Check for profile incomplete error in the response
      if (data?.success === false && data?.error === 'Profile incomplete') {
        setProfileError(data.missing_fields || []);
        throw new Error('Profile incomplete');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['generated-scripts', researchJobId] });
      const count = data?.count || 0;
      toast({
        title: "Success",
        description: `${count} new script${count !== 1 ? 's' : ''} generated successfully`
      });
      setProfileError(null);
      setShowGenerateDialog(false);
    },
    onError: (error: any) => {
      if (error.message !== 'Profile incomplete') {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate scripts. Please try again."
        });
      }
    }
  });

  const handleGenerate = () => {
    setShowGenerateDialog(true);
  };

  const handleGenerateScripts = async (scriptTypes: string[] | null) => {
    await generateScripts.mutateAsync(scriptTypes);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Introduction Scripts
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={scrollToTop}
              className="ml-2 h-auto p-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              Back to top
            </Button>
          </CardTitle>
          <Button 
            onClick={handleGenerate}
            disabled={generateScripts.isPending}
          >
            {generateScripts.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Scripts
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profileError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete your profile before generating scripts. Missing fields:
              <ul className="mt-2 list-disc list-inside">
                {profileError.map(field => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <GeneratedScriptsGrid researchJobId={researchJobId} />
      </CardContent>

      <GenerateScriptsDialog
        open={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        onGenerate={handleGenerateScripts}
        isGenerating={generateScripts.isPending}
      />
    </Card>
  );
};
