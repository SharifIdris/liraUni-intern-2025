import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  LogOut,
  MessageSquare
} from 'lucide-react';
import ActivityForm from '@/components/activities/ActivityForm';
import { ChannelChat } from '@/components/channels/ChannelChat';
import { formatDistanceToNow } from 'date-fns';
import PrintableWeeklyReport from '@/components/reports/PrintableWeeklyReport';

interface Activity {
  id: string;
  title: string;
  content: string;
  generated_content: string | null;
  location: any;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
}

const InternDashboard = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
    fetchChannels();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Error",
        description: "Failed to load activities.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'bg-success/10 text-success border-success/20',
      rejected: 'bg-destructive/10 text-destructive border-destructive/20',
      pending: 'bg-warning/10 text-warning border-warning/20'
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-university-light-blue/10">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Intern Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {profile?.full_name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Activities</p>
                  <p className="text-2xl font-bold text-foreground">{activities.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-university-blue" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-success">
                    {activities.filter(a => a.status === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-warning">
                    {activities.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="activities" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activities">My Activities</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="space-y-4">
            {/* Add Activity Button */}
            <div className="mb-8">
              <Button 
                onClick={() => setShowActivityForm(true)}
                className="bg-gradient-to-r from-university-blue to-primary hover:from-primary-hover hover:to-university-blue transition-all duration-300"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Submit New Activity
              </Button>
            </div>

            {/* Activities List */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Your Activities</h2>
              
              {activities.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No activities yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by submitting your first internship activity
                    </p>
                    <Button 
                      onClick={() => setShowActivityForm(true)}
                      className="bg-gradient-to-r from-university-blue to-primary hover:from-primary-hover hover:to-university-blue transition-all duration-300"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Submit Activity
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="hover:shadow-card transition-all duration-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{activity.title}</CardTitle>
                            <CardDescription className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatDistanceToNow(new Date(activity.submitted_at), { addSuffix: true })}
                              </span>
                              {activity.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  Location captured
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-1">Activity Description</h4>
                            <p className="text-sm text-foreground">{activity.content}</p>
                          </div>
                          
                          {activity.generated_content && (
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">AI Enhanced Description</h4>
                              <p className="text-sm text-foreground bg-university-light-blue/10 p-3 rounded-md">
                                {activity.generated_content}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            {selectedChannel ? (
              <ChannelChat 
                channel={selectedChannel} 
                onBack={() => setSelectedChannel(null)}
              />
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Available Channels
                    </CardTitle>
                    <CardDescription>
                      Join conversations with your team
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {channels
                        .filter(channel => 
                          channel.intern_ids && channel.intern_ids.includes(profile.id)
                        )
                        .map((channel) => (
                          <Card 
                            key={channel.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedChannel(channel)}
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
                    
                    {channels.filter(channel => 
                      channel.intern_ids && channel.intern_ids.includes(profile.id)
                    ).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          You haven't been added to any channels yet. 
                          Contact your supervisor to be added to relevant channels.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <PrintableWeeklyReport />
          </TabsContent>
        </Tabs>

        {/* Activity Form Modal */}
        {showActivityForm && (
          <ActivityForm 
            onClose={() => setShowActivityForm(false)}
            onSuccess={() => {
              setShowActivityForm(false);
              fetchActivities();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default InternDashboard;