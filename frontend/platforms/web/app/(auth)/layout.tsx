'use client';

import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">n</span>
            </div>
            <span className="text-2xl font-bold text-text-primary group-hover:text-primary transition-colors">
              nTV
            </span>
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8 w-full">
          {children}
        </div>

        <p className="text-center text-text-muted text-sm mt-6">
          &copy; {new Date().getFullYear()} nself.org. All rights reserved.
        </p>
      </div>
    </div>
  );
}
