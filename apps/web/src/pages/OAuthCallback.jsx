import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks';
import BackButton from '@/components/ui/BackButton';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setAuthToken } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const provider = searchParams.get('provider') || 'google';

        if (!code) {
          throw new Error('Authorization code not found. Please try again.');
        }

        // Verify state token
        const storedState = sessionStorage.getItem(`oauth_state_${provider}`);
        if (state !== storedState) {
          throw new Error('Invalid state token. Please try again.');
        }

        // Check timestamp (state expires after 10 minutes)
        const timestamp = sessionStorage.getItem(`oauth_timestamp_${provider}`);
        if (Date.now() - parseInt(timestamp) > 10 * 60 * 1000) {
          throw new Error('Authorization request expired. Please try again.');
        }

        // Exchange code for token
        const response = await fetch(
          `${API_BASE_URL}/api/auth/oauth/${provider.toLowerCase()}/callback`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              redirectUrl: window.location.href,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'OAuth authentication failed');
        }

        const data = await response.json();

        // Store token
        setAuthToken(data.token);

        // Clear session storage
        sessionStorage.removeItem(`oauth_state_${provider}`);
        sessionStorage.removeItem(`oauth_timestamp_${provider}`);

        // Redirect based on whether it's a new user
        const redirectPath = data.isNewUser ? '/onboarding' : '/dashboard';
        navigate(redirectPath, { replace: true });
      } catch (err) {
        setError(err.message || 'Failed to complete OAuth authentication');
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, setAuthToken, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
          <p className="mt-4 text-[var(--muted)]">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="tt-card p-8 w-full max-w-md">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--danger)] mb-4">Authentication Error</h2>
          <p className="text-[var(--muted)] mb-6">{error}</p>
          <BackButton label="Back to Login" fallback="/login" className="tt-btn tt-btn-primary" />
        </div>
      </div>
    </div>
  );
}
