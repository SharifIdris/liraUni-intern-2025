import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, User, MessageSquare, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface SimpleNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  user_id: string;
}

export const SimpleNotificationSystem = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [profile]);

  const fetchNotifications = async () => {
    try {
      // Using raw SQL query since TypeScript types aren't updated yet
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: profile?.id
      });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: SimpleNotification) => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const subscribeToNotifications = () => {
    // Subscribe to activities table for real-time updates
    const activitiesChannel = supabase
      .channel('activity-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
        },
        (payload) => {
          // Show toast for relevant activity updates
          if (payload.eventType === 'INSERT') {
            if (profile?.role === 'staff' || profile?.role === 'admin') {
              toast({
                title: "New Activity Submitted",
                description: "A new activity has been submitted for review",
              });
            }
          } else if (payload.eventType === 'UPDATE' && payload.new.status !== payload.old?.status) {
            if (payload.new.user_id === profile?.id) {
              toast({
                title: `Activity ${payload.new.status}`,
                description: `Your activity "${payload.new.title}" has been ${payload.new.status}`,
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to messages for real-time chat notifications
    const messagesChannel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          // Get message details
          const { data: messageData } = await supabase
            .from('messages')
            .select(`
              *,
              profiles:user_id(full_name),
              channels:channel_id(name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (messageData && messageData.user_id !== profile?.id) {
            toast({
              title: `New message in ${messageData.channels?.name}`,
              description: `${messageData.profiles?.full_name} sent a message`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(messagesChannel);
    };
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'activity_submitted':
      case 'activity_reviewed':
        return <FileText className="h-4 w-4" />;
      case 'new_message':
        return <MessageSquare className="h-4 w-4" />;
      case 'profile_updated':
        return <User className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Create some mock notifications for demonstration
  const mockNotifications: SimpleNotification[] = [
    {
      id: '1',
      type: 'activity_submitted',
      title: 'Welcome to LIRA University',
      message: 'Your account has been set up successfully. Start by submitting your first activity!',
      read: false,
      created_at: new Date().toISOString(),
      user_id: profile?.id || '',
    },
    {
      id: '2',
      type: 'new_message',
      title: 'Channel Available',
      message: 'You can now participate in team channels for better collaboration.',
      read: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      user_id: profile?.id || '',
    }
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {mockNotifications.filter(n => !n.read).length > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
          >
            {mockNotifications.filter(n => !n.read).length}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNotifications(false)}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              {mockNotifications.filter(n => !n.read).length} unread notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {mockNotifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-1">
                  {mockNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b hover:bg-muted/50 cursor-pointer ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1 rounded-full ${
                          !notification.read ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};