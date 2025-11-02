import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Save, Plus, Sparkles, Trash2, Edit } from 'lucide-react';
import { SCRIPT_TEMPLATES, ScriptType } from '@/constants/scriptTemplates';
import { RichTextEditor, MergeField } from './RichTextEditor';
import { ScriptImprovementModal } from './ScriptImprovementModal';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserTemplates } from '@/hooks/useUserTemplates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface GlobalTemplate {
  id: string;
  script_type: string;
  template_name: string;
  template_content: string;
}

interface UserTemplate {
  id: string;
  script_type: string;
  template_name: string;
  template_content_plain: string;
  template_content_html: string | null;
  is_active: boolean;
}

const MERGE_FIELDS: MergeField[] = [
  { label: 'Your Name', value: 'user_name' },
  { label: 'Your Email', value: 'user_email_address' },
  { label: 'Your Position', value: 'user_last_ceo_position' },
  { label: 'Your Company', value: 'user_last_company' },
  { label: 'Your Phone', value: 'user_phone_number' },
  { label: 'Your Location', value: 'user_location' },
  { label: 'Your Industries', value: 'user_industries' },
  { label: 'Your Interests', value: 'user_interests' },
  { label: 'Your LinkedIn', value: 'linkedin_url' },
  { label: 'Company Name', value: 'company_name' },
  { label: 'CEO Full Name', value: 'customer_name' },
  { label: 'CEO First Name', value: 'ceo_first_name' },
  { label: 'CEO Last Name', value: 'ceo_last_name' },
  { label: 'Company Industry', value: 'customer_industry' },
  { label: 'Business Model', value: 'customer_business_model' },
];

export const EnhancedScriptTemplateManager = () => {
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<GlobalTemplate | null>(null);
  const [editingUserTemplate, setEditingUserTemplate] = useState<UserTemplate | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState<{ script_type: string; isUser: boolean } | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateContentHtml, setNewTemplateContentHtml] = useState('');
  const [selectedTemplateForAI, setSelectedTemplateForAI] = useState<{
    type: string;
    content: string;
    isGlobal: boolean;
    templateId?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const { toast } = useToast();
  const { role } = useUserRole();
  const isSuperAdmin = role === 'super_admin';
  const { createTemplate: createUserTemplate, updateTemplate: updateUserTemplate, deleteTemplate: deleteUserTemplate } = useUserTemplates();

  useEffect(() => {
    fetchTemplates();
    
    // Load saved tab from localStorage or default
    const savedTab = localStorage.getItem('scriptTemplatesTab') || (isSuperAdmin ? 'global' : 'custom');
    setActiveTab(savedTab);
  }, [isSuperAdmin]);
  
  // Save active tab to localStorage
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('scriptTemplatesTab', activeTab);
    }
  }, [activeTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch global templates
      const { data: globalData, error: globalError } = await supabase
        .from('superadmin_templates')
        .select('*')
        .order('script_type')
        .order('template_name');

      if (globalError) throw globalError;
      
      // Add baseline templates if no global templates exist
      const mergedGlobal: GlobalTemplate[] = globalData || [];
      if (mergedGlobal.length === 0) {
        Object.entries(SCRIPT_TEMPLATES).forEach(([type, content]) => {
          mergedGlobal.push({
            id: `baseline_${type}`,
            script_type: type,
            template_name: 'Default Template',
            template_content: content
          });
        });
      }
      
      setGlobalTemplates(mergedGlobal);

      // Fetch user templates - filter by current user
      const { data: userData, error: userError } = await supabase
        .from('user_baseline_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('script_type')
        .order('template_name');

      if (userError) throw userError;
      setUserTemplates(userData || []);

    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load templates',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGlobalTemplate = async () => {
    if (!creatingTemplate || !newTemplateName.trim() || creatingTemplate.isUser) return;
    
    setSaving('creating');
    try {
      const { error } = await supabase
        .from('superadmin_templates')
        .insert({
          script_type: creatingTemplate.script_type,
          template_name: newTemplateName.trim(),
          template_content: newTemplateContent || SCRIPT_TEMPLATES[creatingTemplate.script_type as ScriptType] || ''
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      setCreatingTemplate(null);
      setNewTemplateName('');
      setNewTemplateContent('');
      setNewTemplateContentHtml('');
      await fetchTemplates();
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create template',
      });
    } finally {
      setSaving(null);
    }
  };
  
  const handleCreateUserTemplateWithDialog = async () => {
    if (!creatingTemplate || !newTemplateName.trim() || !creatingTemplate.isUser) return;
    
    setSaving('creating');
    try {
      await createUserTemplate.mutateAsync({
        scriptType: creatingTemplate.script_type,
        templateName: newTemplateName.trim(),
        contentPlain: newTemplateContent || SCRIPT_TEMPLATES[creatingTemplate.script_type as ScriptType] || '',
        contentHtml: newTemplateContentHtml || '',
      });
      
      setCreatingTemplate(null);
      setNewTemplateName('');
      setNewTemplateContent('');
      setNewTemplateContentHtml('');
      await fetchTemplates();
    } catch (error) {
      console.error('Error creating user template:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateGlobalTemplate = async (template: GlobalTemplate) => {
    setSaving(template.id);
    try {
      const { error } = await supabase
        .from('superadmin_templates')
        .update({
          template_content: template.template_content,
          template_name: template.template_name
        })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update template',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteGlobalTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('superadmin_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete template',
      });
    }
  };

  const handleCreateUserTemplate = async (scriptType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const templateName = `My ${scriptType.replace(/_/g, ' ')} Template`;
      const baselineContent = SCRIPT_TEMPLATES[scriptType as ScriptType] || '';

      const { error } = await supabase
        .from('user_baseline_templates')
        .insert({
          user_id: user.id,
          script_type: scriptType,
          template_name: templateName,
          template_content_plain: baselineContent,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Custom template created',
      });
      await fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create template',
      });
    }
  };

  const handleUpdateUserTemplate = async () => {
    if (!editingUserTemplate) return;
    
    setSaving(editingUserTemplate.id);
    try {
      await updateUserTemplate.mutateAsync({
        templateId: editingUserTemplate.id,
        templateName: editingUserTemplate.template_name,
        contentPlain: editingUserTemplate.template_content_plain,
        contentHtml: editingUserTemplate.template_content_html || '',
      });
      
      setEditingUserTemplate(null);
      await fetchTemplates();
    } catch (error) {
      console.error('Error updating user template:', error);
    } finally {
      setSaving(null);
    }
  };
  
  const handleDeleteUserTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteUserTemplate.mutateAsync(templateId);
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleApplyAIImprovement = (improvedContent: string) => {
    if (!selectedTemplateForAI) return;

    if (selectedTemplateForAI.isGlobal) {
      setGlobalTemplates(prev => prev.map(t => 
        t.id === selectedTemplateForAI.templateId 
          ? { ...t, template_content: improvedContent }
          : t
      ));
    } else {
      setUserTemplates(prev => prev.map(t => 
        t.id === selectedTemplateForAI.templateId 
          ? { ...t, template_content_plain: improvedContent }
          : t
      ));
    }
  };

  const groupTemplatesByType = (templates: GlobalTemplate[]) => {
    const grouped: Record<string, GlobalTemplate[]> = {};
    templates.forEach(t => {
      if (!grouped[t.script_type]) grouped[t.script_type] = [];
      grouped[t.script_type].push(t);
    });
    return grouped;
  };

  const groupUserTemplatesByType = (templates: UserTemplate[]) => {
    const grouped: Record<string, UserTemplate[]> = {};
    templates.forEach(t => {
      if (!grouped[t.script_type]) grouped[t.script_type] = [];
      grouped[t.script_type].push(t);
    });
    return grouped;
  };

  // Helper function to convert plain text to HTML preserving formatting
  const plainToHtml = (text: string): string => {
    if (!text) return '<p></p>';
    
    // If already HTML, return as-is
    if (text.includes('<p>') || text.includes('<ul>') || text.includes('<ol>')) {
      return text;
    }
    
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let listType = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for bullet points
      if (line.match(/^[-•*]\s+(.+)/)) {
        const content = line.replace(/^[-•*]\s+/, '');
        if (!inList) {
          html += '<ul>';
          inList = true;
          listType = 'ul';
        } else if (listType !== 'ul') {
          html += `</${listType}><ul>`;
          listType = 'ul';
        }
        html += `<li>${content}</li>`;
      }
      // Check for numbered lists
      else if (line.match(/^\d+\.\s+(.+)/)) {
        const content = line.replace(/^\d+\.\s+/, '');
        if (!inList) {
          html += '<ol>';
          inList = true;
          listType = 'ol';
        } else if (listType !== 'ol') {
          html += `</${listType}><ol>`;
          listType = 'ol';
        }
        html += `<li>${content}</li>`;
      }
      // Regular paragraph
      else {
        if (inList) {
          html += `</${listType}>`;
          inList = false;
          listType = '';
        }
        if (line === '') {
          html += '<p><br></p>';
        } else {
          html += `<p>${line}</p>`;
        }
      }
    }
    
    // Close any open list
    if (inList) {
      html += `</${listType}>`;
    }
    
    return html || '<p></p>';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const globalGrouped = groupTemplatesByType(globalTemplates);
  const userGrouped = groupUserTemplatesByType(userTemplates);
  const scriptTypes = Object.keys(SCRIPT_TEMPLATES) as ScriptType[];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Script Templates</CardTitle>
          <CardDescription>
            Manage baseline templates used for generating introduction scripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              {isSuperAdmin && <TabsTrigger value="global">Global Baseline</TabsTrigger>}
              <TabsTrigger value="custom">My Custom Templates</TabsTrigger>
            </TabsList>

            {isSuperAdmin && (
              <TabsContent value="global" className="space-y-6">
                {scriptTypes.map((scriptType) => {
                  const templates = globalGrouped[scriptType] || [];
                  return (
                    <div key={scriptType} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold capitalize">
                          {scriptType.replace(/_/g, ' ')} Templates
                        </h3>
                        <Button
                          size="sm"
                          onClick={() => setCreatingTemplate({ script_type: scriptType, isUser: false })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {templates.map((template) => (
                          <Card key={template.id} className="border-muted">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-sm">{template.template_name}</CardTitle>
                                  <Badge variant="outline" className="text-xs">Global</Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingTemplate(template)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedTemplateForAI({
                                      type: template.script_type,
                                      content: template.template_content,
                                      isGlobal: true,
                                      templateId: template.id
                                    })}
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    AI
                                  </Button>
                                  {!template.id.startsWith('baseline_') && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteGlobalTemplate(template.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-muted-foreground line-clamp-3">
                                {template.template_content.substring(0, 200)}...
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {templates.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No templates yet. Click "Add New" to create one.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            )}

            <TabsContent value="custom" className="space-y-6">
              {scriptTypes.map((scriptType) => {
                const templates = userGrouped[scriptType] || [];
                return (
                  <div key={scriptType} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold capitalize">
                        {scriptType.replace(/_/g, ' ')} Templates
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => setCreatingTemplate({ script_type: scriptType, isUser: true })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <Card key={template.id} className="border-muted">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-sm">{template.template_name}</CardTitle>
                                <Badge variant="secondary" className="text-xs">My Custom</Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingUserTemplate(template)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedTemplateForAI({
                                    type: template.script_type,
                                    content: template.template_content_plain,
                                    isGlobal: false,
                                    templateId: template.id
                                  })}
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteUserTemplate(template.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm text-muted-foreground line-clamp-3">
                              {template.template_content_plain.substring(0, 200)}...
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {templates.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No custom templates yet. Click "Create New" to add one.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={!!creatingTemplate} onOpenChange={() => setCreatingTemplate(null)}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new {creatingTemplate?.script_type.replace(/_/g, ' ')} template
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col px-6">
            <div className="mb-4">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Warm Introduction"
              />
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <Label className="mb-2">Template Content</Label>
              <RichTextEditor
                value={newTemplateContent}
                onChange={(html, plain) => {
                  setNewTemplateContent(plain);
                  setNewTemplateContentHtml(html);
                }}
                mergeFields={MERGE_FIELDS}
                placeholder="Enter template content..."
                className="flex-1 flex flex-col"
              />
            </div>
          </div>
          
          <div className="px-6 pb-6 pt-4 border-t">
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreatingTemplate(null)}>
                Cancel
              </Button>
              <Button
                onClick={creatingTemplate?.isUser ? handleCreateUserTemplateWithDialog : handleCreateGlobalTemplate}
                disabled={!newTemplateName.trim() || saving === 'creating'}
              >
                {saving === 'creating' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Edit {editingTemplate?.template_name}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {editingTemplate && (
            <div className="flex-1 overflow-hidden flex flex-col px-6">
              <div className="mb-4">
                <Label htmlFor="edit-template-name">Template Name</Label>
                <Input
                  id="edit-template-name"
                  value={editingTemplate.template_name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, template_name: e.target.value })}
                />
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <Label className="mb-2">Template Content</Label>
                <RichTextEditor
                  value={plainToHtml(editingTemplate.template_content)}
                  onChange={(html, plain) => setEditingTemplate({ ...editingTemplate, template_content: plain })}
                  mergeFields={MERGE_FIELDS}
                  className="flex-1 flex flex-col"
                />
              </div>
            </div>
          )}
          
          <div className="px-6 pb-6 pt-4 border-t">
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => editingTemplate && handleUpdateGlobalTemplate(editingTemplate)}
                disabled={saving === editingTemplate?.id}
              >
                {saving === editingTemplate?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Template Dialog */}
      <Dialog open={!!editingUserTemplate} onOpenChange={() => setEditingUserTemplate(null)}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>Edit Custom Template</DialogTitle>
              <DialogDescription>
                Edit {editingUserTemplate?.template_name}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          {editingUserTemplate && (
            <div className="flex-1 overflow-hidden flex flex-col px-6">
              <div className="mb-4">
                <Label htmlFor="edit-user-template-name">Template Name</Label>
                <Input
                  id="edit-user-template-name"
                  value={editingUserTemplate.template_name}
                  onChange={(e) => setEditingUserTemplate({ ...editingUserTemplate, template_name: e.target.value })}
                />
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <Label className="mb-2">Template Content</Label>
                <RichTextEditor
                  value={editingUserTemplate.template_content_html || 
                    plainToHtml(editingUserTemplate.template_content_plain)
                  }
                  onChange={(html, plain) => setEditingUserTemplate({ 
                    ...editingUserTemplate, 
                    template_content_plain: plain,
                    template_content_html: html
                  })}
                  mergeFields={MERGE_FIELDS}
                  className="flex-1 flex flex-col"
                />
              </div>
            </div>
          )}
          
          <div className="px-6 pb-6 pt-4 border-t">
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUserTemplate(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateUserTemplate}
                disabled={saving === editingUserTemplate?.id}
              >
                {saving === editingUserTemplate?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {selectedTemplateForAI && (
        <ScriptImprovementModal
          open={!!selectedTemplateForAI}
          onClose={() => setSelectedTemplateForAI(null)}
          scriptData={{
            template_id: selectedTemplateForAI.templateId,
            script_type: selectedTemplateForAI.type,
            current_content: selectedTemplateForAI.content,
          }}
          onApply={handleApplyAIImprovement}
        />
      )}
    </>
  );
};