'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(data: {
    email: string;
    password: string;
    displayName: string;
    familyName: string;
  }) {
    setError(null);
    try {
      await register({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        familyName: data.familyName,
      });
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
        <h1 className="text-2xl font-bold text-text-primary">Create account</h1>
        <p className="text-text-secondary mt-1">
          Join nTV to start watching your media library.
        </p>
      </div>

      <RegisterForm onSubmit={handleRegister} isLoading={isLoading} error={error} />

      <div className="mt-6 pt-6 border-t border-border text-center">
        <p className="text-text-secondary text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
