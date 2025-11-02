import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, Linkedin, Calendar, FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ContactActivity as ContactActivityType, ActivityType, ActivityStatus } from '@/types/activity';
import RoleGuard from '@/components/RoleGuard';

interface ContactActivityProps {
  researchJobId: string;
}

const ActivityTypeIcon = ({ type }: { type: ActivityType }) => {
  const icons = {
    email: <Mail className="h-4 w-4" />,
    phone: <Phone className="h-4 w-4" />,
    linkedin: <Linkedin className="h-4 w-4" />,
    meeting: <Calendar className="h-4 w-4" />,
    other: <FileText className="h-4 w-4" />,
  };
  return icons[type];
};

const getActivityStatusColor = (status: ActivityStatus) => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800';
    case 'complete': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    case 'scheduled': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getActivityStatusLabel = (status: ActivityStatus) => {
  switch (status) {
    case 'new': return 'New';
    case 'in_progress': return 'In Progress';
    case 'complete': return 'Complete';
    case 'cancelled': return 'Cancelled';
    case 'scheduled': return 'Scheduled';
    default: return status;
  }
};

const getActivityTypeLabel = (type: ActivityType) => {
  switch (type) {
    case 'email': return 'Email';
    case 'phone': return 'Phone Call';
    case 'linkedin': return 'LinkedIn';
    case 'meeting': return 'Meeting';
    case 'other': return 'Other';
    default: return type;
  }
};

export function ContactActivity({ researchJobId }: ContactActivityProps) {
  const { user } = useAuth();
  const { permissions } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [deleteActivityId, setDeleteActivityId] = React.useState<string | null>(null);
  const [editActivity, setEditActivity] = React.useState<ContactActivityType | null>(null);

  const [formData, setFormData] = React.useState({
    activity_type: 'email' as ActivityType,
    notes: '',
    status: 'new' as ActivityStatus,
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['contact-activities', researchJobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_activity')
        .select('*')
        .eq('research_job_id', researchJobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactActivityType[];
    },
    enabled: !!researchJobId,
  });

  const createMutation = useMutation({
    mutationFn: async (activity: typeof formData) => {
      const { data, error } = await supabase
        .from('contact_activity')
        .insert({
          research_job_id: researchJobId,
          activity_type: activity.activity_type,
          notes: activity.notes,
          status: activity.status,
          created_by: user?.id!,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-activities', researchJobId] });
      toast({
        title: 'Activity added',
        description: 'Contact activity has been recorded.',
      });
      setIsAddDialogOpen(false);
      setFormData({ activity_type: 'email', notes: '', status: 'new' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, activity }: { id: string; activity: typeof formData }) => {
      const { data, error } = await supabase
        .from('contact_activity')
        .update({
          activity_type: activity.activity_type,
          notes: activity.notes,
          status: activity.status,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-activities', researchJobId] });
      toast({
        title: 'Activity updated',
        description: 'Contact activity has been updated.',
      });
      setIsEditDialogOpen(false);
      setEditActivity(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_activity')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-activities', researchJobId] });
      toast({
        title: 'Activity deleted',
        description: 'Contact activity has been removed.',
      });
      setDeleteActivityId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddActivity = () => {
    createMutation.mutate(formData);
  };

  const handleEditActivity = () => {
    if (editActivity) {
      updateMutation.mutate({ id: editActivity.id, activity: formData });
    }
  };

  const openEditDialog = (activity: ContactActivityType) => {
    setEditActivity(activity);
    setFormData({
      activity_type: activity.activity_type,
      notes: activity.notes,
      status: activity.status,
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
        </p>
        <RoleGuard allowedRoles={['editor', 'super_admin']} mode="hide">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact Activity</DialogTitle>
                <DialogDescription>
                  Record a new contact activity for this research job.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Activity Type</Label>
                  <Select
                    value={formData.activity_type}
                    onValueChange={(value: ActivityType) =>
                      setFormData({ ...formData, activity_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: ActivityStatus) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Enter details about this contact activity..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddActivity}
                    disabled={!formData.notes.trim() || createMutation.isPending}
                  >
                    Add Activity
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </RoleGuard>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
            <p className="text-muted-foreground text-sm">
              Record contact activities to track your interactions with this company.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <ActivityTypeIcon type={activity.activity_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">
                        {getActivityTypeLabel(activity.activity_type)}
                      </span>
                      <Badge className={getActivityStatusColor(activity.status)}>
                        {getActivityStatusLabel(activity.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {activity.notes}
                    </p>
                  </div>
                  <RoleGuard allowedRoles={['editor', 'super_admin']} mode="hide">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(activity)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteActivityId(activity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </RoleGuard>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact Activity</DialogTitle>
            <DialogDescription>
              Update the details of this contact activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Activity Type</Label>
              <Select
                value={formData.activity_type}
                onValueChange={(value: ActivityType) =>
                  setFormData({ ...formData, activity_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: ActivityStatus) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter details about this contact activity..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditActivity(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditActivity}
                disabled={!formData.notes.trim() || updateMutation.isPending}
              >
                Update Activity
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteActivityId}
        onOpenChange={() => setDeleteActivityId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteActivityId && deleteMutation.mutate(deleteActivityId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
