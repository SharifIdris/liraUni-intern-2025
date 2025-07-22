-- Add storage buckets for profile pictures and media sharing
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('channel-media', 'channel-media', false);

-- Storage policies for avatars (public)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for channel media (private within channels)
CREATE POLICY "Users can view channel media they have access to" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'channel-media' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM channels 
      WHERE auth.uid() = ANY(intern_ids) 
      AND id::text = (storage.foldername(name))[2]
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin')
    )
  )
);

CREATE POLICY "Users can upload channel media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'channel-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add avatar_url to profiles table
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- Create messages table for channel communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view messages in their channels" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM channels 
    WHERE id = messages.channel_id 
    AND (
      auth.uid() = ANY(intern_ids) OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('staff', 'admin')
      )
    )
  )
);

CREATE POLICY "Users can insert messages in their channels" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM channels 
    WHERE id = messages.channel_id 
    AND (
      auth.uid() = ANY(intern_ids) OR
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('staff', 'admin')
      )
    )
  )
);

-- Add date field to activities table for custom date entry
ALTER TABLE activities ADD COLUMN activity_date DATE DEFAULT CURRENT_DATE;

-- Create trigger for updated_at on messages
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.messages;