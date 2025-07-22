import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  LogOut,
  Eye,
  MessageSquare
} from 'lucide-react';
import ActivityReview from '@/components/activities/ActivityReview';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  title: string;
  content: string;
  generated_content: string | null;
  location: any;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  profiles: {
    full_name: string;
    student_id: string;
  };
}

const StaffDashboard = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select('id, user_id, title, content, generated_content, location, status, submitted_at, reviewed_at, reviewed_by, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (activitiesData && activitiesData.length > 0) {
        // Fetch user profiles for activities
        const userIds = activitiesData.map(activity => activity.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, student_id')
          .in('id', userIds);

        // Merge the data
        const enrichedActivities = activitiesData.map(activity => {
          const profile = profilesData?.find(p => p.id === activity.user_id);
          return {
            ...activity,
            profiles: profile || { full_name: 'Unknown User', student_id: 'N/A' }
          };
        });

        setActivities(enrichedActivities);
      } else {
        setActivities([]);
      }
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

  const pendingActivities = activities.filter(a => a.status === 'pending');
  const reviewedActivities = activities.filter(a => a.status !== 'pending');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
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
              <h1 className="text-2xl font-bold text-foreground">Staff Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-warning">{pendingActivities.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-warning" />
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
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-destructive">
                    {activities.filter(a => a.status === 'rejected').length}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pending Review ({pendingActivities.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Reviewed ({reviewedActivities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Activities Pending Review</h2>
              
              {pendingActivities.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
                    <p className="text-muted-foreground">
                      No activities are currently pending review.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pendingActivities.map((activity) => (
                    <Card key={activity.id} className="hover:shadow-card transition-all duration-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{activity.title}</CardTitle>
                            <CardDescription className="mt-2">
                              <div className="flex items-center gap-4">
                                <span className="font-medium">
                                  {activity.profiles.full_name} ({activity.profiles.student_id})
                                </span>
                                <span>
                                  {formatDistanceToNow(new Date(activity.submitted_at), { addSuffix: true })}
                                </span>
                              </div>
                            </CardDescription>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <p className="text-sm text-foreground line-clamp-3">{activity.content}</p>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedActivity(activity)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviewed">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Reviewed Activities</h2>
              
              {reviewedActivities.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No reviewed activities</h3>
                    <p className="text-muted-foreground">
                      Activities you review will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {reviewedActivities.map((activity) => (
                    <Card key={activity.id} className="hover:shadow-card transition-all duration-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{activity.title}</CardTitle>
                            <CardDescription className="mt-2">
                              <div className="flex items-center gap-4">
                                <span className="font-medium">
                                  {activity.profiles.full_name} ({activity.profiles.student_id})
                                </span>
                                <span>
                                  Reviewed {formatDistanceToNow(new Date(activity.reviewed_at!), { addSuffix: true })}
                                </span>
                              </div>
                            </CardDescription>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <p className="text-sm text-foreground line-clamp-3">{activity.content}</p>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedActivity(activity)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Activity Review Modal */}
      {selectedActivity && (
        <ActivityReview 
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onSuccess={() => {
            setSelectedActivity(null);
            fetchActivities();
          }}
        />
      )}
    </div>
  );
};

export default StaffDashboard;