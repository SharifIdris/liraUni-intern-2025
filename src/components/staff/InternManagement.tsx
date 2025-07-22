import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Intern {
  id: string;
  full_name: string;
  student_id: string;
  phone: string;
  department: { name: string } | null;
  activityStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

const InternManagement = () => {
  const { toast } = useToast();
  const [interns, setInterns] = useState<Intern[]>([]);
  const [filteredInterns, setFilteredInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInterns();
  }, []);

  useEffect(() => {
    const filtered = interns.filter(intern =>
      intern.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      intern.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInterns(filtered);
  }, [interns, searchTerm]);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      // Fetch interns with their departments
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          student_id,
          phone,
          departments:department_id (name)
        `)
        .eq('role', 'intern');

      if (profiles) {
        // Fetch activity stats for each intern
        const internsWithStats = await Promise.all(
          profiles.map(async (profile) => {
            const { data: activities } = await supabase
              .from('activities')
              .select('status')
              .eq('user_id', profile.id);

            const stats = {
              total: activities?.length || 0,
              pending: activities?.filter(a => a.status === 'pending').length || 0,
              approved: activities?.filter(a => a.status === 'approved').length || 0,
              rejected: activities?.filter(a => a.status === 'rejected').length || 0,
            };

            return {
              ...profile,
              department: profile.departments,
              activityStats: stats,
            };
          })
        );

        setInterns(internsWithStats);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch intern data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string, count: number) => {
    if (count === 0) return null;
    
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="text-xs">
        {count}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading intern data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Intern Management
        </CardTitle>
        <CardDescription>
          Monitor and manage all interns in your system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Activity Summary</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInterns.map((intern) => (
                <TableRow key={intern.id}>
                  <TableCell className="font-medium">{intern.full_name}</TableCell>
                  <TableCell>{intern.student_id || 'N/A'}</TableCell>
                  <TableCell>{intern.department?.name || 'Unassigned'}</TableCell>
                  <TableCell>{intern.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Total: {intern.activityStats.total}
                      </span>
                      <div className="flex gap-1">
                        {getStatusBadge('pending', intern.activityStats.pending)}
                        {getStatusBadge('approved', intern.activityStats.approved)}
                        {getStatusBadge('rejected', intern.activityStats.rejected)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Active</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredInterns.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No interns found matching your search.' : 'No interns found.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InternManagement;