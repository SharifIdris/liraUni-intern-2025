-- Create notifications table for real-time system updates
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read, created_at);

-- Add trigger for timestamps
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_related_id);
END;
$$;

-- Create trigger function for activity notifications
CREATE OR REPLACE FUNCTION public.notify_activity_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_user_name TEXT;
  reviewer_name TEXT;
BEGIN
  -- Get user names for notifications
  SELECT full_name INTO activity_user_name
  FROM public.profiles 
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  IF TG_OP = 'INSERT' THEN
    -- Notify staff/admin when new activity is submitted
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    SELECT 
      p.id,
      'activity_submitted',
      'New Activity Submitted',
      activity_user_name || ' submitted a new activity: ' || NEW.title,
      NEW.id
    FROM public.profiles p
    WHERE p.role IN ('staff', 'admin');
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    -- Get reviewer name
    SELECT full_name INTO reviewer_name
    FROM public.profiles 
    WHERE id = NEW.reviewed_by;
    
    -- Notify intern when their activity is reviewed
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.user_id,
      'activity_reviewed',
      'Activity ' || INITCAP(NEW.status),
      'Your activity "' || NEW.title || '" has been ' || NEW.status || 
      CASE WHEN reviewer_name IS NOT NULL THEN ' by ' || reviewer_name ELSE '' END,
      NEW.id
    );
    
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for activity notifications
CREATE TRIGGER activity_notification_trigger
AFTER INSERT OR UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.notify_activity_events();

-- Create trigger function for channel notifications
CREATE OR REPLACE FUNCTION public.notify_channel_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get creator name
    SELECT full_name INTO creator_name
    FROM public.profiles 
    WHERE id = NEW.created_by;
    
    -- Notify all users about new channel
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    SELECT 
      p.id,
      'channel_created',
      'New Channel Created',
      creator_name || ' created a new channel: ' || NEW.name,
      NEW.id
    FROM public.profiles p
    WHERE p.id != NEW.created_by; -- Don't notify the creator
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for channel notifications
CREATE TRIGGER channel_notification_trigger
AFTER INSERT ON public.channels
FOR EACH ROW
EXECUTE FUNCTION public.notify_channel_events();

-- Create trigger function for message notifications
CREATE OR REPLACE FUNCTION public.notify_message_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_name TEXT;
  channel_name TEXT;
  channel_member_ids UUID[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get sender name and channel info
    SELECT p.full_name, c.name, c.intern_ids
    INTO sender_name, channel_name, channel_member_ids
    FROM public.profiles p, public.channels c
    WHERE p.id = NEW.user_id AND c.id = NEW.channel_id;
    
    -- Notify channel members (except sender)
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    SELECT 
      p.id,
      'new_message',
      'New Message in ' || channel_name,
      sender_name || ' sent a message in ' || channel_name,
      NEW.channel_id
    FROM public.profiles p
    WHERE (p.id = ANY(channel_member_ids) OR p.role IN ('staff', 'admin'))
      AND p.id != NEW.user_id; -- Don't notify the sender
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for message notifications
CREATE TRIGGER message_notification_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_events();