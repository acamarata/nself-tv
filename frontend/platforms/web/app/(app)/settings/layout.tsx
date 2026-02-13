'use client';

import { SettingsNav } from '@/components/settings/SettingsNav';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation - top on mobile, sidebar on desktop */}
        <div className="lg:w-56 flex-shrink-0">
          <SettingsNav />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
