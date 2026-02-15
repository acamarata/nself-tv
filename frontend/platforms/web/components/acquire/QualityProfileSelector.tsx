import type { QualityProfile } from '@/types/acquisition';

const PROFILES: { value: QualityProfile; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Smallest files, SD quality, fast downloads' },
  { value: 'balanced', label: 'Balanced', description: 'Good quality/size balance, up to 1080p' },
  { value: '4k_premium', label: '4K Premium', description: 'Highest quality, Remux/4K preferred' },
];

interface QualityProfileSelectorProps {
  value: QualityProfile;
  onChange: (profile: QualityProfile) => void;
}

export function QualityProfileSelector({ value, onChange }: QualityProfileSelectorProps) {
  return (
    <div className="space-y-2" data-testid="quality-profile-selector">
      {PROFILES.map((profile) => (
        <label
          key={profile.value}
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            value === profile.value
              ? 'border-primary bg-primary/5'
              : 'border-border bg-surface hover:bg-surface-hover'
          }`}
        >
          <input
            type="radio"
            name="qualityProfile"
            value={profile.value}
            checked={value === profile.value}
            onChange={() => onChange(profile.value)}
            className="mt-1 accent-primary"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">{profile.label}</p>
            <p className="text-xs text-text-secondary">{profile.description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}
