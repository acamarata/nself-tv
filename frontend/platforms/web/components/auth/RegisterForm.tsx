'use client';

import { useState, type FormEvent } from 'react';

interface RegisterFormProps {
  onSubmit: (data: {
    email: string;
    password: string;
    displayName: string;
    familyName: string;
  }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export default function RegisterForm({ onSubmit, isLoading, error }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!displayName.trim()) {
      errors.displayName = 'Display name is required';
    }

    if (!familyName.trim()) {
      errors.familyName = 'Family name is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setValidationErrors({});

    if (!validate()) return;

    await onSubmit({ email, password, displayName, familyName });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-error text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-text-secondary mb-1">
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John"
            autoComplete="given-name"
            autoFocus
            disabled={isLoading}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:border-transparent w-full"
          />
          {validationErrors.displayName && (
            <p className="text-error text-sm mt-1">{validationErrors.displayName}</p>
          )}
        </div>

        <div>
          <label htmlFor="familyName" className="block text-sm font-medium text-text-secondary mb-1">
            Family Name
          </label>
          <input
            id="familyName"
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="Doe"
            autoComplete="family-name"
            disabled={isLoading}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:border-transparent w-full"
          />
          {validationErrors.familyName && (
            <p className="text-error text-sm mt-1">{validationErrors.familyName}</p>
          )}
        </div>
      </div>

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
          disabled={isLoading}
          className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:border-transparent w-full"
        />
        {validationErrors.email && (
          <p className="text-error text-sm mt-1">{validationErrors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          disabled={isLoading}
          className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:border-transparent w-full"
        />
        {validationErrors.password && (
          <p className="text-error text-sm mt-1">{validationErrors.password}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          disabled={isLoading}
          className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:border-transparent w-full"
        />
        {validationErrors.confirmPassword && (
          <p className="text-error text-sm mt-1">{validationErrors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 w-full"
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
