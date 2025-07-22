import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Printer, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  activities_count: number;
  user: {
    full_name: string;
    student_id: string;
  };
}

const PrintableAttendance = () => {
  const { toast } = useToast();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const { data: records } = await supabase
        .from('attendance_records')
        .select(`
          id,
          date,
          status,
          activities_count,
          profiles:user_id (
            full_name,
            student_id
          )
        `)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false });

      if (records) {
        const formattedRecords = records.map(record => ({
          ...record,
          user: record.profiles as any
        }));
        setAttendanceRecords(formattedRecords);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('attendance-report');
    if (printContent) {
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [dateRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Attendance Report
        </CardTitle>
        <CardDescription>
          Generate and print attendance reports based on activity submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handlePrint} disabled={loading || attendanceRecords.length === 0}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        <div id="attendance-report" className="space-y-4">
          <div className="text-center mb-6 print:block">
            <h1 className="text-2xl font-bold">Lira University</h1>
            <h2 className="text-xl font-semibold">Internship Attendance Report</h2>
            <p className="text-muted-foreground">
              Period: {format(new Date(dateRange.start), 'MMM dd, yyyy')} - {format(new Date(dateRange.end), 'MMM dd, yyyy')}
            </p>
            <p className="text-sm text-muted-foreground">
              Generated on: {format(new Date(), 'MMM dd, yyyy at HH:mm')}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading attendance data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Student Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Student ID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Activities</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="border border-gray-300 px-4 py-2">
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {record.user?.full_name || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {record.user?.student_id || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.status === 'present' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {record.activities_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && attendanceRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found for the selected date range.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PrintableAttendance;