import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { X, MapPin, Loader2, Sparkles } from 'lucide-react';

interface ActivityFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ActivityForm = ({ onClose, onSuccess }: ActivityFormProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use a reverse geocoding service to get address (simplified for demo)
          const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          setLocation({
            lat: latitude,
            lng: longitude,
            address: address
          });
          
          toast({
            title: "Location captured!",
            description: "Your current location has been recorded.",
          });
        } catch (error) {
          console.error('Error getting address:', error);
          setLocation({
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: "Location access denied",
          description: "Please allow location access to capture your current location.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const generateAIContent = async () => {
    if (!content.trim()) {
      toast({
        title: "No content to enhance",
        description: "Please enter your activity description first.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingAI(true);
    
    try {
      // Simulate AI generation for now (replace with actual OpenAI API call later)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const enhanced = `Enhanced Description: ${content}\n\nThis internship activity demonstrates practical application of skills and professional development. The intern showed initiative and engagement in their assigned tasks, contributing meaningfully to the organization's objectives while gaining valuable hands-on experience.`;
      
      setGeneratedContent(enhanced);
      
      toast({
        title: "AI enhancement complete!",
        description: "Your activity description has been enhanced.",
      });
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast({
        title: "AI generation failed",
        description: "Unable to enhance content at this time.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          content: content.trim(),
          generated_content: generatedContent || null,
          location: location ? JSON.stringify(location) : null,
        });

      if (error) throw error;

      toast({
        title: "Activity submitted!",
        description: "Your activity has been submitted for review.",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error submitting activity:', error);
      toast({
        title: "Submission failed",
        description: "Unable to submit activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submit New Activity</CardTitle>
              <CardDescription>
                Record your internship activity and get AI-powered enhancements
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Activity Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Client Meeting and Project Planning"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Activity Description *</Label>
              <Textarea
                id="content"
                placeholder="Describe what you did during this activity..."
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {/* AI Enhancement Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>AI Enhancement</Label>
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateAIContent}
                  disabled={generatingAI || !content.trim()}
                >
                  {generatingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Enhance with AI
                    </>
                  )}
                </Button>
              </div>
              
              {generatedContent && (
                <div className="bg-university-light-blue/10 p-4 rounded-lg border">
                  <Label className="text-sm font-medium text-muted-foreground">AI Enhanced Description</Label>
                  <p className="text-sm text-foreground mt-2">{generatedContent}</p>
                </div>
              )}
            </div>

            {/* Location Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Location</Label>
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={captureLocation}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Capture Location
                </Button>
              </div>
              
              {location && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-success" />
                    <span className="text-sm font-medium">Location Captured</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-university-blue to-primary hover:from-primary-hover hover:to-university-blue transition-all duration-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Activity'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityForm;