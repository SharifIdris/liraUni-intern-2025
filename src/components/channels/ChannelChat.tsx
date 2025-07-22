import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  File,
  Users,
  ArrowLeft 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Channel {
  id: string;
  name: string;
  description: string;
  intern_ids: string[];
}

interface ChannelChatProps {
  channel: Channel;
  onBack: () => void;
}

export function ChannelChat({ channel, onBack }: ChannelChatProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
  }, [channel.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
    }
  };

  const subscribeToMessages = () => {
    const channel_subscription = supabase
      .channel(`messages:${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel_subscription);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    const { error } = await supabase
      .from('messages')
      .insert({
        channel_id: channel.id,
        user_id: profile?.id,
        content: newMessage.trim(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage('');
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id}/${channel.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('channel-media')
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('channel-media')
      .getPublicUrl(fileName);

    // Send message with media
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        channel_id: channel.id,
        user_id: profile?.id,
        content: file.name,
        media_url: publicUrl,
        media_type: file.type,
      });

    if (messageError) {
      toast({
        title: "Error",
        description: "Failed to send media message",
        variant: "destructive",
      });
    }

    setUploading(false);
    event.target.value = '';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.user_id === profile?.id;
    
    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.profiles?.avatar_url} />
          <AvatarFallback className="text-xs">
            {message.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {isOwnMessage ? 'You' : message.profiles?.full_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <div
            className={`rounded-lg p-3 max-w-full break-words ${
              isOwnMessage
                ? 'bg-primary text-primary-foreground ml-auto'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {message.media_url ? (
              <div className="space-y-2">
                {message.media_type?.startsWith('image/') ? (
                  <img
                    src={message.media_url}
                    alt={message.content}
                    className="max-w-full h-auto rounded"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                    <File className="h-4 w-4" />
                    <span className="text-sm">{message.content}</span>
                  </div>
                )}
                {message.content !== message.media_url && (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            ) : (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-[calc(100vh-12rem)] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <CardTitle className="text-lg">{channel.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">
                {channel.intern_ids?.length || 0} members
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={loading || uploading}
              className="flex-1"
            />
            
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || loading || uploading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {uploading && (
            <p className="text-xs text-muted-foreground mt-2">
              Uploading file...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}