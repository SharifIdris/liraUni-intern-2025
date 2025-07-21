import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, BookOpen, Heart, Laptop } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  description: string;
}

const DepartmentSelection = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateProfile, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDepartment || !studentId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a department and enter your student ID.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await updateProfile({
        department_id: selectedDepartment,
        student_id: studentId.trim()
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile Updated!",
          description: "Your department has been selected successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentIcon = (departmentName: string) => {
    const name = departmentName.toLowerCase();
    if (name.includes('computer') || name.includes('it')) return <Laptop className="w-6 h-6" />;
    if (name.includes('business')) return <Building2 className="w-6 h-6" />;
    if (name.includes('education')) return <BookOpen className="w-6 h-6" />;
    if (name.includes('health')) return <Heart className="w-6 h-6" />;
    return <Users className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-university-light-blue via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl bg-gradient-to-r from-university-blue to-primary bg-clip-text text-transparent">
              Welcome to Lira University!
            </CardTitle>
            <CardDescription className="text-lg">
              Hi {profile?.full_name}! Please select your department to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="student-id">Student ID</Label>
                <Input
                  id="student-id"
                  placeholder="Enter your student ID (e.g., LU2024001)"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Select Your Department</Label>
                <div className="grid gap-3">
                  {departments.map((dept) => (
                    <div
                      key={dept.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-card ${
                        selectedDepartment === dept.id
                          ? 'border-university-blue bg-university-light-blue/20 shadow-card'
                          : 'border-border hover:border-university-blue/50'
                      }`}
                      onClick={() => setSelectedDepartment(dept.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${selectedDepartment === dept.id ? 'text-university-blue' : 'text-muted-foreground'}`}>
                          {getDepartmentIcon(dept.name)}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${selectedDepartment === dept.id ? 'text-university-blue' : 'text-foreground'}`}>
                            {dept.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {dept.description}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedDepartment === dept.id
                            ? 'border-university-blue bg-university-blue'
                            : 'border-muted-foreground'
                        }`}>
                          {selectedDepartment === dept.id && (
                            <div className="w-full h-full rounded-full bg-primary-foreground scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-university-blue to-primary hover:from-primary-hover hover:to-university-blue transition-all duration-300"
                disabled={loading}
                size="lg"
              >
                {loading ? 'Saving...' : 'Continue to Dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepartmentSelection;