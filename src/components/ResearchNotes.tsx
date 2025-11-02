import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit2, Save, X, ArrowUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserRole } from '@/hooks/useUserRole';

interface ResearchNotesProps {
  researchJobId: string;
}

interface Notes {
  id?: string;
  internal_notes: string;
  feedback: string;
  corum_activity: string;
}

export const ResearchNotes = ({ researchJobId }: ResearchNotesProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingNotes, setEditingNotes] = useState<Notes>({
    internal_notes: '',
    feedback: '',
    corum_activity: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions } = useUserRole();

  const { data: notes, isLoading } = useQuery({
    queryKey: ['research-notes', researchJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_notes')
        .select('*')
        .eq('research_job_id', researchJobId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    retry: 3,
    retryDelay: 1000
  });

  const startEditing = () => {
    setEditingNotes({
      id: notes?.id,
      internal_notes: notes?.internal_notes || '',
      feedback: notes?.feedback || '',
      corum_activity: notes?.corum_activity || ''
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingNotes({
      internal_notes: '',
      feedback: '',
      corum_activity: ''
    });
  };

  const saveChanges = async () => {
    try {
      if (notes?.id) {
        // Update existing notes
        const { error } = await supabase
          .from('research_notes')
          .update({
            internal_notes: editingNotes.internal_notes,
            feedback: editingNotes.feedback,
            corum_activity: editingNotes.corum_activity
          })
          .eq('id', notes.id);

        if (error) throw error;
      } else {
        // Create new notes
        const { error } = await supabase
          .from('research_notes')
          .insert({
            research_job_id: researchJobId,
            internal_notes: editingNotes.internal_notes,
            feedback: editingNotes.feedback,
            corum_activity: editingNotes.corum_activity
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Notes saved successfully",
      });

      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['research-notes', researchJobId] });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        </CardContent>
      </Card>
    );
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Notes
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
          {!isEditing && permissions.canEdit && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Edit2 className="h-4 w-4 mr-2" />
              {notes ? 'Edit' : 'Add Notes'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isEditing ? (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium">Internal Notes</label>
              <Textarea
                value={editingNotes.internal_notes}
                onChange={(e) => setEditingNotes(prev => ({
                  ...prev,
                  internal_notes: e.target.value
                }))}
                placeholder="Add your internal notes here..."
                className="mt-2 min-h-[120px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Feedback</label>
              <Textarea
                value={editingNotes.feedback}
                onChange={(e) => setEditingNotes(prev => ({
                  ...prev,
                  feedback: e.target.value
                }))}
                placeholder="Add your feedback here..."
                className="mt-2 min-h-[120px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Corum Activity</label>
              <Textarea
                value={editingNotes.corum_activity}
                onChange={(e) => setEditingNotes(prev => ({
                  ...prev,
                  corum_activity: e.target.value
                }))}
                placeholder="Add Corum activity notes here..."
                className="mt-2 min-h-[120px]"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={saveChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Internal Notes</h4>
              {notes?.internal_notes ? (
                <div className="bg-muted/50 p-4 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{notes.internal_notes}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No internal notes added yet.</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-2">Feedback</h4>
              {notes?.feedback ? (
                <div className="bg-muted/50 p-4 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{notes.feedback}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No feedback added yet.</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold mb-2">Corum Activity</h4>
              {notes?.corum_activity ? (
                <div className="bg-muted/50 p-4 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{notes.corum_activity}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No Corum activity notes added yet.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};