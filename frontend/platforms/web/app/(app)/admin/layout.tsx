'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  FolderSearch,
  Tags,
  Library,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNavItems: AdminNavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Media Upload',
    href: '/admin/media/upload',
    icon: <Upload className="w-5 h-5" />,
  },
  {
    label: 'Library Scan',
    href: '/admin/media/scan',
    icon: <FolderSearch className="w-5 h-5" />,
  },
  {
    label: 'Metadata',
    href: '/admin/media/metadata',
    icon: <Tags className="w-5 h-5" />,
  },
  {
    label: 'Library',
    href: '/admin/media/library',
    icon: <Library className="w-5 h-5" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Mock: always treat user as admin
  const isAdmin = true;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Access Denied
          </h2>
          <p className="text-text-secondary text-sm">
            You do not have permission to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="p-6 lg:p-8 pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Admin</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="w-full">
            <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-hide">
              {adminNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
