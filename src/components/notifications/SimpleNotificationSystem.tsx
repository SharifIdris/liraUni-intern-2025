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
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      const notifications = data || [];
      setNotifications(notifications);
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const subscribeToNotifications = () => {
    if (!profile?.id) return;

    // Subscribe to notifications table for real-time updates
    const notificationsChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as SimpleNotification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as SimpleNotification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            // Update unread count
            setNotifications(current => {
              setUnreadCount(current.filter(n => !n.read).length);
              return current;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
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


  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {notifications.filter(n => !n.read).length > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
          >
            {notifications.filter(n => !n.read).length}
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
              {notifications.filter(n => !n.read).length} unread notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b hover:bg-muted/50 cursor-pointer ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
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