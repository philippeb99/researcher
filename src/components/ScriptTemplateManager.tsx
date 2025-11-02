import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Save, RotateCcw, FileText } from 'lucide-react';
import { SCRIPT_TEMPLATES, SCRIPT_TYPE_LABELS, ScriptType } from '@/constants/scriptTemplates';

interface ScriptTemplate {
  id: string;
  script_type: string;
  template_content: string;
}

const ScriptTemplateManager = () => {
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [customTemplates, setCustomTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
    const { data, error } = await supabase
      .from('superadmin_templates')
      .select('*');

      if (error) throw error;

      // Initialize with baseline templates
      const baselineTemplates = { ...SCRIPT_TEMPLATES };
      const customTemplateMap: Record<string, string> = {};

      // Override with custom templates if they exist
      if (data) {
        data.forEach((template: ScriptTemplate) => {
          baselineTemplates[template.script_type as ScriptType] = template.template_content;
          customTemplateMap[template.script_type] = template.template_content;
        });
      }

      setTemplates(baselineTemplates);
      setCustomTemplates(customTemplateMap);
    } catch (error) {
      console.error('Error fetching templates:', error);
      // If table doesn't exist yet, just use baseline
      setTemplates({ ...SCRIPT_TEMPLATES });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (scriptType: ScriptType) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('superadmin_templates')
        .upsert({
          script_type: scriptType,
          template_content: templates[scriptType]
        }, {
          onConflict: 'script_type'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${SCRIPT_TYPE_LABELS[scriptType]} template saved successfully`
      });

      await fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save template"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (scriptType: ScriptType) => {
    setSaving(true);
    try {
      // Delete custom template to revert to baseline
      const { error } = await supabase
        .from('superadmin_templates')
        .delete()
        .eq('script_type', scriptType);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${SCRIPT_TYPE_LABELS[scriptType]} reverted to baseline template`
      });

      await fetchTemplates();
    } catch (error) {
      console.error('Error reverting template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to revert template"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRevertAll = async () => {
    setSaving(true);
    try {
      // Delete all custom templates
    const { error } = await supabase
      .from('superadmin_templates')
      .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast({
        title: "Success",
        description: "All templates reverted to baseline"
      });

      await fetchTemplates();
    } catch (error) {
      console.error('Error reverting all templates:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to revert templates"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (scriptType: ScriptType, value: string) => {
    setTemplates(prev => ({
      ...prev,
      [scriptType]: value
    }));
  };

  const isCustomized = (scriptType: ScriptType) => {
    return scriptType in customTemplates;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Script Templates
            </CardTitle>
            <CardDescription>
              Manage baseline templates for intro scripts. Changes affect all future generated scripts.
            </CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={Object.keys(customTemplates).length === 0}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Revert All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revert All Templates?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will restore all templates to their baseline hardcoded versions. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRevertAll}>Revert All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="phone_call" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {(Object.keys(SCRIPT_TEMPLATES) as ScriptType[]).map((type) => (
              <TabsTrigger key={type} value={type} className="relative">
                {SCRIPT_TYPE_LABELS[type]}
                {isCustomized(type) && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-primary"></span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(SCRIPT_TEMPLATES) as ScriptType[]).map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`template-${type}`}>
                    {SCRIPT_TYPE_LABELS[type]} Template
                    {isCustomized(type) && (
                      <span className="ml-2 text-xs text-muted-foreground">(Customized)</span>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    {isCustomized(type) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Revert
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revert to Baseline?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will restore this template to its baseline hardcoded version. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevert(type)}>
                              Revert
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button
                      onClick={() => handleSave(type)}
                      disabled={saving}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
                <Textarea
                  id={`template-${type}`}
                  value={templates[type] || ''}
                  onChange={(e) => handleTemplateChange(type, e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Enter template content..."
                />
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold mb-1">Available placeholders:</p>
                  <p className="mb-1">
                    <strong>User fields:</strong> [[user_name]], [[user_last_ceo_position]], [[user_last_company]], 
                    [[user_phone_number]], [[user_industries]], [[user_interests]], [[user_location]], [[linkedin_url]]
                  </p>
                  <p>
                    <strong>Company fields:</strong> [[customer_name]], [[CEO_first_name]], [[customer_industry]], [[company_name]]
                  </p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ScriptTemplateManager;
