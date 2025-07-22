import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

// Import components
import ActivityFormEnhanced from '@/components/activities/ActivityFormEnhanced';
import { PendingReview } from '@/components/activities/PendingReview';
import ChannelManagement from '@/components/channels/ChannelManagement';
import { ChannelChat } from '@/components/channels/ChannelChat';
import InternManagement from '@/components/staff/InternManagement';
import PrintableWeeklyReport from '@/components/reports/PrintableWeeklyReport';
import ProfileSettings from '@/components/profile/ProfileSettings';
import { SystemSettings } from '@/components/settings/SystemSettings';
import { CommentSection } from '@/components/comments/CommentSection';

import { 
  Plus, 
  CheckCircle, 
  Clock, 
  Activity,
  MessageSquare,
  Users,
  FileText,
  Filter,
  ArrowLeft
} from 'lucide-react';

const DashboardNew = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('activity');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);
  const [channels, setChannels] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    // Fetch activities
    const { data: activitiesData } = await supabase
      .from('activities')
      .select('*')
      .eq(profile.role === 'intern' ? 'user_id' : 'status', profile.role === 'intern' ? profile.id : 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch channels
    const { data: channelsData } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false });

    // Calculate stats
    const statsData = {
      totalSubmissions: activitiesData?.length || 0,
      pendingReviews: activitiesData?.filter(a => a.status === 'pending').length || 0,
      approved: activitiesData?.filter(a => a.status === 'approved').length || 0,
      rejected: activitiesData?.filter(a => a.status === 'rejected').length || 0,
      activeChannels: channelsData?.length || 0,
      todayActivities: activitiesData?.filter(a => 
        new Date(a.created_at).toDateString() === new Date().toDateString()
      ).length || 0,
    };

    setActivities(activitiesData || []);
    setChannels(channelsData || []);
    setStats(statsData);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedChannel(null); // Reset channel selection when changing tabs
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleChannelSelect = (channel: any) => {
    setSelectedChannel(channel);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'activity':
        return (
          <div className="space-y-6">
            {profile?.role === 'intern' && (
              <ActivityFormEnhanced />
            )}
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activities
                    </CardTitle>
                    <CardDescription>
                      {profile?.role === 'intern' 
                        ? 'Your submitted activities and their status'
                        : 'Latest activity submissions from all interns'
                      }
                    </CardDescription>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={filter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filter === 'pending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter('pending')}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Pending
                    </Button>
                    <Button
                      variant={filter === 'approved' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter('approved')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approved
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities
                    .filter(activity => filter === 'all' || activity.status === filter)
                    .filter(activity => 
                      searchQuery === '' || 
                      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      activity.content.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((activity) => (
                      <div key={activity.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{activity.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {activity.content.substring(0, 150)}...
                            </p>
                          </div>
                          <Badge 
                            variant={
                              activity.status === 'approved' ? 'default' :
                              activity.status === 'pending' ? 'secondary' : 'destructive'
                            }
                          >
                            {activity.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {activity.activity_date ? 
                              `Activity Date: ${new Date(activity.activity_date).toLocaleDateString()}` :
                              `Submitted: ${new Date(activity.created_at).toLocaleDateString()}`
                            }
                          </span>
                          {activity.location?.name && (
                            <span>📍 {activity.location.name}</span>
                          )}
                        </div>

                        {/* Comments Section */}
                        <div className="border-t pt-3">
                          <CommentSection 
                            activityId={activity.id} 
                            isReadOnly={profile?.role === 'intern'}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'pending':
        return <PendingReview />;

      case 'channels':
        if (selectedChannel) {
          return (
            <ChannelChat 
              channel={selectedChannel} 
              onBack={() => setSelectedChannel(null)}
            />
          );
        }
        return (
          <div className="space-y-6">
            {profile?.role !== 'intern' && <ChannelManagement />}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Available Channels
                </CardTitle>
                <CardDescription>
                  Join conversations with your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {channels
                  // Allow all users to view and interact with channels
                  .filter(channel => true)
                    .map((channel) => (
                      <Card 
                        key={channel.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleChannelSelect(channel)}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium mb-2">{channel.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {channel.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {channel.intern_ids?.length || 0} members
                            </Badge>
                            <Button variant="ghost" size="sm">
                              Join Chat
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'interns':
        return <InternManagement />;

      case 'reports':
        return (
          <div className="space-y-6">
            {profile?.role === 'intern' ? (
              <PrintableWeeklyReport />
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold mb-4">Reports</h2>
                <p className="text-muted-foreground">Staff and Admin reporting features coming soon</p>
              </div>
            )}
          </div>
        );

      case 'settings':
        return profile?.role === 'admin' ? <SystemSettings /> : <ProfileSettings />;

      default:
        return null;
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Unable to load profile. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout 
      onTabChange={handleTabChange}
      onSearch={handleSearch}
      onProfileClick={() => setActiveTab('settings')}
    >
      {/* Dashboard Stats */}
      <DashboardStats stats={stats} role={profile.role} />

      {/* Main Content */}
      <div className="flex-1">
        {renderTabContent()}
      </div>
    </DashboardLayout>
  );
};

export default DashboardNew;