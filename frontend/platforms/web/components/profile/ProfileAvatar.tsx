'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Profile } from '@/types/profile';

interface ProfileAvatarProps {
  profile: Pick<Profile, 'displayName' | 'avatarUrl'>;
  size?: 'sm' | 'md' | 'lg';
}

const sizePx: Record<NonNullable<ProfileAvatarProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 96,
};

const sizeClasses: Record<NonNullable<ProfileAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-base',
  lg: 'h-24 w-24 text-2xl',
};

const avatarColors = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-fuchsia-600',
  'bg-lime-600',
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function ProfileAvatar({ profile, size = 'md' }: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initial = profile.displayName?.charAt(0).toUpperCase() || '?';
  const colorClass = getColorForName(profile.displayName || '');
  const px = sizePx[size];

  if (profile.avatarUrl && !imgError) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 ${sizeClasses[size]}`}
      >
        <Image
          src={profile.avatarUrl}
          alt={profile.displayName}
          width={px}
          height={px}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${colorClass} ${sizeClasses[size]}`}
      aria-label={profile.displayName}
    >
      {initial}
    </div>
  );
}

export { ProfileAvatar };
export type { ProfileAvatarProps };
