import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/hooks/useUserRole';
import { Save, Loader2 } from 'lucide-react';

interface UserProfile {
  user_id: string;
  display_name: string;
  linkedin_url: string;
  status: string;
  created_at: string;
  role: UserRole;
  email: string;
}

interface UserEditDialogProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

export const UserEditDialog = ({ user, isOpen, onClose, onUserUpdated }: UserEditDialogProps) => {
  const [editForm, setEditForm] = useState({
    display_name: '',
    linkedin_url: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Update form when user changes
  useState(() => {
    if (user) {
      setEditForm({
        display_name: user.display_name || '',
        linkedin_url: user.linkedin_url || ''
      });
    }
  });

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editForm.display_name,
          linkedin_url: editForm.linkedin_url
        })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User profile updated successfully"
      });
      
      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user profile"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEditForm({ display_name: '', linkedin_url: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
        </DialogHeader>
        
        {user && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed from this interface
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={editForm.display_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Enter display name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={editForm.linkedin_url}
                onChange={(e) => setEditForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};