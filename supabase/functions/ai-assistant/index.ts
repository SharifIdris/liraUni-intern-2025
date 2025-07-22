import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, userRole } = await req.json();
    
    // Initialize Supabase client for context retrieval
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    
    // Get comprehensive context from the database
    const contextData = await gatherContext(supabase, userRole);
    
    // Enhanced system prompt with wide context
    const systemPrompt = `You are LIRA AI, an intelligent assistant for LIRA University's Intern Management System.

CONTEXT OVERVIEW:
- University: LIRA University (Leadership in Innovation, Research, and Academics)
- System: Comprehensive intern management platform
- User Role: ${userRole}

CURRENT SYSTEM DATA:
${contextData}

CAPABILITIES:
1. **Activity Management**: Help with creating, tracking, and reviewing intern activities
2. **Performance Analytics**: Analyze intern progress and provide insights
3. **Communication**: Facilitate between interns, staff, and administrators
4. **Workflow Optimization**: Suggest improvements for intern processes
5. **Reporting**: Generate comprehensive reports and summaries
6. **Problem Solving**: Troubleshoot issues and provide solutions
7. **Learning Support**: Provide educational guidance and resources
8. **Time Management**: Help optimize schedules and deadlines

RESPONSE GUIDELINES:
- Be professional yet approachable
- Provide actionable, specific advice
- Reference actual data when possible
- Adapt responses to user role (intern/staff/admin)
- Offer multiple solutions when appropriate
- Include relevant best practices
- Be proactive in suggesting improvements

Always maintain context awareness and provide comprehensive, intelligent responses that demonstrate deep understanding of the university's intern management ecosystem.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    return new Response(JSON.stringify({ 
      response: aiResponse,
      contextUsed: contextData.split('\n').length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate AI response',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function gatherContext(supabase: any, userRole: string) {
  try {
    // Gather comprehensive context from multiple tables
    const [
      activitiesData,
      profilesData,
      departmentsData,
      commentsData
    ] = await Promise.all([
      supabase.from('activities').select('*').limit(50),
      supabase.from('profiles').select('*').limit(100),
      supabase.from('departments').select('*'),
      supabase.from('comments').select('*').limit(100)
    ]);

    let context = '';

    // Activities context
    if (activitiesData.data) {
      const totalActivities = activitiesData.data.length;
      const pendingActivities = activitiesData.data.filter((a: any) => a.status === 'pending').length;
      const completedActivities = activitiesData.data.filter((a: any) => a.status === 'completed').length;
      
      context += `ACTIVITIES OVERVIEW:
- Total Activities: ${totalActivities}
- Pending Reviews: ${pendingActivities}
- Completed: ${completedActivities}
- Recent Activity Types: ${[...new Set(activitiesData.data.slice(0, 10).map((a: any) => a.type))].join(', ')}

`;
    }

    // Profiles context
    if (profilesData.data) {
      const totalProfiles = profilesData.data.length;
      const interns = profilesData.data.filter((p: any) => p.role === 'intern').length;
      const staff = profilesData.data.filter((p: any) => p.role === 'staff').length;
      const admins = profilesData.data.filter((p: any) => p.role === 'admin').length;
      
      context += `USER STATISTICS:
- Total Users: ${totalProfiles}
- Interns: ${interns}
- Staff: ${staff}
- Administrators: ${admins}

`;
    }

    // Departments context
    if (departmentsData.data) {
      context += `DEPARTMENTS:
${departmentsData.data.map((d: any) => `- ${d.name}: ${d.description || 'No description'}`).join('\n')}

`;
    }

    // Comments/Engagement context
    if (commentsData.data) {
      const recentComments = commentsData.data.length;
      context += `ENGAGEMENT METRICS:
- Recent Comments: ${recentComments}
- Active Discussions: ${[...new Set(commentsData.data.map((c: any) => c.activity_id))].length}

`;
    }

    // Role-specific context
    context += `USER ROLE CONTEXT:
Current user role: ${userRole}
${getRoleSpecificContext(userRole)}

`;

    // System capabilities context
    context += `SYSTEM CAPABILITIES:
- Real-time activity tracking and reporting
- Multi-department intern coordination
- Automated workflow management
- Performance analytics and insights
- Communication and collaboration tools
- Document management and reporting
- Role-based access control
- Channel-based team communication

CURRENT SYSTEM STATUS: Operational
LAST UPDATED: ${new Date().toISOString()}`;

    return context;
  } catch (error) {
    console.error('Error gathering context:', error);
    return `Context gathering failed: ${error.message}. Proceeding with limited context.`;
  }
}

function getRoleSpecificContext(role: string): string {
  switch (role) {
    case 'intern':
      return `- Focus on activity completion and learning
- Access to personal dashboard and progress tracking
- Ability to submit activities and receive feedback
- Communication with supervisors and peers`;
    
    case 'staff':
      return `- Responsibility for intern supervision and review
- Access to departmental analytics and reporting
- Ability to approve/reject intern activities
- Team management and coordination tools`;
    
    case 'admin':
      return `- Full system oversight and management
- Access to all departments and users
- System configuration and user management
- Comprehensive analytics and reporting
- Policy and workflow management`;
    
    default:
      return `- General system access based on assigned permissions`;
  }
}