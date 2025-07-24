import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UnifiedActivityGenerator } from './UnifiedActivityGenerator';

const ActivityFormEnhanced = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const { error } = await supabase
      .from('activities')
      .insert({
        title: formData.title,
        content: formData.content,
        user_id: profile?.id,
        activity_date: format(selectedDate, 'yyyy-MM-dd'),
        location: formData.location ? { name: formData.location } : null,
        submitted_at: new Date().toISOString(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit activity",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Activity submitted successfully",
      });
      setFormData({ title: '', content: '', location: '' });
      setSelectedDate(new Date());
    }
    
    setLoading(false);
  };

  const setContent = (content: string) => {
    setFormData(prev => ({ ...prev, content }));
  };

  return (
    <div className="space-y-6">
      <UnifiedActivityGenerator onGenerated={setContent} />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Submit New Activity
          </CardTitle>
          <CardDescription>
            Record your daily internship activities with details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Activity Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief description of your activity"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Activity Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Where did this activity take place?"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Activity Details *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Describe what you did, what you learned, challenges faced, and outcomes achieved..."
                className="min-h-[120px]"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Submitting...' : 'Submit Activity'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityFormEnhanced;