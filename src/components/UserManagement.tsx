import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Shield, 
  User, 
  Eye,
  Search,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { UserEditDialog } from './UserEditDialog';

interface UserProfile {
  user_id: string;
  display_name: string;
  linkedin_url: string;
  status: string;
  created_at: string;
  role: UserRole;
  email: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchUsers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_user_profiles_with_emails');

      if (error) {
        // Check if it's an authorization error
        if (error.message?.includes('Unauthorized') || error.message?.includes('super_admin')) {
          console.error('Authorization error:', error);
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You need super_admin role to manage users"
          });
          setUsers([]);
          return;
        }
        throw error;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .rpc('update_user_role', { _user_id: userId, _role: newRole });

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: "Success",
        description: "User role updated successfully"
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role"
      });
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, status: newStatus } : user
      ));

      toast({
        title: "Success",
        description: "User status updated successfully"
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user status"
      });
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password reset email sent to user"
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send password reset email"
      });
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return <Shield className="h-4 w-4" />;
      case 'editor': return <Edit className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'editor': return 'default';
      case 'viewer': return 'secondary';
      default: return 'outline';
    }
  };

  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.user_id} className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* User Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h4 className="font-semibold">{user.display_name || 'N/A'}</h4>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                        {getRoleIcon(user.role)}
                        {user.role.replace('_', ' ')}
                      </Badge>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    
                    {user.linkedin_url && (
                      <a 
                        href={user.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1 w-fit"
                      >
                        <ExternalLink className="h-3 w-3" />
                        LinkedIn Profile
                      </a>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row gap-2 lg:w-auto">
                    <Select
                      value={user.role}
                      onValueChange={(value: UserRole) => handleRoleChange(user.user_id, value)}
                    >
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={user.status}
                      onValueChange={(value) => handleStatusChange(user.user_id, value)}
                    >
                      <SelectTrigger className="w-full sm:w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsEditDialogOpen(true);
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user.user_id, user.email)}
                      className="w-full sm:w-auto"
                    >
                      Reset Password
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <UserEditDialog
        user={selectedUser}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedUser(null);
        }}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
};

export default UserManagement;