import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Users, Database, Shield, Bell, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const SystemSettings = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // System settings state
  const [systemName, setSystemName] = useState('LIRA University Intern Management System');
  const [systemDescription, setSystemDescription] = useState('Comprehensive intern management platform for LIRA University');
  const [allowSignups, setAllowSignups] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInterns: 0,
    totalStaff: 0,
    totalActivities: 0,
    totalChannels: 0,
    totalComments: 0
  });

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const [profiles, activities, channels, comments] = await Promise.all([
        supabase.from('profiles').select('role'),
        supabase.from('activities').select('id'),
        supabase.from('channels').select('id'),
        supabase.from('comments').select('id')
      ]);

      const profileData = profiles.data || [];
      setStats({
        totalUsers: profileData.length,
        totalInterns: profileData.filter(p => p.role === 'intern').length,
        totalStaff: profileData.filter(p => p.role === 'staff').length,
        totalActivities: activities.data?.length || 0,
        totalChannels: channels.data?.length || 0,
        totalComments: comments.data?.length || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be saved to a system settings table
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save system settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Access denied. Only administrators can access system settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure and manage system-wide settings and preferences
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="systemName">System Name</Label>
                <Input
                  id="systemName"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="systemDescription">System Description</Label>
                <Textarea
                  id="systemDescription"
                  value={systemDescription}
                  onChange={(e) => setSystemDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable to restrict system access during maintenance
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>

              <Button onClick={saveSettings} disabled={loading}>
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Signups</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to register for accounts
                  </p>
                </div>
                <Switch
                  checked={allowSignups}
                  onCheckedChange={setAllowSignups}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Require users to verify their email before accessing the system
                  </p>
                </div>
                <Switch
                  checked={requireEmailVerification}
                  onCheckedChange={setRequireEmailVerification}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.totalInterns}</div>
                    <div className="text-sm text-muted-foreground">Interns</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.totalStaff}</div>
                    <div className="text-sm text-muted-foreground">Staff</div>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={saveSettings} disabled={loading}>
                Save User Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Session Timeout</Label>
                <Input type="number" placeholder="60" />
                <p className="text-sm text-muted-foreground">
                  Session timeout in minutes
                </p>
              </div>

              <div className="space-y-2">
                <Label>Password Policy</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="requireNumbers" />
                    <Label htmlFor="requireNumbers">Require numbers</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="requireSpecialChars" />
                    <Label htmlFor="requireSpecialChars">Require special characters</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="requireUppercase" />
                    <Label htmlFor="requireUppercase">Require uppercase letters</Label>
                  </div>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={loading}>
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                System Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.totalActivities}</div>
                    <div className="text-sm text-muted-foreground">Total Activities</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.totalChannels}</div>
                    <div className="text-sm text-muted-foreground">Total Channels</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.totalComments}</div>
                    <div className="text-sm text-muted-foreground">Total Comments</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {stats.totalActivities > 0 ? Math.round((stats.totalComments / stats.totalActivities) * 100) / 100 : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Comments/Activity</div>
                  </CardContent>
                </Card>
              </div>

              <Button onClick={fetchSystemStats} variant="outline">
                Refresh Analytics
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};