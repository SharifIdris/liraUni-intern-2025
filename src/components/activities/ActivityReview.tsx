import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Loader2,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityReviewProps {
  activity: {
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
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    role: string;
  };
}

const ActivityReview = ({ activity, onClose, onSuccess }: ActivityReviewProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [activity.id]);

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, activity_id, updated_at')
        .eq('activity_id', activity.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        // Fetch user profiles for comments
        const userIds = commentsData.map(comment => comment.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', userIds);

        // Merge the data
        const enrichedComments = commentsData.map(comment => {
          const profile = profilesData?.find(p => p.id === comment.user_id);
          return {
            ...comment,
            profiles: profile || { full_name: 'Unknown User', role: 'unknown' }
          };
        });

        setComments(enrichedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected') => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('activities')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast({
        title: `Activity ${newStatus}!`,
        description: `The activity has been ${newStatus} successfully.`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Update failed",
        description: "Unable to update activity status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          activity_id: activity.id,
          user_id: user?.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments();

      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Comment failed",
        description: "Unable to add comment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'bg-success/10 text-success border-success/20',
      rejected: 'bg-destructive/10 text-destructive border-destructive/20',
      pending: 'bg-warning/10 text-warning border-warning/20'
    };

    const icons = {
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      pending: <MessageSquare className="w-4 h-4" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const locationData = activity.location ? JSON.parse(activity.location) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-xl">{activity.title}</CardTitle>
                {getStatusBadge(activity.status)}
              </div>
              <CardDescription>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {activity.profiles.full_name} ({activity.profiles.student_id})
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDistanceToNow(new Date(activity.submitted_at), { addSuffix: true })}
                  </span>
                  {locationData && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Location captured
                    </span>
                  )}
                </div>
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Activity Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Activity Description</Label>
              <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-wrap">{activity.content}</p>
              </div>
            </div>

            {activity.generated_content && (
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-university-blue" />
                  AI Enhanced Description
                </Label>
                <div className="mt-2 p-4 bg-university-light-blue/10 rounded-lg border">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{activity.generated_content}</p>
                </div>
              </div>
            )}

            {locationData && (
              <div>
                <Label className="text-base font-semibold">Location</Label>
                <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-success" />
                    <span className="text-sm font-medium">Location Captured</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{locationData.address}</p>
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {locationData.lat}, {locationData.lng}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {activity.status === 'pending' && (
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handleStatusUpdate('rejected')}
                variant="outline"
                disabled={loading}
                className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleStatusUpdate('approved')}
                disabled={loading}
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-4 border-t pt-6">
            <Label className="text-base font-semibold">Comments & Feedback</Label>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="space-y-3">
              <Textarea
                placeholder="Add your feedback or comments..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                type="submit"
                disabled={loading || !newComment.trim()}
                size="sm"
                className="bg-gradient-to-r from-university-blue to-primary hover:from-primary-hover hover:to-university-blue transition-all duration-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Comment
                  </>
                )}
              </Button>
            </form>

            {/* Comments List */}
            <div className="space-y-3">
              {loadingComments ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to add feedback!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {comment.profiles.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityReview;