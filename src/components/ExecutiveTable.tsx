import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ExternalLink, Eye, Trash2, Edit3, Save, X, Plus, ArrowUp } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Executive } from "@/types/executive";

interface ExecutiveTableProps {
  executives: Executive[];
  researchJobId: string;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function ExecutiveTable({ executives, researchJobId, onUpdate, onDelete }: ExecutiveTableProps) {
  const [selectedExecutive, setSelectedExecutive] = useState<Executive | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Executive | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExecutive, setNewExecutive] = useState({
    name: '',
    position: '',
    linkedin_url: ''
  });
  const { toast } = useToast();
  const { permissions } = useUserRole();

  const handleViewMore = (executive: Executive) => {
    setSelectedExecutive(executive);
    setEditForm({ ...executive });
    setIsModalOpen(true);
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setSelectedExecutive(null);
    setEditForm(null);
    setIsModalOpen(false);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditForm(selectedExecutive ? { ...selectedExecutive } : null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editForm || !selectedExecutive) return;

    try {
      const { error } = await supabase
        .from('executives')
        .update({
          name: editForm.name,
          position: editForm.position,
          linkedin_url: editForm.linkedin_url,
          summary: editForm.summary,
          history: editForm.history,
          interests: editForm.interests,
          keywords: editForm.keywords,
          confidence_level: editForm.confidence_level
        })
        .eq('id', selectedExecutive.id);

      if (error) throw error;

      setSelectedExecutive(editForm);
      setIsEditing(false);
      toast({
        title: "Executive updated",
        description: "Executive information has been successfully updated.",
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error updating executive:', error);
      toast({
        title: "Error",
        description: "Failed to update executive information.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (executive: Executive) => {
    if (!confirm(`Are you sure you want to delete ${executive.name}?`)) return;

    try {
      const { error } = await supabase
        .from('executives')
        .delete()
        .eq('id', executive.id);

      if (error) throw error;

      toast({
        title: "Executive deleted",
        description: `${executive.name} has been removed from the executive list.`,
      });
      onDelete?.();
    } catch (error) {
      console.error('Error deleting executive:', error);
      toast({
        title: "Error",
        description: "Failed to delete executive.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof Executive, value: string | string[]) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  const handleConfidenceChange = async (executiveId: string, newConfidence: string) => {
    try {
      const { error } = await supabase
        .from('executives')
        .update({ confidence_level: newConfidence })
        .eq('id', executiveId);

      if (error) throw error;

      toast({
        title: "Confidence level updated",
        description: "Executive confidence level has been successfully updated.",
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error updating confidence level:', error);
      toast({
        title: "Error",
        description: "Failed to update confidence level.",
        variant: "destructive",
      });
    }
  };

  const handleAddExecutive = async () => {
    if (!newExecutive.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
        const { error } = await supabase
          .from('executives')
          .insert({
            research_job_id: researchJobId,
            name: newExecutive.name.trim(),
            position: newExecutive.position.trim() || '',
            linkedin_url: newExecutive.linkedin_url.trim() || null,
            confidence_level: 'medium', // User-added executives get medium confidence by default
          });

      if (error) throw error;

      toast({
        title: "Executive added",
        description: "The new executive has been successfully added.",
      });

      setNewExecutive({ name: '', position: '', linkedin_url: '' });
      setIsAddModalOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error adding executive:', error);
      toast({
        title: "Error",
        description: "Failed to add executive.",
        variant: "destructive",
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!executives || executives.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Key Executives & Leadership Team
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
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Executive
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Executive</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="executive-name">Name *</Label>
                    <Input
                      id="executive-name"
                      value={newExecutive.name}
                      onChange={(e) => setNewExecutive({...newExecutive, name: e.target.value})}
                      placeholder="Enter executive name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="executive-position">Position</Label>
                    <Input
                      id="executive-position"
                      value={newExecutive.position}
                      onChange={(e) => setNewExecutive({...newExecutive, position: e.target.value})}
                      placeholder="Enter position (e.g., CTO, VP of Sales)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="executive-linkedin">LinkedIn Profile</Label>
                    <Input
                      id="executive-linkedin"
                      type="url"
                      value={newExecutive.linkedin_url}
                      onChange={(e) => setNewExecutive({...newExecutive, linkedin_url: e.target.value})}
                      placeholder="https://linkedin.com/in/profile"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddExecutive} className="flex-1">
                      Add Executive
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No executives found. Click "Add Executive" to create one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Key Executives & Leadership Team
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
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Executive
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Executive</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="executive-name">Name *</Label>
                    <Input
                      id="executive-name"
                      value={newExecutive.name}
                      onChange={(e) => setNewExecutive({...newExecutive, name: e.target.value})}
                      placeholder="Enter executive name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="executive-position">Position</Label>
                    <Input
                      id="executive-position"
                      value={newExecutive.position}
                      onChange={(e) => setNewExecutive({...newExecutive, position: e.target.value})}
                      placeholder="Enter position (e.g., CTO, VP of Sales)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="executive-linkedin">LinkedIn Profile</Label>
                    <Input
                      id="executive-linkedin"
                      type="url"
                      value={newExecutive.linkedin_url}
                      onChange={(e) => setNewExecutive({...newExecutive, linkedin_url: e.target.value})}
                      placeholder="https://linkedin.com/in/profile"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddExecutive} className="flex-1">
                      Add Executive
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                      <TableHead className="w-1"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Background</TableHead>
                      <TableHead>LinkedIn</TableHead>
                      {permissions.canEdit && <TableHead>Confidence</TableHead>}
                      <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executives.map((executive) => {
                  const getConfidenceColor = (level?: string) => {
                    switch (level) {
                      case 'high': return 'bg-green-500';
                      case 'medium': return 'bg-amber-500';
                      case 'low': return 'bg-red-500';
                      default: return 'bg-gray-400';
                    }
                  };

                  const getConfidenceBadge = (level?: string) => {
                    switch (level) {
                      case 'high': return { variant: 'default' as const, text: 'High Confidence', color: 'text-green-600 bg-green-50' };
                      case 'medium': return { variant: 'secondary' as const, text: 'Medium Confidence', color: 'text-amber-600 bg-amber-50' };
                      case 'low': return { variant: 'destructive' as const, text: 'Low Confidence', color: 'text-red-600 bg-red-50' };
                      default: return { variant: 'outline' as const, text: 'Unverified', color: 'text-gray-600 bg-gray-50' };
                    }
                  };

                  return (
                    <TableRow key={executive.id}>
                      <TableCell className="p-0">
                        <div 
                          className={`w-1 h-full min-h-[60px] ${getConfidenceColor(executive.confidence_level)}`}
                          title={`${executive.confidence_level || 'unverified'} confidence level`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{executive.name}</div>
                          {!permissions.canEdit && (
                            <Badge 
                              variant={getConfidenceBadge(executive.confidence_level).variant}
                              className={`text-xs ${getConfidenceBadge(executive.confidence_level).color}`}
                            >
                              {getConfidenceBadge(executive.confidence_level).text}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{executive.position}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {executive.summary || `${executive.position} with expertise in business leadership.`}
                        </p>
                      </TableCell>
                      <TableCell>
                        {executive.linkedin_url ? (
                          <a
                            href={executive.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Profile
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not available</span>
                        )}
                      </TableCell>
                      {permissions.canEdit && (
                        <TableCell>
                          <Select
                            value={executive.confidence_level || 'medium'}
                            onValueChange={(value) => handleConfidenceChange(executive.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMore(executive)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View More
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(executive)}
                            className="flex items-center gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Executive Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {isEditing ? "Edit Executive" : selectedExecutive?.name}
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="flex items-center gap-1"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="flex items-center gap-1"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {editForm && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <h3 className="font-semibold text-lg mt-1">{editForm.name}</h3>
                  )}
                </div>

                <div>
                  <Label htmlFor="position">Position</Label>
                  {isEditing ? (
                    <Input
                      id="position"
                      value={editForm.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1">{editForm.position}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  {isEditing ? (
                    <Input
                      id="linkedin"
                      value={editForm.linkedin_url || ''}
                      onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/profile"
                      className="mt-1"
                    />
                  ) : editForm.linkedin_url ? (
                    <a
                      href={editForm.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2 mt-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      LinkedIn Profile
                    </a>
                  ) : (
                    <p className="text-muted-foreground mt-1">Not available</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="summary">Professional Summary</Label>
                {isEditing ? (
                  <Textarea
                    id="summary"
                    value={editForm.summary || ''}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                ) : editForm.summary ? (
                  <p className="text-muted-foreground mt-1">{editForm.summary}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="history">Professional Background</Label>
                {isEditing ? (
                  <Textarea
                    id="history"
                    value={editForm.history || ''}
                    onChange={(e) => handleInputChange('history', e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                ) : editForm.history ? (
                  <p className="text-muted-foreground mt-1">{editForm.history}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="interests">Professional Interests & Expertise</Label>
                {isEditing ? (
                  <Textarea
                    id="interests"
                    value={editForm.interests || ''}
                    onChange={(e) => handleInputChange('interests', e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                ) : editForm.interests ? (
                  <p className="text-muted-foreground mt-1">{editForm.interests}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="keywords">Areas of Expertise (comma-separated)</Label>
                {isEditing ? (
                  <Input
                    id="keywords"
                    value={editForm.keywords?.join(', ') || ''}
                    onChange={(e) => handleInputChange('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
                    placeholder="Leadership, Strategy, Technology"
                    className="mt-1"
                  />
                ) : editForm.keywords && editForm.keywords.length > 0 ? (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {editForm.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              
              <div>
                <Label htmlFor="confidence">Confidence Level</Label>
                {isEditing ? (
                  <Select
                    value={editForm.confidence_level || 'medium'}
                    onValueChange={(value) => handleInputChange('confidence_level', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge 
                    variant={
                      editForm.confidence_level === 'high' ? 'default' :
                      editForm.confidence_level === 'low' ? 'destructive' : 'secondary'
                    }
                    className="mt-1"
                  >
                    {editForm.confidence_level === 'high' ? 'High' :
                     editForm.confidence_level === 'low' ? 'Low' : 'Medium'} Confidence
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}