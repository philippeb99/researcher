import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Copy, Trash2, Edit, Search, Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedScriptModal } from './EnhancedScriptModal';
import { SCRIPT_TYPE_LABELS } from '@/constants/scriptTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface GeneratedScript {
  id: string;
  research_job_id: string;
  user_id: string;
  script_type: string;
  template_id: string | null;
  template_source: string | null;
  script_content_plain: string;
  script_content_html: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface GeneratedScriptsGridProps {
  researchJobId: string;
}

export const GeneratedScriptsGrid = ({ researchJobId }: GeneratedScriptsGridProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedScript, setSelectedScript] = useState<GeneratedScript | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scripts, isLoading } = useQuery({
    queryKey: ['generated-scripts', researchJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_scripts')
        .select('*')
        .eq('research_job_id', researchJobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch template names separately for each script
      const scriptsWithTemplates = await Promise.all(
        (data || []).map(async (script) => {
          if (!script.template_id) {
            return { ...script, template_name: 'Default Template' };
          }
          
          // Fetch from user templates
          const { data: userTemplate } = await supabase
            .from('user_baseline_templates')
            .select('template_name')
            .eq('id', script.template_id)
            .single();
          
          if (userTemplate) {
            return { ...script, template_name: userTemplate.template_name };
          }
          
          return { ...script, template_name: 'Default Template' };
        })
      );
      
      return scriptsWithTemplates as any[];
    },
  });

  const deleteScript = useMutation({
    mutationFn: async (scriptId: string) => {
      const { error } = await supabase
        .from('generated_scripts')
        .delete()
        .eq('id', scriptId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-scripts', researchJobId] });
      toast({
        title: 'Success',
        description: 'Script deleted successfully',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete script',
      });
    },
  });

  const copyScript = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: 'Copied!',
        description: 'Script copied to clipboard',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy to clipboard',
      });
    }
  };

  const filteredScripts = scripts?.filter((script) => {
    const matchesSearch = script.script_content_plain
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || script.script_type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading scripts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search scripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="phone_call">Phone Call</SelectItem>
            <SelectItem value="voice_mail">Voice Mail</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!filteredScripts || filteredScripts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all' 
                ? 'No scripts match your filters' 
                : 'No scripts generated yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Script Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Date Generated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScripts.map((script) => {
                return (
                  <TableRow key={script.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {script.template_name || 'Default Template'}
                        {script.version > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            v{script.version}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {SCRIPT_TYPE_LABELS[script.script_type as keyof typeof SCRIPT_TYPE_LABELS]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        Custom
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(script.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyScript(script.script_content_plain)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedScript(script)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteScript.mutate(script.id)}
                          disabled={deleteScript.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {selectedScript && (
        <EnhancedScriptModal
          script={{
            id: selectedScript.id,
            script_type: selectedScript.script_type as any,
            script_content: selectedScript.script_content_plain,
            updated_at: selectedScript.updated_at,
          }}
          onClose={() => setSelectedScript(null)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['generated-scripts', researchJobId] });
            setSelectedScript(null);
          }}
          researchJobId={researchJobId}
        />
      )}
    </div>
  );
};