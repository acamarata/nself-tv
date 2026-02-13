'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Play, Shield, Smartphone, Info } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Account',
    href: '/settings/account',
    icon: <User className="h-5 w-5" />,
  },
  {
    label: 'Playback',
    href: '/settings/playback',
    icon: <Play className="h-5 w-5" />,
  },
  {
    label: 'Parental Controls',
    href: '/settings/parental',
    icon: <Shield className="h-5 w-5" />,
  },
  {
    label: 'Devices',
    href: '/settings/devices',
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    label: 'About',
    href: '/settings/about',
    icon: <Info className="h-5 w-5" />,
  },
];

function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full md:w-64 flex-shrink-0">
      <h2 className="text-lg font-semibold text-text-primary mb-4 px-3">
        Settings
      </h2>
      <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { SettingsNav };
