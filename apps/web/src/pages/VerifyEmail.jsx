import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { apiClient } from '../lib/apiClient';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        await apiClient.post('/api/auth/verify-email', { token });
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Failed to verify email');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-5xl w-full mx-auto px-6 pt-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center font-bold">
            TT
          </div>
          <div>
            <p className="text-sm text-[var(--muted)]">TestTrack Pro</p>
            <h1 className="text-lg font-semibold">Verify email</h1>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="tt-card p-8 w-full max-w-md text-center animate-fade-in">
          {status === 'verifying' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--primary)] border-t-transparent mx-auto mb-4"></div>
              <p className="text-[var(--muted)]">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-[var(--success)] text-5xl mb-4">✓</div>
              <p className="text-[var(--success)] font-semibold">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-[var(--danger)] text-5xl mb-4">✕</div>
              <p className="text-[var(--danger)] font-semibold">{message}</p>
              <button
                onClick={() => navigate('/signup')}
                className="mt-4 text-[var(--primary)] font-semibold"
              >
                Back to Signup
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
