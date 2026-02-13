'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Check your email</h1>
        <p className="text-text-secondary mb-6">
          We sent password reset instructions to{' '}
          <span className="text-text-primary font-medium">{email}</span>.
          Check your inbox and follow the link to reset your password.
        </p>
        <Link
          href="/login"
          className="text-primary hover:text-primary-hover font-medium"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Reset password</h1>
        <p className="text-text-secondary mt-1">
          Enter your email address and we&apos;ll send you instructions to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-error text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            disabled={isLoading}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:border-transparent w-full"
          />
          {validationError && (
            <p className="text-error text-sm mt-1">{validationError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 w-full"
        >
          {isLoading ? 'Sending...' : 'Send reset instructions'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-border text-center">
        <Link href="/login" className="text-primary hover:text-primary-hover text-sm font-medium">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
