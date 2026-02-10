import { useAuth } from '@/hooks';
import TesterDashboard from '@/pages/dashboards/TesterDashboard';
import DeveloperDashboard from '@/pages/dashboards/DeveloperDashboard';
import AdminDashboard from '@/pages/dashboards/AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  switch (user.role?.toLowerCase()) {
    case 'tester':
      return <TesterDashboard />;
    case 'developer':
      return <DeveloperDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      // Default to developer dashboard
      return <DeveloperDashboard />;
  }
}
