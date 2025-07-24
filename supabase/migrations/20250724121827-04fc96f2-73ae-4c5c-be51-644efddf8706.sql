-- Fix the notification function to properly handle activity status
CREATE OR REPLACE FUNCTION public.notify_activity_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  activity_user_name TEXT;
  reviewer_name TEXT;
  status_text TEXT;
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
    
    -- Convert enum to text and capitalize properly
    status_text := CASE 
      WHEN NEW.status = 'approved' THEN 'Approved'
      WHEN NEW.status = 'rejected' THEN 'Rejected'
      ELSE NEW.status::text
    END;
    
    -- Notify intern when their activity is reviewed
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.user_id,
      'activity_reviewed',
      'Activity ' || status_text,
      'Your activity "' || NEW.title || '" has been ' || LOWER(status_text) || 
      CASE WHEN reviewer_name IS NOT NULL THEN ' by ' || reviewer_name ELSE '' END,
      NEW.id
    );
    
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;