import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { useImproveScript, ImproveScriptParams } from '@/hooks/useImproveScript';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScriptImprovementModalProps {
  open: boolean;
  onClose: () => void;
  scriptData: {
    script_id?: string;
    template_id?: string;
    script_type: string;
    current_content: string;
    context?: {
      company_name?: string;
      ceo_name?: string;
      industry?: string;
    };
  };
  onApply: (improvedContent: string) => void;
}

export const ScriptImprovementModal = ({
  open,
  onClose,
  scriptData,
  onApply
}: ScriptImprovementModalProps) => {
  const [customInstructions, setCustomInstructions] = useState('');
  const [improvedContent, setImprovedContent] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  
  const { toast } = useToast();
  const improveScript = useImproveScript();

  const handleImprove = async () => {
    const params: ImproveScriptParams = {
      ...scriptData,
      custom_instructions: customInstructions || undefined,
    };

    try {
      const result = await improveScript.mutateAsync(params);
      setImprovedContent(result.improved_content);
      setRationale(result.overall_rationale);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to improve script. Please try again.',
      });
      console.error('Improvement error:', error);
    }
  };

  const handleApply = () => {
    if (improvedContent) {
      onApply(improvedContent);
      toast({
        title: 'Success',
        description: 'AI improvements applied successfully',
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setCustomInstructions('');
    setImprovedContent(null);
    setRationale(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Improve with AI
          </DialogTitle>
          <DialogDescription>
            Let AI enhance your script with professional writing best practices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!improvedContent ? (
            <>
              <div>
                <Label htmlFor="custom-instructions">
                  Custom Instructions (Optional)
                </Label>
                <Textarea
                  id="custom-instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="E.g., Make it more formal, add urgency, focus on ROI benefits..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              <Alert>
                <AlertDescription>
                  The AI will analyze your script and suggest improvements for clarity, 
                  professionalism, and persuasiveness while maintaining the core message.
                </AlertDescription>
              </Alert>

              <div className="bg-muted/30 p-4 rounded-md">
                <Label className="text-xs text-muted-foreground">Current Script Preview:</Label>
                <div className="mt-2 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {scriptData.current_content.substring(0, 500)}
                  {scriptData.current_content.length > 500 && '...'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Original</Label>
                  <div className="mt-2 p-4 bg-muted/30 rounded-md max-h-[400px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {scriptData.current_content}
                    </pre>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-primary">AI Improved</Label>
                  <div className="mt-2 p-4 bg-primary/5 border border-primary/20 rounded-md max-h-[400px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {improvedContent}
                    </pre>
                  </div>
                </div>
              </div>

              {rationale && (
                <Alert>
                  <AlertDescription>
                    <strong>AI Rationale:</strong> {rationale}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!improvedContent ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleImprove}
                disabled={improveScript.isPending}
              >
                {improveScript.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Sparkles className="mr-2 h-4 w-4" />
                Improve with AI
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setImprovedContent(null);
                setRationale(null);
              }}>
                <X className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleApply}>
                <Check className="mr-2 h-4 w-4" />
                Apply Improvements
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};