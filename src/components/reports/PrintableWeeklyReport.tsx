import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Printer, Calendar, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface WeeklyActivity {
  id: string;
  title: string;
  content: string;
  location: any;
  status: string;
  submitted_at: string;
  date: string;
}

const PrintableWeeklyReport = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<WeeklyActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchWeeklyActivities = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const weekStart = startOfWeek(new Date(selectedWeek), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(selectedWeek), { weekStartsOn: 1 });

      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', profile.id)
        .gte('submitted_at', weekStart.toISOString())
        .lte('submitted_at', weekEnd.toISOString())
        .order('submitted_at', { ascending: true });

      if (data) {
        const formattedActivities = data.map(activity => ({
          ...activity,
          date: format(new Date(activity.submitted_at), 'yyyy-MM-dd')
        }));
        setActivities(formattedActivities);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch weekly activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('weekly-report');
    if (printContent) {
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  const getLocationText = (location: any) => {
    if (!location) return 'N/A';
    if (typeof location === 'string') return location;
    if (location.name) return location.name;
    if (location.address) return location.address;
    return 'Location recorded';
  };

  useEffect(() => {
    fetchWeeklyActivities();
  }, [selectedWeek, profile]);

  const weekStart = startOfWeek(new Date(selectedWeek), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(selectedWeek), { weekStartsOn: 1 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Weekly Activity Report
        </CardTitle>
        <CardDescription>
          Generate and print your weekly activity submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="week-selector">Select Week</Label>
            <Input
              id="week-selector"
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Week: {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
            </p>
          </div>
          <div className="flex items-end">
            <Button onClick={handlePrint} disabled={loading || activities.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        <div id="weekly-report" className="space-y-4">
          <div className="text-center mb-6 print:block">
            <h1 className="text-2xl font-bold">Lira University</h1>
            <h2 className="text-xl font-semibold">Weekly Internship Activity Report</h2>
            <div className="mt-4">
              <p><strong>Student:</strong> {profile?.full_name}</p>
              {profile?.student_id && <p><strong>Student ID:</strong> {profile.student_id}</p>}
              <p><strong>Week:</strong> {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}</p>
              <p className="text-sm text-muted-foreground">
                Generated on: {format(new Date(), 'MMM dd, yyyy at HH:mm')}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading weekly activities...</div>
          ) : (
            <div className="space-y-6">
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <div key={activity.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="mb-2">
                      <h3 className="text-lg font-semibold">
                        Day {index + 1}: {activity.title}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        <p><strong>Date:</strong> {format(new Date(activity.submitted_at), 'MMM dd, yyyy')}</p>
                        <p><strong>Time:</strong> {format(new Date(activity.submitted_at), 'HH:mm')}</p>
                        <p><strong>Location:</strong> {getLocationText(activity.location)}</p>
                        <p><strong>Status:</strong> 
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            activity.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : activity.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {activity.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h4 className="font-medium mb-2">Activity Description:</h4>
                      <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded">
                        {activity.content}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No activities submitted for the selected week.
                </div>
              )}

              {activities.length > 0 && (
                <div className="mt-8 pt-4 border-t border-gray-300">
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Total Activities This Week: {activities.length}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Approved: {activities.filter(a => a.status === 'approved').length}</p>
                      <p>Pending: {activities.filter(a => a.status === 'pending').length}</p>
                      <p>Rejected: {activities.filter(a => a.status === 'rejected').length}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PrintableWeeklyReport;