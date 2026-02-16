import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuth } from '@/hooks';
import ErrorBoundary from '@/components/ErrorBoundary';

// Lazy loaded pages for code splitting
const Home = lazy(() => import('@/pages/Home'));
const Signup = lazy(() => import('@/pages/Signup'));
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));
const Chat = lazy(() => import('@/pages/Chat'));
const TestRunCreation = lazy(() => import('@/pages/TestRunCreation'));
const TestExecution = lazy(() => import('@/pages/TestExecution'));
const TestExecutionSummary = lazy(() => import('@/pages/TestExecutionSummary'));
const BugsPage = lazy(() => import('@/pages/BugsPage'));
const BugDetailsPage = lazy(() => import('@/pages/BugDetailsPage'));
const BugCreationForm = lazy(() => import('@/pages/BugCreationForm'));
const TestSuitesPage = lazy(() => import('@/pages/TestSuitesPage'));
const TestSuiteCreatePage = lazy(() => import('@/pages/TestSuiteCreatePage'));
const TestSuiteDetailPage = lazy(() => import('@/pages/TestSuiteDetailPage'));
const SuiteRunDetailPage = lazy(() => import('@/pages/SuiteRunDetailPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const ScheduledReportsPage = lazy(() => import('@/pages/ScheduledReportsPage'));
const AdminUserDetailPage = lazy(() => import('@/pages/AdminUserDetailPage'));
const TestCaseDetailPage = lazy(() => import('@/pages/TestCaseDetailPage'));
const TestRunDetailPage = lazy(() => import('@/pages/TestRunDetailPage'));
const SearchResultsPage = lazy(() => import('@/pages/SearchResultsPage'));
const AnalyticsDashboard = lazy(() => import('@/pages/AnalyticsDashboard'));
const TestPlansPage = lazy(() => import('@/pages/TestPlansPage'));
const ApiKeysPage = lazy(() => import('@/pages/ApiKeysPage'));
const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage'));
const MilestonesPage = lazy(() => import('@/pages/MilestonesPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const ProjectTestCasesPage = lazy(() => import('@/pages/ProjectTestCasesPage'));
const TemplateManagementPage = lazy(() => import('@/pages/TemplateManagementPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AdminPanelPage = lazy(() => import('@/pages/AdminPanelPage'));
const ProjectsListPage = lazy(() => import('@/pages/ProjectsListPage'));
const WebhooksPage = lazy(() => import('@/pages/WebhooksPage'));
const TestPlanDetailPage = lazy(() => import('@/pages/TestPlanDetailPage'));
const EvidenceGalleryPage = lazy(() => import('@/pages/EvidenceGalleryPage'));
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'));
import NotificationToast from '@/components/NotificationToast';
import DashboardLayout from '@/components/DashboardLayout';

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="tt-card px-6 py-5 text-sm text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="tt-card px-6 py-5 text-sm text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RoleRoute({ children, allowedRoles = [] }) {
  const { user } = useAuth();

  if (!user?.role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="tt-card px-6 py-5 text-sm text-[var(--muted)]">
          Access denied. Your account role is missing.
        </div>
      </div>
    );
  }

  const normalizedRole = String(user.role).toUpperCase();
  const normalizedAllowed = allowedRoles.map((role) => String(role).toUpperCase());

  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(normalizedRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="tt-card px-6 py-5 text-sm text-[var(--muted)]">
          Access denied. You do not have permission to view this page.
        </div>
      </div>
    );
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Suspense fallback={<PageLoader />}><Home /></Suspense>} />
      <Route path="/signup" element={<Suspense fallback={<PageLoader />}><Signup /></Suspense>} />
      <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
      <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <Chat />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/test-runs/create"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["TESTER", "DEVELOPER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestRunCreation />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-execution/:executionId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestExecution />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-execution/:executionId/summary"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestExecutionSummary />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <BugsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/create"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <BugCreationForm />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/:bugId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <BugDetailsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-suites"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestSuitesPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-suites/create"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestSuiteCreatePage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-suites/:suiteId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestSuiteDetailPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suite-runs/:suiteRunId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <SuiteRunDetailPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <ReportsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/scheduled-reports"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <ScheduledReportsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-cases/:testCaseId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestCaseDetailPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-run/:testRunId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestRunDetailPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <SearchResultsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:userId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <Suspense fallback={<PageLoader />}>
                <AdminUserDetailPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/analytics"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <AnalyticsDashboard />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <AnalyticsDashboard />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-plans"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestPlansPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/test-plans"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestPlansPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-plans/:planId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestPlanDetailPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/test-plans/:planId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TestPlanDetailPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/webhooks"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER"]}>
              <Suspense fallback={<PageLoader />}>
                <WebhooksPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/webhooks"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER"]}>
              <Suspense fallback={<PageLoader />}>
                <WebhooksPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/evidence"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <EvidenceGalleryPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/evidence"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <EvidenceGalleryPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-keys"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER"]}>
              <Suspense fallback={<PageLoader />}>
                <ApiKeysPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/api-keys"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER"]}>
              <Suspense fallback={<PageLoader />}>
                <ApiKeysPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/integrations"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER"]}>
              <Suspense fallback={<PageLoader />}>
                <IntegrationsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/integrations"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER"]}>
              <Suspense fallback={<PageLoader />}>
                <IntegrationsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/milestones"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <MilestonesPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/milestones"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <MilestonesPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <NotificationsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <ProjectDetailPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/test-cases"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <ProjectTestCasesPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/templates"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <TemplateManagementPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <ProjectsListPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <Suspense fallback={<PageLoader />}>
                <AdminPanelPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <Suspense fallback={<PageLoader />}>
                <AuditLogsPage />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppRoutes />
            <NotificationToast />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
