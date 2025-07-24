-- Create helper function to get user notifications (temporary until types are updated)
CREATE OR REPLACE FUNCTION public.get_user_notifications(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.read,
    n.created_at,
    n.user_id
  FROM public.notifications n
  WHERE n.user_id = p_user_id
  ORDER BY n.created_at DESC
  LIMIT 50;
END;
$$;

-- Fix search paths for all notification functions
ALTER FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, UUID) SET search_path = public;
ALTER FUNCTION public.notify_activity_events() SET search_path = public;
ALTER FUNCTION public.notify_channel_events() SET search_path = public;
ALTER FUNCTION public.notify_message_events() SET search_path = public;