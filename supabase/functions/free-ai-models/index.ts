import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HUGGING_FACE_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, prompt, context } = await req.json();
    
    if (!model || !prompt) {
      throw new Error('Model and prompt are required');
    }

    console.log(`Generating content with model: ${model}, context: ${context}`);

    // Initialize Hugging Face client
    const hf = new HfInference(HUGGING_FACE_TOKEN);

    let response: string;

    // Handle different model types and optimize prompts
    if (model.includes('flan-t5')) {
      // For instruction-following models like FLAN-T5
      const enhancedPrompt = context === 'activity' 
        ? `Create a detailed activity report based on: ${prompt}. Include objectives, actions taken, outcomes, and learnings.`
        : prompt;
      
      const result = await hf.textGeneration({
        model: model,
        inputs: enhancedPrompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          do_sample: true,
        }
      });
      response = result.generated_text || '';
    } 
    else if (model.includes('DialoGPT') || model.includes('blenderbot')) {
      // For conversational models
      const result = await hf.textGeneration({
        model: model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.8,
          do_sample: true,
          pad_token_id: 50256,
        }
      });
      response = result.generated_text || '';
    }
    else if (model.includes('distilbert') && model.includes('squad')) {
      // For Q&A models, we need to provide context
      const questionAnswerPrompt = context === 'activity' 
        ? `Context: This is about internship activities and work experiences. Question: ${prompt}`
        : `Question: ${prompt}`;
      
      const result = await hf.questionAnswering({
        model: model,
        inputs: {
          question: prompt,
          context: context === 'activity' 
            ? "This relates to internship activities, work experiences, learning outcomes, and professional development."
            : "General knowledge and information."
        }
      });
      response = result.answer || '';
    }
    else {
      // Fallback for other models
      const result = await hf.textGeneration({
        model: model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.7,
          do_sample: true,
        }
      });
      response = result.generated_text || '';
    }

    // Clean up the response
    response = response.trim();
    
    // Remove the original prompt if it's included in the response
    if (response.startsWith(prompt)) {
      response = response.substring(prompt.length).trim();
    }

    // Ensure we have meaningful content
    if (!response || response.length < 10) {
      throw new Error('Generated response is too short or empty');
    }

    return new Response(JSON.stringify({ 
      response: response,
      model: model,
      context: context
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in free-ai-models function:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to generate content';
    if (error.message.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
    } else if (error.message.includes('model')) {
      errorMessage = 'Model temporarily unavailable. Please try a different model.';
    } else if (error.message.includes('token')) {
      errorMessage = 'API configuration issue. Please contact support.';
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});