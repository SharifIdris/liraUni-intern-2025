import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActivityGeneratorProps {
  onGenerated: (generatedContent: string) => void;
}

export const ActivityGenerator = ({ onGenerated }: ActivityGeneratorProps) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateActivity = async () => {
    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a brief description of your activity",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: `Generate a detailed, comprehensive activity report based on this brief description: "${description}". 

          Please create a rich, detailed activity report that includes:
          - A clear, professional title
          - Detailed description of activities performed
          - Learning outcomes and skills developed
          - Challenges faced and how they were overcome
          - Key accomplishments and contributions
          - Reflection on the experience and its value
          - Future applications of the knowledge gained
          
          Context: This is for a university intern reporting on their work activities. The report should be professional, detailed, and demonstrate meaningful engagement with the work. Make it comprehensive enough to show substantial effort and learning.
          
          Format the response as a complete activity report that can be directly used for submission.`,
          context: 'activity_generation',
          userRole: 'intern'
        }
      });

      if (error) throw error;

      if (data?.response) {
        onGenerated(data.response);
        toast({
          title: "Activity Generated",
          description: "Your detailed activity report has been generated successfully!"
        });
        setDescription('');
      }
    } catch (error) {
      console.error('Error generating activity:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate activity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Activity Generator
        </CardTitle>
        <CardDescription>
          Provide a brief description and let AI generate a detailed, comprehensive activity report
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Brief Activity Description</Label>
          <Textarea
            id="description"
            placeholder="e.g., Worked on database optimization, attended team meetings, conducted user testing..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        
        <Button 
          onClick={generateActivity} 
          disabled={loading || !description.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Activity...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Detailed Activity
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};