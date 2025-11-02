import { useState } from 'react';
import { useContactStatuses } from '@/hooks/useContactStatuses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const COLOR_OPTIONS = [
  { value: 'gray', label: 'Gray', className: 'text-gray-600 border-gray-300' },
  { value: 'blue', label: 'Blue', className: 'text-blue-600 border-blue-300' },
  { value: 'green', label: 'Green', className: 'text-green-600 border-green-300' },
  { value: 'orange', label: 'Orange', className: 'text-orange-600 border-orange-300' },
  { value: 'purple', label: 'Purple', className: 'text-purple-600 border-purple-300' },
  { value: 'red', label: 'Red', className: 'text-red-600 border-red-300' },
  { value: 'yellow', label: 'Yellow', className: 'text-yellow-600 border-yellow-300' },
];

interface StatusFormData {
  value: string;
  label: string;
  color: string;
  sort_order: number;
}

export const ContactStatusManager = () => {
  const { statuses, isLoading, createStatus, updateStatus, deleteStatus } = useContactStatuses();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StatusFormData>({
    value: '',
    label: '',
    color: 'gray',
    sort_order: 0,
  });

  const selectedStatus = statuses.find(s => s.id === selectedStatusId);

  const handleAdd = () => {
    const maxSortOrder = Math.max(...statuses.map(s => s.sort_order), 0);
    setFormData({
      value: '',
      label: '',
      color: 'gray',
      sort_order: maxSortOrder + 1,
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    if (status) {
      setFormData({
        value: status.value,
        label: status.label,
        color: status.color,
        sort_order: status.sort_order,
      });
      setSelectedStatusId(statusId);
      setIsEditDialogOpen(true);
    }
  };

  const handleDeleteClick = (statusId: string) => {
    setSelectedStatusId(statusId);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = () => {
    const valueSnakeCase = formData.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    createStatus.mutate(
      {
        value: valueSnakeCase,
        label: formData.label,
        color: formData.color,
        sort_order: formData.sort_order,
        is_system: false,
      },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
        },
      }
    );
  };

  const handleSubmitEdit = () => {
    if (!selectedStatusId) return;
    
    updateStatus.mutate(
      {
        id: selectedStatusId,
        updates: {
          label: formData.label,
          color: formData.color,
          sort_order: formData.sort_order,
        },
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setSelectedStatusId(null);
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!selectedStatusId) return;
    
    deleteStatus.mutate(selectedStatusId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedStatusId(null);
      },
    });
  };

  const getColorClass = (color: string) => {
    return COLOR_OPTIONS.find(c => c.value === color)?.className || 'text-gray-600 border-gray-300';
  };

  if (isLoading) {
    return <div className="p-6">Loading contact statuses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Contact Status Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage contact statuses used throughout the application
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Status
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Preview</TableHead>
            <TableHead>Sort Order</TableHead>
            <TableHead>System</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statuses.map((status) => (
            <TableRow key={status.id}>
              <TableCell className="font-medium">{status.label}</TableCell>
              <TableCell className="font-mono text-sm">{status.value}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getColorClass(status.color)}>
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell>{status.sort_order}</TableCell>
              <TableCell>{status.is_system ? 'Yes' : 'No'}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(status.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(status.id)}
                  disabled={status.is_system}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact Status</DialogTitle>
            <DialogDescription>
              Create a new contact status. The value will be automatically formatted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Follow Up Required"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value (auto-generated)</Label>
              <Input
                id="value"
                value={formData.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., follow_up_required"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={color.className}>
                          {color.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdd} disabled={!formData.label}>
              Add Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact Status</DialogTitle>
            <DialogDescription>
              Update the contact status. The value cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">Value (read-only)</Label>
              <Input
                id="edit-value"
                value={formData.value}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={color.className}>
                          {color.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sort_order">Sort Order</Label>
              <Input
                id="edit-sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} disabled={!formData.label}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedStatus?.label}"? This action cannot be undone.
              {selectedStatus?.is_system && (
                <span className="block mt-2 text-destructive font-semibold">
                  This is a system status and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={selectedStatus?.is_system}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
