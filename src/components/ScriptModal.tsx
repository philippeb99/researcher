import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Save, Loader2 } from 'lucide-react';
import { SCRIPT_TYPE_LABELS } from '@/constants/scriptTemplates';

interface Script {
  id: string;
  script_type: 'phone_call' | 'voice_mail' | 'email' | 'linkedin';
  script_content: string;
  updated_at: string;
}

interface ScriptModalProps {
  script: Script;
  onClose: () => void;
  onSave: () => void;
}

export const ScriptModal = ({ script, onClose, onSave }: ScriptModalProps) => {
  const [content, setContent] = useState(script.script_content);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const wordCount = content.trim().split(/\s+/).length;
  const charCount = content.length;

  const updateScript = useMutation({
    mutationFn: async (newContent: string) => {
      const { error } = await supabase
        .from('company_scripts')
        .update({ script_content: newContent })
        .eq('id', script.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Script updated successfully"
      });
      setIsEditing(false);
      onSave();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update script"
      });
    }
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Script copied to clipboard"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy to clipboard"
      });
    }
  };

  const handleSave = () => {
    if (content.trim()) {
      updateScript.mutate(content);
    }
  };

  const handleCancel = () => {
    setContent(script.script_content);
    setIsEditing(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>{SCRIPT_TYPE_LABELS[script.script_type]}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 pb-4">
            {isEditing ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Enter your script content..."
              />
            ) : (
              <div className="min-h-[400px] p-4 border rounded-md bg-muted/30 whitespace-pre-wrap font-mono text-sm">
                {content}
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {wordCount} words • {charCount} characters
              </span>
              <span>
                Last updated: {new Date(script.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 gap-2 shrink-0 border-t">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateScript.isPending || !content.trim()}
              >
                {updateScript.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit Script
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
