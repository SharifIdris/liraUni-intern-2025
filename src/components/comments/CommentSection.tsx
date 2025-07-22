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
    full_name?: string;
    avatar_url?: string;
    role?: string;
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
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            full_name,
            avatar_url,
            role
          )
        `)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Comments fetch error:', error);
        toast({
          title: "Error",
          description: "Failed to load comments",
          variant: "destructive",
        });
        setComments([]);
      } else {
        // Handle the case where profiles might be null or have different structure
        const formattedComments = (data || []).map(comment => ({
          ...comment,
          profiles: comment.profiles || null
        }));
        setComments(formattedComments);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !profile) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: newComment,
          activity_id: activityId,
          user_id: profile.id,
        })
        .select(`
          *,
          profiles (
            full_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to submit comment",
          variant: "destructive",
        });
      } else {
        setComments(prev => [...prev, data]);
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