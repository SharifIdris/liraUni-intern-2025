import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Plus, Users, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Channel {
  id: string;
  name: string;
  description: string;
  created_at: string;
  intern_ids: string[];
}

interface Intern {
  id: string;
  full_name: string;
  student_id: string;
}

const ChannelManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    selectedInterns: [] as string[]
  });

  useEffect(() => {
    fetchChannels();
    fetchInterns();
  }, []);

  const fetchChannels = async () => {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setChannels(data);
  };

  const fetchInterns = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, student_id')
      .eq('role', 'intern');
    if (data) setInterns(data);
  };

  const createChannel = async () => {
    if (!newChannel.name.trim()) {
      toast({
        title: "Error",
        description: "Channel name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('channels')
      .insert({
        name: newChannel.name,
        description: newChannel.description,
        created_by: profile?.id,
        intern_ids: newChannel.selectedInterns
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Channel created successfully",
      });
      setNewChannel({ name: '', description: '', selectedInterns: [] });
      fetchChannels();
    }
    setLoading(false);
  };

  const deleteChannel = async (channelId: string) => {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });
      fetchChannels();
    }
  };

  const handleInternSelection = (internId: string, checked: boolean) => {
    setNewChannel(prev => ({
      ...prev,
      selectedInterns: checked
        ? [...prev.selectedInterns, internId]
        : prev.selectedInterns.filter(id => id !== internId)
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Channel Management
          </CardTitle>
          <CardDescription>
            Create and manage communication channels for your department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="mb-4">
                <Plus className="h-4 w-4 mr-2" />
                Create New Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Channel</DialogTitle>
                <DialogDescription>
                  Set up a new communication channel for your interns
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Channel Name</Label>
                  <Input
                    id="name"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter channel name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newChannel.description}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter channel description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select Interns</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {interns.map((intern) => (
                      <div key={intern.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={intern.id}
                          checked={newChannel.selectedInterns.includes(intern.id)}
                          onCheckedChange={(checked) => handleInternSelection(intern.id, checked as boolean)}
                        />
                        <Label htmlFor={intern.id} className="text-sm">
                          {intern.full_name} ({intern.student_id})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={createChannel} disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create Channel'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid gap-4">
            {channels.map((channel) => (
              <Card key={channel.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{channel.name}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{channel.description}</p>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <Badge variant="secondary">
                          {channel.intern_ids?.length || 0} members
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteChannel(channel.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChannelManagement;