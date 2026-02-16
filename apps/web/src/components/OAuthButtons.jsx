import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';

export default function OAuthButtons() {
  const navigate = useNavigate();
  const { setAuthToken: setToken } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleOAuthRedirect = async (provider) => {
    try {
      setLoading(provider);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/api/auth/oauth/${provider.toLowerCase()}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get ${provider} authorization URL`);
      }

      const data = await response.json();

      // Store state in session storage for verification on callback
      sessionStorage.setItem(`oauth_state_${provider}`, data.state);
      sessionStorage.setItem(`oauth_timestamp_${provider}`, Date.now().toString());

      // Redirect to OAuth provider
      window.location.href = data.authUrl;
    } catch (err) {
      setError(err.message || `Failed to initiate ${provider} login`);
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="tt-card-soft border border-[var(--danger)] text-[var(--danger)] px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[var(--surface)] text-[var(--muted)]">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleOAuthRedirect('google')}
          disabled={loading !== null}
          className="tt-btn tt-btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 12c0-1.1-.9-2-2-2m0 0c-.55 0-1.05.22-1.41.59M18 10c.28 0 .55.06.79.16M6 12c0-3.31 2.69-6 6-6s6 2.69 6 6" />
          </svg>
          {loading === 'google' ? 'Redirecting...' : 'Google'}
        </button>

        <button
          type="button"
          onClick={() => handleOAuthRedirect('github')}
          disabled={loading !== null}
          className="tt-btn tt-btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          {loading === 'github' ? 'Redirecting...' : 'GitHub'}
        </button>
      </div>
    </div>
  );
}
