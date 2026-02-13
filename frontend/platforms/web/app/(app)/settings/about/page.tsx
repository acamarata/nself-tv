'use client';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
const BACKEND_VERSION = process.env.NEXT_PUBLIC_BACKEND_VERSION ?? '1.0.0';

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-lg">
      {/* App Info */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          About nTV
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">App Version</span>
            <span className="text-sm font-mono text-text-primary">
              v{APP_VERSION}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <span className="text-sm text-text-secondary">Backend Version</span>
            <span className="text-sm font-mono text-text-primary">
              v{BACKEND_VERSION}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border">
            <span className="text-sm text-text-secondary">Platform</span>
            <span className="text-sm text-text-primary">Web</span>
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Legal</h2>

        <div className="space-y-1">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-3 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <span>Privacy Policy</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-3 text-sm text-text-secondary hover:text-text-primary transition-colors border-t border-border"
          >
            <span>Terms of Service</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <a
            href="/licenses"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between py-3 text-sm text-text-secondary hover:text-text-primary transition-colors border-t border-border"
          >
            <span>Open Source Licenses</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>

      {/* Powered By */}
      <div className="text-center py-4">
        <p className="text-xs text-text-tertiary">
          Powered by{' '}
          <a
            href="https://nself.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            nSelf
          </a>
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          Free and Open Source Software
        </p>
      </div>
    </div>
  );
}
