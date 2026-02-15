/**
 * React Error Boundary Component
 * Catches rendering errors and displays user-friendly fallback UI
 */

import React from 'react';
import { errorMonitor, ErrorSeverity, getErrorType, ErrorMessages } from '../lib/error-monitoring';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorMonitor.captureError(error, {
      severity: ErrorSeverity.HIGH,
      context: { componentStack: errorInfo.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = getErrorType(this.state.error!);
      const errorMessage = ErrorMessages[errorType];

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              {errorMessage.title}
            </h1>
            <p className="text-text-secondary mb-6">{errorMessage.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary-hover text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              {errorMessage.action}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
