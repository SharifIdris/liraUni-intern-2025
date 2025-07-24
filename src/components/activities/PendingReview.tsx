import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle, XCircle, MessageSquare, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CommentSection } from '@/components/comments/CommentSection';

interface Activity {
  id: string;
  title: string;
  content: string;
  activity_date: string;
  location: any;
  status: string;
  submitted_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    student_id?: string;
  } | null;
}

export const PendingReview = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPendingActivities();
  }, []);

  const fetchPendingActivities = async () => {
    try {
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (activitiesData) {
        // Fetch profile data separately for each activity
        const activitiesWithProfiles = await Promise.all(
          activitiesData.map(async (activity) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, student_id')
              .eq('id', activity.user_id)
              .single();
            
            return {
              ...activity,
              profiles: profileData
            };
          })
        );
        setActivities(activitiesWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching pending activities:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending activities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (activityId: string, status: 'approved' | 'rejected') => {
    try {
      setReviewingId(activityId);
      
      const { error } = await supabase
        .from('activities')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id
        })
        .eq('id', activityId);

      if (error) throw error;

      // Add feedback comment if provided
      const activityFeedback = feedback[activityId] || '';
      if (activityFeedback.trim()) {
        await supabase
          .from('comments')
          .insert({
            activity_id: activityId,
            user_id: profile?.id,
            content: activityFeedback
          });
      }

      toast({
        title: "Review Submitted",
        description: `Activity ${status} successfully`,
      });

      // Refresh the list
      fetchPendingActivities();
      setFeedback(prev => ({ ...prev, [activityId]: '' }));
    } catch (error) {
      console.error('Error reviewing activity:', error);
      toast({
        title: "Error",
        description: "Failed to review activity",
        variant: "destructive"
      });
    } finally {
      setReviewingId(null);
    }
  };

  if (!profile || !['staff', 'admin'].includes(profile.role)) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Access denied. Only staff and administrators can review activities.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center">Loading pending activities...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Reviews ({activities.length})
          </CardTitle>
          <CardDescription>
            Review and approve intern activity submissions
          </CardDescription>
        </CardHeader>
      </Card>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No pending activities to review
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{activity.title}</CardTitle>
                    <CardDescription>
                      Submitted by: {activity.profiles?.full_name || 'Unknown'}
                    </CardDescription>
                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
                       <span>Activity Date: {activity.activity_date ? new Date(activity.activity_date).toLocaleDateString() : 'Not specified'}</span>
                       <span>Submitted: {new Date(activity.submitted_at).toLocaleDateString()}</span>
                     </div>
                  </div>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Activity Details:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {activity.content}
                  </p>
                </div>

                 {activity.location && activity.location.name && (
                   <div className="flex items-center gap-2 text-sm">
                     <MapPin className="h-4 w-4" />
                     <span>{activity.location.name}</span>
                   </div>
                 )}

                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`feedback-${activity.id}`}>Review Feedback (Optional)</Label>
                    <Textarea
                      id={`feedback-${activity.id}`}
                      placeholder="Add feedback or comments for the intern..."
                      value={feedback[activity.id] || ''}
                      onChange={(e) => setFeedback(prev => ({ ...prev, [activity.id]: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReview(activity.id, 'approved')}
                      disabled={reviewingId === activity.id}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReview(activity.id, 'rejected')}
                      disabled={reviewingId === activity.id}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments & Discussion
                  </h4>
                  <CommentSection activityId={activity.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};