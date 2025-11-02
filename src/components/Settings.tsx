import { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings as SettingsIcon, 
  User, 
  Users,
  Save,
  Linkedin,
  FileText,
  Tag
} from 'lucide-react';
import UserManagement from './UserManagement';
import RoleGuard from './RoleGuard';
import { EnhancedScriptTemplateManager } from './EnhancedScriptTemplateManager';
import { ContactStatusManager } from './ContactStatusManager';

const Settings = () => {
  const { user } = useAuth();
  const { permissions } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState({
    user_name: '',
    display_name: '',
    linkedin_url: '',
    user_last_ceo_position: '',
    user_last_company: '',
    user_phone_number: '',
    user_industry_experience: [] as string[],
    user_interests: [] as string[],
    user_location: ''
  });
  
  // Temporary string states for comma-separated fields
  const [industryExperienceText, setIndustryExperienceText] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setProfile({
        user_name: data.user_name || '',
        display_name: data.display_name || '',
        linkedin_url: data.linkedin_url || '',
        user_last_ceo_position: data.user_last_ceo_position || '',
        user_last_company: data.user_last_company || '',
        user_phone_number: data.user_phone_number || '',
        user_industry_experience: data.user_industry_experience || [],
        user_interests: data.user_interests || [],
        user_location: data.user_location || ''
      });
      
      // Set text fields from arrays
      setIndustryExperienceText((data.user_industry_experience || []).join(', '));
      setInterestsText((data.user_interests || []).join(', '));
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Convert text to arrays before saving
      const industryExperience = industryExperienceText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const interests = interestsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          user_name: profile.user_name,
          display_name: profile.display_name,
          linkedin_url: profile.linkedin_url,
          user_last_ceo_position: profile.user_last_ceo_position,
          user_last_company: profile.user_last_company,
          user_phone_number: profile.user_phone_number,
          user_industry_experience: industryExperience,
          user_interests: interests,
          user_location: profile.user_location
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchProfile();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <RoleGuard allowedRoles={['super_admin']} mode="hide">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </TabsTrigger>
            </RoleGuard>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Script Templates
            </TabsTrigger>
            <RoleGuard allowedRoles={['super_admin']} mode="hide">
              <TabsTrigger value="contact-statuses" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Contact Statuses
              </TabsTrigger>
            </RoleGuard>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Full Name</Label>
                  <Input
                    id="userName"
                    value={profile.user_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, user_name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profile.display_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Your display name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userLocation">Location</Label>
                  <Input
                    id="userLocation"
                    value={profile.user_location}
                    onChange={(e) => setProfile(prev => ({ ...prev, user_location: e.target.value }))}
                    placeholder="City, State/Country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userPhoneNumber">Phone Number</Label>
                  <Input
                    id="userPhoneNumber"
                    type="tel"
                    value={profile.user_phone_number}
                    onChange={(e) => setProfile(prev => ({ ...prev, user_phone_number: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn URL
                  </Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={profile.linkedin_url}
                    onChange={(e) => setProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userLastCeoPosition">Last CEO/Founder Position</Label>
                  <Input
                    id="userLastCeoPosition"
                    value={profile.user_last_ceo_position}
                    onChange={(e) => setProfile(prev => ({ ...prev, user_last_ceo_position: e.target.value }))}
                    placeholder="e.g., CEO & Founder"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userLastCompany">Last Company</Label>
                  <Input
                    id="userLastCompany"
                    value={profile.user_last_company}
                    onChange={(e) => setProfile(prev => ({ ...prev, user_last_company: e.target.value }))}
                    placeholder="Your previous company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userIndustryExperience">Industry Experience (comma-separated)</Label>
                  <Input
                    id="userIndustryExperience"
                    value={industryExperienceText}
                    onChange={(e) => setIndustryExperienceText(e.target.value)}
                    placeholder="e.g., SaaS, FinTech, Healthcare"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userInterests">Key Interests (comma-separated)</Label>
                  <Input
                    id="userInterests"
                    value={interestsText}
                    onChange={(e) => setInterestsText(e.target.value)}
                    placeholder="e.g., AI, sustainability, innovation"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed. Contact an administrator if you need to update your email.
                  </p>
                </div>

                <Button 
                  onClick={handleProfileUpdate} 
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <RoleGuard allowedRoles={['super_admin']} mode="hide">
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          </RoleGuard>

          <TabsContent value="templates">
            <EnhancedScriptTemplateManager />
          </TabsContent>

          <RoleGuard allowedRoles={['super_admin']} mode="hide">
            <TabsContent value="contact-statuses">
              <ContactStatusManager />
            </TabsContent>
          </RoleGuard>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;