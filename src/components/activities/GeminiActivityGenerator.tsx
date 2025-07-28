import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeminiActivityGeneratorProps {
  onGenerated: (content: string) => void;
}

export const GeminiActivityGenerator = ({ onGenerated }: GeminiActivityGeneratorProps) => {
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
      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: {
          model: 'gemini-1.5-flash',
          prompt: `Generate a comprehensive, detailed activity report based on this brief description: "${description}"

Please structure the report with the following sections:

**ACTIVITY TITLE**
[Create a clear, professional title]

**DETAILED WORK PERFORMED**
[Provide a comprehensive description of the specific tasks, processes, and methods used. Include technical details and step-by-step activities performed. Be thorough and professional.]

**OBJECTIVES AND GOALS**
[List the main objectives and goals that were aimed to be achieved]

**POSSIBLE CHALLENGES FACED**
[Describe potential and actual challenges, obstacles, or difficulties that could be encountered. Include technical challenges, resource constraints, time management issues, learning curve difficulties, and communication barriers.]

**LESSONS LEARNED**
[Detail the key insights, knowledge, and skills gained from this experience. Include both technical skills, soft skills, problem-solving approaches, best practices discovered, and personal growth aspects.]

**OUTCOMES AND ACHIEVEMENTS**
[Describe the results achieved, deliverables completed, and contributions made]

**FUTURE APPLICATIONS**
[Explain how the knowledge and experience gained can be applied in future work or studies]

**PERSONAL REFLECTION**
[Provide thoughtful reflection on the overall experience and its value to professional development]

Make this comprehensive and professional for a university intern's activity report. Focus on demonstrating meaningful engagement, learning, and growth.`,
          context: 'intern_activity_report'
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Failed to generate activity: ${error.message}`);
      }

      if (data?.error) {
        console.error('Gemini API error:', data);
        if (data.details?.includes('overloaded')) {
          throw new Error('AI service is currently busy. Please try again in a few moments.');
        }
        throw new Error(data.details || data.error);
      }

      if (data?.response) {
        onGenerated(data.response);
        toast({
          title: "Activity Generated Successfully",
          description: "Your detailed activity report has been generated!"
        });
        setDescription('');
      } else {
        throw new Error('No response received from AI service');
      }
    } catch (error) {
      console.error('Error generating activity:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Generation Failed",
        description: errorMessage,
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
          <Sparkles className="h-5 w-5" />
          AI Activity Generator
        </CardTitle>
        <CardDescription>
          Describe your activity briefly and generate a detailed report with work details, challenges, and lessons learned
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Brief Activity Description</Label>
          <Textarea
            id="description"
            placeholder="e.g., Attended orientation session, worked on database optimization, conducted user research..."
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
              Generating Activity Report...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Detailed Report
            </>
          )}
        </Button>

        {loading && (
          <div className="text-sm text-muted-foreground text-center">
            <RefreshCw className="h-4 w-4 animate-spin inline mr-1" />
            This may take a moment while AI generates your comprehensive report...
          </div>
        )}
      </CardContent>
    </Card>
  );
};