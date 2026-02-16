import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import ProjectSelector from '@/components/ProjectSelector';
import NotificationCenter from '@/components/NotificationCenter';

export default function DashboardLayout({
  user,
  dashboardLabel,
  headerTitle,
  headerSubtitle,
  onLogout,
  children,
}) {
  const isTester = String(user?.role || '').toUpperCase() === 'TESTER';
  const isDeveloper = String(user?.role || '').toUpperCase() === 'DEVELOPER';
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  
  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/test-suites', label: 'Test Suites' },
    { to: '/bugs', label: 'Bugs' },
    { to: '/reports', label: 'Reports' },
    { to: '/chat', label: 'Chat' },
  ];
  
  // Add conditional links based on role
  if (!isTester) {
    navLinks.push({ to: '/analytics', label: 'Analytics' });
  }
  if (isAdmin || isDeveloper) {
    navLinks.push({ to: '/api-keys', label: 'API Keys' });
    navLinks.push({ to: '/integrations', label: 'Integrations' });
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center font-bold">
              TT
            </div>
            <div>
              <h1 className="text-lg font-semibold">TestTrack Pro</h1>
              <p className="text-xs text-[var(--muted)]">{dashboardLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {(isTester) && <ProjectSelector />}
            <NotificationCenter />
            <div className="text-right">
              <p className="text-xs text-[var(--muted)]">Welcome back</p>
              <p className="text-sm font-semibold">{user.name}</p>
            </div>
            <ThemeToggle />
            <button
              onClick={onLogout}
              className="tt-btn tt-btn-danger px-4 py-2 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold">{headerTitle}</h2>
          <p className="text-[var(--muted)] mt-2">{headerSubtitle}</p>
        </div>

        {children}
      </div>
    </div>
  );
}
