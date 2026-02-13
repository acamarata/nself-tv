'use client';

import { Plus } from 'lucide-react';
import type { Profile } from '@/types/profile';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileSelectorProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onAddNew: () => void;
}

function ProfileSelector({
  profiles,
  onSelect,
  onAddNew,
}: ProfileSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-3xl font-bold text-text-primary mb-8">
        Who&apos;s watching?
      </h1>

      <div className="flex flex-wrap justify-center gap-6 max-w-2xl">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onSelect(profile)}
            className="group flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <div className="ring-2 ring-transparent group-hover:ring-primary rounded-full transition-all">
              <ProfileAvatar profile={profile} size="lg" />
            </div>
            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors font-medium max-w-[96px] truncate">
              {profile.displayName}
            </span>
          </button>
        ))}

        {/* Add new profile button */}
        <button
          onClick={onAddNew}
          className="group flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-surface-hover transition-colors"
        >
          <div className="h-24 w-24 rounded-full border-2 border-dashed border-border group-hover:border-primary flex items-center justify-center transition-colors">
            <Plus className="h-10 w-10 text-text-muted group-hover:text-primary transition-colors" />
          </div>
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors font-medium">
            Add Profile
          </span>
        </button>
      </div>
    </div>
  );
}

export { ProfileSelector };
export type { ProfileSelectorProps };
