import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
    role: string;
  };
}

interface CommentSectionProps {
  activityId: string;
  isReadOnly?: boolean;
}

export function CommentSection({ activityId, isReadOnly = false }: CommentSectionProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    subscribeToComments();
  }, [activityId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles!inner(*)')
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
      setComments(data || []);
    }
    setLoading(false);
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments:${activityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `activity_id=eq.${activityId}`,
        },
        async (payload) => {
          // Fetch the complete comment with profile data
          const { data } = await supabase
            .from('comments')
            .select(`
              *,
              profiles (
                full_name,
                avatar_url,
                role
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setComments(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const submitComment = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('comments')
      .insert({
        activity_id: activityId,
        user_id: profile?.id,
        content: newComment.trim(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit comment",
        variant: "destructive",
      });
    } else {
      setNewComment('');
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    }
    setSubmitting(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      submitComment();
    }
  };

  const canComment = profile?.role === 'staff' || profile?.role === 'admin';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center text-muted-foreground py-4">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No comments yet. Be the first to leave feedback!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {comment.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.profiles?.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {comment.profiles?.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm bg-muted rounded-lg p-3">
                    {comment.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        {!isReadOnly && canComment && (
          <div className="border-t pt-4">
            <div className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Leave feedback for this activity... (Ctrl+Enter to submit)"
                className="min-h-[80px]"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Use Ctrl+Enter to submit quickly
                </p>
                <Button
                  onClick={submitComment}
                  disabled={!newComment.trim() || submitting}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isReadOnly && !canComment && (
          <div className="text-center text-muted-foreground text-sm py-2 bg-muted/50 rounded-lg">
            Only staff members can leave comments
          </div>
        )}
      </CardContent>
    </Card>
  );
}