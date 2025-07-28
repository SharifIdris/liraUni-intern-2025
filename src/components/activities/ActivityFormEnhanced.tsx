import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Plus, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ActivityFormEnhanced = () => {
  console.log('ActivityFormEnhanced component loaded successfully');
  
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [step, setStep] = useState<'input' | 'generated'>('input');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    detailedWork: '',
    challenges: '',
    lessonsLearnt: '',
  });

  const generateContent = async () => {
    console.log('Generate content called with:', { title: formData.title, description: formData.description });
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in title and description first",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: {
          model: 'gemini-1.5-flash',
          prompt: `Based on this activity: "${formData.title}" with description: "${formData.description}"

Generate comprehensive content in this format:

**DETAILED WORK PERFORMED:**
[Provide comprehensive description of specific tasks, processes, and methods used]

**CHALLENGES FACED:**
[Describe potential and actual challenges, obstacles, or difficulties encountered]

**LESSONS LEARNT:**
[Detail key insights, knowledge, and skills gained from this experience]

Keep each section detailed and professional for an intern's activity report.`,
          context: 'intern_activity_detailed'
        }
      });

      if (error) throw new Error(`Failed to generate content: ${error.message}`);
      if (data?.error) {
        if (data.details?.includes('overloaded')) {
          throw new Error('AI service is currently busy. Please try again in a few moments.');
        }
        throw new Error(data.details || data.error);
      }

      if (data?.response) {
        const response = data.response;
        console.log('AI response received:', response);
        
        // Parse the structured response
        const detailedWork = response.match(/\*\*DETAILED WORK PERFORMED:\*\*(.*?)(?=\*\*|$)/s)?.[1]?.trim() || '';
        const challenges = response.match(/\*\*CHALLENGES FACED:\*\*(.*?)(?=\*\*|$)/s)?.[1]?.trim() || '';
        const lessonsLearnt = response.match(/\*\*LESSONS LEARNT:\*\*(.*?)(?=\*\*|$)/s)?.[1]?.trim() || '';

        setFormData(prev => ({
          ...prev,
          detailedWork,
          challenges,
          lessonsLearnt
        }));
        
        setStep('generated');
        toast({
          title: "Content Generated Successfully",
          description: "Your detailed activity content has been generated!"
        });
      } else {
        throw new Error('No response received from AI service');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit called with step:', step);
    
    if (!formData.detailedWork.trim() || !formData.challenges.trim() || !formData.lessonsLearnt.trim()) {
      toast({
        title: "Error",
        description: "Please generate and complete all content sections",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get geolocation
      const position = await getCurrentLocation();
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString()
      };

      const content = `**DETAILED WORK PERFORMED:**
${formData.detailedWork}

**CHALLENGES FACED:**
${formData.challenges}

**LESSONS LEARNT:**
${formData.lessonsLearnt}`;

      const { error } = await supabase
        .from('activities')
        .insert({
          title: formData.title,
          content,
          user_id: profile?.id,
          activity_date: format(selectedDate, 'yyyy-MM-dd'),
          location,
          submitted_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity submitted successfully with location captured",
      });
      
      // Reset form
      setFormData({ title: '', description: '', detailedWork: '', challenges: '', lessonsLearnt: '' });
      setSelectedDate(new Date());
      setStep('input');
      
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit activity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Submit New Activity
        </CardTitle>
        <CardDescription>
          Follow the steps: Enter details → Generate content → Submit with location
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={step === 'input' ? (e) => { e.preventDefault(); generateContent(); } : handleSubmit} className="space-y-4">
          
          {/* Step 1: Basic Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Activity Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of your activity"
                disabled={step === 'generated'}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Activity Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={step === 'generated'}
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
            <Label htmlFor="description">Activity Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what you did..."
              disabled={step === 'generated'}
              rows={3}
              required
            />
          </div>

          {/* Generate Button */}
          {step === 'input' && (
            <Button 
              type="submit" 
              disabled={generating} 
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Detailed Content
                </>
              )}
            </Button>
          )}

          {/* Step 2: Generated Content Fields */}
          {step === 'generated' && (
            <>
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Generated Content (Editable)</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setStep('input')}
                  >
                    Edit Basic Info
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detailedWork">Detailed Work Performed *</Label>
                  <Textarea
                    id="detailedWork"
                    value={formData.detailedWork}
                    onChange={(e) => setFormData(prev => ({ ...prev, detailedWork: e.target.value }))}
                    placeholder="Detailed description of work performed..."
                    className="min-h-[120px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="challenges">Challenges Faced *</Label>
                  <Textarea
                    id="challenges"
                    value={formData.challenges}
                    onChange={(e) => setFormData(prev => ({ ...prev, challenges: e.target.value }))}
                    placeholder="Challenges and obstacles encountered..."
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lessonsLearnt">Lessons Learnt *</Label>
                  <Textarea
                    id="lessonsLearnt"
                    value={formData.lessonsLearnt}
                    onChange={(e) => setFormData(prev => ({ ...prev, lessonsLearnt: e.target.value }))}
                    placeholder="Key insights and learning outcomes..."
                    className="min-h-[100px]"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting with Location...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Submit Activity (Auto-capture Location)
                  </>
                )}
              </Button>
            </>
          )}

          {generating && (
            <div className="text-sm text-muted-foreground text-center p-4">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              AI is generating detailed content, challenges, and lessons learned...
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default ActivityFormEnhanced;