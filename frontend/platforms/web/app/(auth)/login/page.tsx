'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(email: string, password: string) {
    setError(null);
    try {
      await login({ email, password });
      router.replace('/home');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Sign in</h1>
        <p className="text-text-secondary mt-1">
          Welcome back. Sign in to continue watching.
        </p>
      </div>

      <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />

      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-primary hover:text-primary-hover text-sm">
          Forgot your password?
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-border text-center">
        <p className="text-text-secondary text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:text-primary-hover font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
