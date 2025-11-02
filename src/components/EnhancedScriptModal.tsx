import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, Save, Loader2, Sparkles, FileText } from 'lucide-react';
import { SCRIPT_TYPE_LABELS } from '@/constants/scriptTemplates';
import { RichTextEditor } from './RichTextEditor';
import { ScriptImprovementModal } from './ScriptImprovementModal';

interface Script {
  id: string;
  script_type: 'phone_call' | 'voice_mail' | 'email' | 'linkedin';
  script_content: string;
  updated_at: string;
}

interface EnhancedScriptModalProps {
  script: Script;
  onClose: () => void;
  onSave: () => void;
  researchJobId?: string;
  companyName?: string;
  ceoName?: string;
}

export const EnhancedScriptModal = ({ 
  script, 
  onClose, 
  onSave,
  researchJobId,
  companyName,
  ceoName 
}: EnhancedScriptModalProps) => {
  const [contentPlain, setContentPlain] = useState(script.script_content);
  // Initialize with HTML if available, otherwise convert plain text to basic HTML
  const [contentHtml, setContentHtml] = useState(
    script.script_content.includes('<') 
      ? script.script_content 
      : `<p>${script.script_content.replace(/\n/g, '</p><p>')}</p>`
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showPlainText, setShowPlainText] = useState(false);
  const [showImprovementModal, setShowImprovementModal] = useState(false);
  const { toast } = useToast();

  const wordCount = contentPlain.trim().split(/\s+/).length;
  const charCount = contentPlain.length;

  const updateScript = useMutation({
    mutationFn: async (newContent: { plain: string; html: string }) => {
      // Try to update in generated_scripts first (new table)
      const { error: generatedError } = await supabase
        .from('generated_scripts')
        .update({ 
          script_content_plain: newContent.plain,
          script_content_html: newContent.html 
        })
        .eq('id', script.id);

      // Fallback to company_scripts (old table) if it doesn't exist in new table
      if (generatedError) {
        const { error: companyError } = await supabase
          .from('company_scripts')
          .update({ script_content: newContent.plain })
          .eq('id', script.id);

        if (companyError) throw companyError;
      }
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
      await navigator.clipboard.writeText(contentPlain);
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
    if (contentPlain.trim()) {
      updateScript.mutate({ plain: contentPlain, html: contentHtml });
    }
  };
  
  const handleSaveAndCopy = async () => {
    if (contentPlain.trim()) {
      await updateScript.mutateAsync({ plain: contentPlain, html: contentHtml });
      await handleCopy();
    }
  };

  const handleCancel = () => {
    setContentPlain(script.script_content);
    setContentHtml(
      script.script_content.includes('<') 
        ? script.script_content 
        : `<p>${script.script_content.replace(/\n/g, '</p><p>')}</p>`
    );
    setIsEditing(false);
  };

  const handleEditorChange = (html: string, plain: string) => {
    setContentHtml(html);
    setContentPlain(plain);
  };

  const handleApplyImprovement = (improvedContent: string) => {
    setContentPlain(improvedContent);
    // Convert plain text to basic HTML paragraphs
    setContentHtml(`<p>${improvedContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <div>
                <span>{SCRIPT_TYPE_LABELS[script.script_type]}</span>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Generated {new Date(script.updated_at).toLocaleString()}
                </p>
              </div>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPlainText(!showPlainText)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showPlainText ? 'Rich Text' : 'Plain Text'}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {isEditing ? (
                showPlainText ? (
                  <textarea
                    value={contentPlain}
                    onChange={(e) => setContentPlain(e.target.value)}
                    className="w-full min-h-[400px] p-4 border rounded-md bg-background font-mono text-sm"
                    placeholder="Enter your script content..."
                  />
                ) : (
                  <RichTextEditor
                    value={contentHtml}
                    onChange={handleEditorChange}
                    placeholder="Enter your script content..."
                    mergeFields={[
                      { label: 'Company', value: 'company_name' },
                      { label: 'CEO', value: 'ceo_name' },
                      { label: 'Your Name', value: 'user_name' },
                      { label: 'Your Company', value: 'user_company' },
                    ]}
                  />
                )
              ) : (
                <div 
                  className="min-h-[400px] p-4 border rounded-md bg-muted/30 prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_p]:my-2"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(contentHtml, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'mark', 'span'],
                      ALLOWED_ATTR: ['style', 'class']
                    })
                  }}
                />
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
                  variant="outline"
                  onClick={() => setShowImprovementModal(true)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Improve with AI
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={updateScript.isPending || !contentPlain.trim()}
                >
                  {updateScript.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button 
                  variant="default"
                  onClick={handleSaveAndCopy}
                  disabled={updateScript.isPending || !contentPlain.trim()}
                >
                  {updateScript.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save & Copy
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsEditing(true);
                    setShowImprovementModal(true);
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Improve with AI
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  Edit Script
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showImprovementModal && (
        <ScriptImprovementModal
          open={showImprovementModal}
          onClose={() => setShowImprovementModal(false)}
          scriptData={{
            script_id: script.id,
            script_type: script.script_type,
            current_content: contentPlain,
            context: {
              company_name: companyName,
              ceo_name: ceoName,
            }
          }}
          onApply={handleApplyImprovement}
        />
      )}
    </>
  );
};