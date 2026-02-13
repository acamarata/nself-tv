'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authorizeDeviceCode } from '@/lib/auth/api';

export default function DeviceCodePage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  function handleCodeChange(value: string) {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(sanitized);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError('Please enter the full 6-character code');
      return;
    }

    setIsLoading(true);
    try {
      await authorizeDeviceCode(code);
      setAuthorized(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid or expired code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (authorized) {
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Device authorized!</h1>
        <p className="text-text-secondary mb-6">
          You can now use your TV. This page can be closed.
        </p>
        <Link
          href="/home"
          className="text-primary hover:text-primary-hover font-medium"
        >
          Go to home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Connect your TV</h1>
        <p className="text-text-secondary mt-1">
          Enter the 6-character code displayed on your TV screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-error text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="device-code" className="sr-only">
            Device code
          </label>
          <input
            id="device-code"
            type="text"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="XXXXXX"
            autoComplete="off"
            autoFocus
            disabled={isLoading}
            maxLength={6}
            className="bg-surface border border-border rounded-lg px-4 py-4 text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:border-transparent w-full text-center font-mono text-3xl tracking-[0.5em] uppercase"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 w-full"
        >
          {isLoading ? 'Authorizing...' : 'Authorize device'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-border text-center">
        <p className="text-text-muted text-sm">
          Open your TV app and navigate to Settings &gt; Sign In to see the code.
        </p>
      </div>
    </div>
  );
}
