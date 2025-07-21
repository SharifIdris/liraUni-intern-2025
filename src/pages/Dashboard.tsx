import { useAuth } from '@/hooks/useAuth';
import InternDashboard from '@/components/dashboard/InternDashboard';
import StaffDashboard from '@/components/dashboard/StaffDashboard';
import DepartmentSelection from '@/components/dashboard/DepartmentSelection';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Unable to load profile. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // If intern hasn't selected a department yet
  if (profile.role === 'intern' && !profile.department_id) {
    return <DepartmentSelection />;
  }

  // Render appropriate dashboard based on role
  if (profile.role === 'intern') {
    return <InternDashboard />;
  }

  if (profile.role === 'staff' || profile.role === 'admin') {
    return <StaffDashboard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-destructive">Unknown user role. Please contact support.</p>
      </div>
    </div>
  );
};

export default Dashboard;