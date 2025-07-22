import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  activity_id: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
    role: string;
  } | null;
}

interface CommentSectionProps {
  activityId: string;
  isReadOnly?: boolean;
}

export function CommentSection({ activityId, isReadOnly = false }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [activityId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (commentsData) {
        // Fetch profile data separately for each comment
        const commentsWithProfiles = await Promise.all(
          commentsData.map(async (comment) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, role')
              .eq('id', comment.user_id)
              .single();
            
            return {
              ...comment,
              profiles: profileData
            };
          })
        );
        setComments(commentsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !profile) return;

    setSubmitting(true);
    try {
      const { data: newCommentData, error } = await supabase
        .from('comments')
        .insert({
          content: newComment,
          activity_id: activityId,
          user_id: profile.id,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to submit comment",
          variant: "destructive",
        });
      } else {
        // Fetch profile data for the new comment
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('id', profile.id)
          .single();

        setComments(prev => [...prev, {
          ...newCommentData,
          profiles: profileData
        }]);
        setNewComment('');
        toast({
          title: "Success",
          description: "Comment added successfully",
        });
      }
    } catch (error) {
      console.error('Comment submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        {loading ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={comment.profiles?.avatar_url} 
                    alt={comment.profiles?.full_name || 'User'} 
                  />
                  <AvatarFallback>
                    {comment.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {comment.profiles?.full_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment Form */}
        {!isReadOnly && (
          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[60px]"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button 
                onClick={submitComment}
                disabled={!newComment.trim() || submitting}
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                {submitting ? 'Submitting...' : 'Comment'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}