import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Brain, Zap, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  icon: React.ReactNode;
  capabilities: string[];
  color: string;
}

const AI_MODELS: AIModel[] = [
  {
    id: 'microsoft/DialoGPT-medium',
    name: 'DialoGPT Medium',
    description: 'Conversational AI for creative writing and brainstorming',
    provider: 'Hugging Face',
    icon: <Brain className="h-4 w-4" />,
    capabilities: ['Creative Writing', 'Brainstorming', 'Dialogue'],
    color: 'bg-blue-500'
  },
  {
    id: 'google/flan-t5-base',
    name: 'FLAN-T5 Base',
    description: 'Instruction-following model for task completion',
    provider: 'Hugging Face',
    icon: <Target className="h-4 w-4" />,
    capabilities: ['Instructions', 'Summarization', 'Q&A'],
    color: 'bg-green-500'
  },
  {
    id: 'facebook/blenderbot-400M-distill',
    name: 'BlenderBot 400M',
    description: 'Conversational AI for interactive discussions',
    provider: 'Hugging Face',
    icon: <Sparkles className="h-4 w-4" />,
    capabilities: ['Conversation', 'Knowledge', 'Personality'],
    color: 'bg-purple-500'
  },
  {
    id: 'distilbert-base-uncased-distilled-squad',
    name: 'DistilBERT QA',
    description: 'Question answering and information extraction',
    provider: 'Hugging Face',
    icon: <Zap className="h-4 w-4" />,
    capabilities: ['Question Answering', 'Information Extraction'],
    color: 'bg-orange-500'
  }
];

interface AIModelSelectorProps {
  onGenerated: (content: string) => void;
  context?: string;
}

export const AIModelSelector = ({ onGenerated, context = 'general' }: AIModelSelectorProps) => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!selectedModel || !prompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an AI model and provide a prompt",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('free-ai-models', {
        body: {
          model: selectedModel,
          prompt: prompt,
          context: context
        }
      });

      if (error) throw error;

      if (data?.response) {
        onGenerated(data.response);
        toast({
          title: "Content Generated",
          description: `Successfully generated content using ${AI_MODELS.find(m => m.id === selectedModel)?.name}`
        });
        setPrompt('');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
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
          Free AI Models
        </CardTitle>
        <CardDescription>
          Choose from various free AI models to enhance your work and boost productivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select AI Model</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an AI model..." />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    {model.icon}
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">{model.provider}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedModelInfo && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${selectedModelInfo.color}`} />
              <span className="font-medium">{selectedModelInfo.name}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{selectedModelInfo.description}</p>
            <div className="flex flex-wrap gap-1">
              {selectedModelInfo.capabilities.map((capability) => (
                <Badge key={capability} variant="secondary" className="text-xs">
                  {capability}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="prompt">Your Prompt</Label>
          <Textarea
            id="prompt"
            placeholder="Describe what you want the AI to help you with..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={loading || !selectedModel || !prompt.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};