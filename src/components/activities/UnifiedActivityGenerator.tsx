import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Crown, Zap, Brain, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  icon: React.ReactNode;
  isPremium: boolean;
  capabilities: string[];
  color: string;
}

const AI_MODELS: AIModel[] = [
  {
    id: 'claude-premium',
    name: 'Claude AI (Premium)',
    description: 'Advanced AI for comprehensive, professional activity reports',
    provider: 'Anthropic',
    icon: <Crown className="h-4 w-4" />,
    isPremium: true,
    capabilities: ['Professional Writing', 'Detailed Analysis', 'Best Quality'],
    color: 'bg-gradient-to-r from-purple-500 to-pink-500'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Google\'s fast and efficient multimodal AI model',
    provider: 'Google',
    icon: <Zap className="h-4 w-4" />,
    isPremium: false,
    capabilities: ['Fast Responses', 'Text Generation', 'Multimodal'],
    color: 'bg-blue-500'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Google\'s most capable model for complex tasks',
    provider: 'Google',
    icon: <Brain className="h-4 w-4" />,
    isPremium: false,
    capabilities: ['Advanced Reasoning', 'Long Context', 'Complex Analysis'],
    color: 'bg-green-500'
  }
];

interface UnifiedActivityGeneratorProps {
  onGenerated: (content: string) => void;
}

export const UnifiedActivityGenerator = ({ onGenerated }: UnifiedActivityGeneratorProps) => {
  const [description, setDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'description' | 'model' | 'generate'>('description');
  const { toast } = useToast();

  const handleDescriptionSubmit = () => {
    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a brief description of your activity",
        variant: "destructive"
      });
      return;
    }
    setStep('model');
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setStep('generate');
  };

  const generateActivity = async () => {
    setLoading(true);
    try {
      const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);
      
      if (selectedModelInfo?.isPremium) {
        // Use Claude Premium
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
            description: "Your detailed activity report has been generated with Claude AI!"
          });
        }
      } else {
        // Use Gemini Models
        const { data, error } = await supabase.functions.invoke('gemini-ai', {
          body: {
            model: selectedModel,
            prompt: `Generate a comprehensive, well-structured activity report based on this brief description: "${description}"

Please format the report with the following sections:

**ACTIVITY TITLE**
[Create a clear, professional title for this activity]

**DETAILED ACTIVITY DESCRIPTION**
[Provide a comprehensive description of the activities performed, including specific tasks, processes, and methods used. Be detailed and professional.]

**OBJECTIVES AND GOALS**
[List the main objectives that were aimed to be achieved through this activity]

**CHALLENGES FACED**
[Describe specific challenges, obstacles, or difficulties encountered during the activity. Include both technical and non-technical challenges.]

**LESSONS LEARNED**
[Detail the key insights, knowledge, and skills gained from this experience. Include both professional and personal development aspects.]

**OUTCOMES AND ACHIEVEMENTS**
[Describe the results achieved, deliverables completed, and contributions made]

**FUTURE APPLICATIONS**
[Explain how the knowledge and experience gained can be applied in future work or studies]

**REFLECTION**
[Provide personal reflection on the overall experience and its value to professional development]

Context: This is for a university intern reporting on their work activities. Make it comprehensive, professional, and demonstrate meaningful engagement with the work.`,
            context: 'structured_activity_report'
          }
        });

        if (error) throw error;
        if (data?.error) {
          throw new Error(data.details || data.error);
        }
        if (data?.response) {
          onGenerated(data.response);
          toast({
            title: "Activity Generated",
            description: `Successfully generated content using ${selectedModelInfo?.name}`
          });
        }
      }

      // Reset workflow
      setDescription('');
      setSelectedModel('');
      setStep('description');
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

  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Activity Assistant
        </CardTitle>
        <CardDescription>
          Describe your activity briefly, then choose an AI model to create a detailed report
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description" disabled={step === 'generate'}>
              1. Description
            </TabsTrigger>
            <TabsTrigger value="model" disabled={step === 'description'}>
              2. Choose AI
            </TabsTrigger>
            <TabsTrigger value="generate" disabled={step !== 'generate'}>
              3. Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="space-y-4">
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
              onClick={handleDescriptionSubmit}
              disabled={!description.trim()}
              className="w-full"
            >
              Continue to AI Selection
            </Button>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            <div className="space-y-2">
              <Label>Choose Your AI Model</Label>
              <div className="grid gap-3">
                {AI_MODELS.map((model) => (
                  <div
                    key={model.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedModel === model.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onClick={() => handleModelSelect(model.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${model.color} flex items-center justify-center text-white`}>
                          {model.icon}
                        </div>
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            {model.name}
                            {model.isPremium && (
                              <Badge variant="secondary" className="text-xs">
                                Premium
                              </Badge>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">{model.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {model.capabilities.map((capability) => (
                              <Badge key={capability} variant="outline" className="text-xs">
                                {capability}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                onClick={() => setStep('description')}
                variant="outline"
                className="w-full"
              >
                Back to Description
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            {selectedModelInfo && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full ${selectedModelInfo.color} flex items-center justify-center text-white`}>
                    {selectedModelInfo.icon}
                  </div>
                  <div>
                    <h4 className="font-medium">{selectedModelInfo.name}</h4>
                    <p className="text-sm text-muted-foreground">Ready to enhance your activity description</p>
                  </div>
                </div>
                <div className="text-sm bg-background rounded p-3 border">
                  <strong>Your description:</strong> "{description}"
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setStep('model')}
                variant="outline"
                className="flex-1"
              >
                Change AI Model
              </Button>
              <Button 
                onClick={generateActivity}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};