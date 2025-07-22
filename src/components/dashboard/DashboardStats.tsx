import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalSubmissions?: number;
    pendingReviews?: number;
    approved?: number;
    rejected?: number;
    totalInterns?: number;
    activeChannels?: number;
    todayActivities?: number;
  };
  role: 'intern' | 'staff' | 'admin';
}

export function DashboardStats({ stats, role }: DashboardStatsProps) {
  const internStats = [
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions || 0,
      description: 'Activities submitted',
      icon: FileText,
      trend: '+12% from last week',
      color: 'text-primary'
    },
    {
      title: 'Pending Review',
      value: stats.pendingReviews || 0,
      description: 'Awaiting feedback',
      icon: Clock,
      trend: 'Review in progress',
      color: 'text-warning'
    },
    {
      title: 'Approved',
      value: stats.approved || 0,
      description: 'Successfully reviewed',
      icon: CheckCircle,
      trend: '+8% this month',
      color: 'text-success'
    },
    {
      title: 'Today\'s Activity',
      value: stats.todayActivities || 0,
      description: 'Submitted today',
      icon: Calendar,
      trend: 'Keep it up!',
      color: 'text-university-blue'
    }
  ];

  const staffStats = [
    {
      title: 'Total Interns',
      value: stats.totalInterns || 0,
      description: 'Under supervision',
      icon: Users,
      trend: '+2 this month',
      color: 'text-primary'
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews || 0,
      description: 'Require attention',
      icon: Clock,
      trend: 'Priority queue',
      color: 'text-warning'
    },
    {
      title: 'Active Channels',
      value: stats.activeChannels || 0,
      description: 'Communication channels',
      icon: FileText,
      trend: 'All operational',
      color: 'text-success'
    },
    {
      title: 'This Week',
      value: stats.totalSubmissions || 0,
      description: 'Total submissions',
      icon: TrendingUp,
      trend: '+15% increase',
      color: 'text-university-blue'
    }
  ];

  const currentStats = role === 'intern' ? internStats : staffStats;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {currentStats.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <p className="text-xs text-muted-foreground mb-2">
              {stat.description}
            </p>
            <Badge variant="secondary" className="text-xs">
              {stat.trend}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}