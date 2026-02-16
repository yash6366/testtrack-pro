import { createContext, useState, useCallback, useEffect } from 'react';

export const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (parseError) {
        clearAuth();
      }
    }

    setLoading(false);
  }, [clearAuth]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth();
    };

    const handleStorage = (event) => {
      if (event.key === 'token' || event.key === 'user') {
        const nextToken = localStorage.getItem('token');
        const nextUser = localStorage.getItem('user');
        if (!nextToken || !nextUser) {
          clearAuth();
          return;
        }
        try {
          setToken(nextToken);
          setUser(JSON.parse(nextUser));
        } catch (parseError) {
          clearAuth();
        }
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearAuth]);

  const signup = useCallback(async (name, email, password, role = 'DEVELOPER') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Signup failed');
      }

      const { user: newUser } = data;
      setUser(newUser);

      localStorage.setItem('user', JSON.stringify(newUser));

      return { success: true, user: newUser };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    // Clear any existing auth state before attempting login
    clearAuth();

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Login failed');
      }

      const { token: newToken, user: newUser } = data;
      setToken(newToken);
      setUser(newUser);

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      return { success: true, user: newUser };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Capture token before clearing
    const currentToken = token;

    try {
      // Call logout API to invalidate token server-side
      if (currentToken) {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.warn('Logout API failed:', data.error || 'Logout failed');
        }
      }

      // Clear client state
      clearAuth();
      setLoading(false);
      return { success: true };
    } catch (err) {
      // Clear local state even if API fails
      clearAuth();

      const message = err instanceof Error ? err.message : 'Logout failed';
      console.warn('Logout error:', message);
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  }, [token, clearAuth]);

  const logoutAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Capture token before clearing
    const currentToken = token;

    try {
      // Call logout-all API to invalidate ALL tokens server-side
      if (currentToken) {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.warn('Logout all API failed:', data.error || 'Logout from all devices failed');
        }
      }

      // Clear client state
      clearAuth();
      setLoading(false);
      return { success: true };
    } catch (err) {
      // Clear local state even if API fails
      clearAuth();

      const message = err instanceof Error ? err.message : 'Logout failed';
      console.warn('Logout all error:', message);
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  }, [token]);

  const isAuthenticated = !!token && !!user;

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    signup,
    login,
    logout,
    logoutAll,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
