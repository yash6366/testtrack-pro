import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginForm({ message }) {
  const navigate = useNavigate();
  const { login, error: authError, setError: setAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState(message || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authError) {
      setAuthError(null);
    }
  }, [authError, setAuthError]);

  const handleEmailChange = (e) => {
    if (formError) {
      setFormError('');
    }
    if (authError) {
      setAuthError(null);
    }
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    if (formError) {
      setFormError('');
    }
    if (authError) {
      setAuthError(null);
    }
    setPassword(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setLoading(true);

    if (!email || !password) {
      setFormError('Email and password are required');
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setFormError(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-6xl w-full mx-auto px-6 pt-8">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center font-bold">
              TT
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">TestTrack Pro</p>
              <h1 className="text-lg font-semibold">Sign in</h1>
            </div>
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <div className="flex-1 flex items-center">
        <div className="max-w-6xl w-full mx-auto px-6 py-12 grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6 animate-fade-up">
            <span className="tt-pill">Team visibility</span>
            <h2 className="text-4xl font-semibold leading-tight">Welcome back to the release room.</h2>
            <p className="text-[var(--muted)]">
              Track deployments, test status, and realtime decisions from a single surface.
            </p>
            <div className="tt-card-soft p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>System health</span>
                <span className="text-[var(--success)]">99.8% uptime</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Active squads</span>
                <span>6 teams online</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Open incidents</span>
                <span className="text-[var(--warning)]">2 in review</span>
              </div>
            </div>
          </div>

          <div className="tt-card p-8 w-full max-w-md justify-self-center animate-fade-in">
            <h3 className="text-2xl font-semibold mb-6">Access your workspace</h3>

            {(formError || authError) && (
              <div className="tt-card-soft border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-xl mb-4">
                {formError || authError}
              </div>
            )}

            {successMsg && (
              <div className="tt-card-soft border border-[var(--success)] text-[var(--success)] px-4 py-3 rounded-xl mb-4">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold mb-2">
                  Email Address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className="tt-input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold mb-2">
                  Password
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="tt-input"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="tt-btn tt-btn-primary w-full py-3 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--muted)] mt-6">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[var(--primary)] font-semibold">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
