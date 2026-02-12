import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useAuth } from '@/hooks';
import ErrorBoundary from '@/components/ErrorBoundary';
import Home from '@/pages/Home';
import Signup from '@/pages/Signup';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import VerifyEmail from '@/pages/VerifyEmail';
import Chat from '@/pages/Chat';
import TestRunCreation from '@/pages/TestRunCreation';
import TestExecution from '@/pages/TestExecution';
import TestExecutionSummary from '@/pages/TestExecutionSummary';
import BugsPage from '@/pages/BugsPage';
import BugDetailsPage from '@/pages/BugDetailsPage';
import BugCreationForm from '@/pages/BugCreationForm';
import TestSuitesPage from '@/pages/TestSuitesPage';
import TestSuiteCreatePage from '@/pages/TestSuiteCreatePage';
import TestSuiteDetailPage from '@/pages/TestSuiteDetailPage';
import SuiteRunDetailPage from '@/pages/SuiteRunDetailPage';
import ReportsPage from '@/pages/ReportsPage';
import AdminUserDetailPage from '@/pages/AdminUserDetailPage';
import TestCaseDetailPage from '@/pages/TestCaseDetailPage';
import TestRunDetailPage from '@/pages/TestRunDetailPage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import NotificationToast from '@/components/NotificationToast';
import DashboardLayout from '@/components/DashboardLayout';

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
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Dashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <Chat />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/test-runs/create"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["TESTER", "DEVELOPER"]}>
              <TestRunCreation />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-execution/:executionId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <TestExecution />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-execution/:executionId/summary"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <TestExecutionSummary />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <BugsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/create"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "TESTER"]}>
              <BugCreationForm />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/:bugId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <BugDetailsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-suites"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <TestSuitesPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-suites/create"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <TestSuiteCreatePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-suites/:suiteId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <TestSuiteDetailPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/suite-runs/:suiteRunId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <SuiteRunDetailPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <ReportsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-cases/:testCaseId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <TestCaseDetailPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-run/:testRunId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <TestRunDetailPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN", "DEVELOPER", "TESTER"]}>
              <SearchResultsPage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:userId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AdminUserDetailPage />
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
