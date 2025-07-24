import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Share2, Lightbulb, PenTool, MessageSquare, FileText } from 'lucide-react';
import { AIModelSelector } from './AIModelSelector';
import { useToast } from '@/hooks/use-toast';

export const AIWorkspaceEnhancer = () => {
  const [generatedContent, setGeneratedContent] = useState('');
  const [activeTab, setActiveTab] = useState('writing');
  const { toast } = useToast();

  const handleCopyContent = () => {
    navigator.clipboard.writeText(generatedContent);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard"
    });
  };

  const handleDownloadContent = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-generated-content.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Content saved as text file"
    });
  };

  const enhancementTypes = [
    {
      id: 'writing',
      label: 'Creative Writing',
      icon: <PenTool className="h-4 w-4" />,
      description: 'Enhance your reports, proposals, and documentation',
      context: 'writing'
    },
    {
      id: 'brainstorming',
      label: 'Brainstorming',
      icon: <Lightbulb className="h-4 w-4" />,
      description: 'Generate ideas, solutions, and creative approaches',
      context: 'brainstorming'
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <MessageSquare className="h-4 w-4" />,
      description: 'Improve emails, presentations, and team communication',
      context: 'communication'
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: <FileText className="h-4 w-4" />,
      description: 'Analyze data, summarize information, and extract insights',
      context: 'analysis'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Workspace Enhancer
          </CardTitle>
          <CardDescription>
            Use free AI models to enhance different aspects of your internship work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              {enhancementTypes.map((type) => (
                <TabsTrigger key={type.id} value={type.id} className="text-xs">
                  <div className="flex items-center gap-1">
                    {type.icon}
                    <span className="hidden sm:inline">{type.label}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {enhancementTypes.map((type) => (
              <TabsContent key={type.id} value={type.id} className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="flex justify-center mb-2">{type.icon}</div>
                  <h3 className="font-semibold">{type.label}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
                
                <AIModelSelector 
                  onGenerated={setGeneratedContent} 
                  context={type.context}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Content</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyContent}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadContent}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="mb-2">
                Enhanced with {enhancementTypes.find(t => t.id === activeTab)?.label}
              </Badge>
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="AI-generated content will appear here..."
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};