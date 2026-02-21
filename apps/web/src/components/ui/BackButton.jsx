import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const FALLBACK_ROUTES = {
  '/test-suites': '/dashboard',
  '/bugs': '/dashboard',
  '/reports': '/dashboard',
  '/analytics': '/dashboard',
  '/api-keys': '/dashboard',
  '/integrations': '/dashboard',
  '/chat': '/dashboard',
};

export function BackButton({ label, fallback, className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    const referrer = document.referrer;
    let isSameOrigin = false;

    if (referrer) {
      try {
        isSameOrigin = new URL(referrer).origin === window.location.origin;
      } catch (error) {
        isSameOrigin = false;
      }
    }

    if (isSameOrigin && window.history.length > 1) {
      navigate(-1);
      return;
    }

    const destination = fallback || FALLBACK_ROUTES[location.pathname] || '/dashboard';
    navigate(destination);
  };

  return (
    <button onClick={handleBack} className={`back-button ${className}`}>
      <ChevronLeft className="w-4 h-4" />
      {label || 'Back'}
    </button>
  );
}

export default BackButton;
