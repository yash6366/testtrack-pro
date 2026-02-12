import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches errors in child components and displays a fallback UI
 * Also logs errors to console in development
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Increment error count
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to console in development
    if (import.meta.env.MODE === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error caught by Error Boundary:');
      // eslint-disable-next-line no-console
      console.error(error);
      // eslint-disable-next-line no-console
      console.error('Error Info:', errorInfo);
    }

    // Optionally send error to error tracking service (Sentry, etc)
    // this.logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  logErrorToService = (_error, _errorInfo) => {
    // TODO: Integrate with Sentry or similar error tracking service
    // Example:
    // Sentry.captureException(_error, { contexts: { react: _errorInfo } });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
          {/* Error Icon */}
          <div className="mb-6 p-4 bg-red-100 rounded-full">
            <AlertCircle size={48} className="text-red-600" />
          </div>

          {/* Error Heading */}
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Oops! Something went wrong</h1>

          {/* Error Message */}
          <p className="text-gray-600 text-center mb-6 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
          </p>

          {/* Error Details (Development Only) */}
          {import.meta.env.MODE === 'development' && this.state.errorInfo && (
            <details className="text-sm text-left bg-white p-4 rounded-lg border border-gray-200 max-w-2xl mb-6 max-h-48 overflow-auto">
              <summary className="font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                Error Details
              </summary>
              <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded overflow-auto">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex gap-4 flex-wrap justify-center">
            {/* Reset Button */}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={18} />
              Try Again
            </button>

            {/* Reload Page Button */}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <RefreshCw size={18} />
              Reload Page
            </button>

            {/* Go Home Button */}
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go to Home
            </button>
          </div>

          {/* Footer Info */}
          <p className="text-xs text-gray-500 mt-8">
            Error ID: {Math.random().toString(36).substring(7)} | Count: {this.state.errorCount}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
