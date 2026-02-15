'use client';

import { useState, useEffect } from 'react';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/Button';
import { UNIFIED_RATING_ORDER } from '@/utils/ratings';

export default function ParentalControlsPage() {
  const { currentProfile, updateProfile } = useProfiles();

  const [contentRatingLimit, setContentRatingLimit] = useState('TV-MA');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (currentProfile?.contentRatingLimit) {
      setContentRatingLimit(currentProfile.contentRatingLimit);
    }
  }, [currentProfile]);

  const handleSave = async () => {
    setSaveMessage('');
    setIsSaving(true);
    try {
      await updateProfile({ contentRatingLimit });
      setSaveMessage('Parental controls updated.');
    } catch {
      setSaveMessage('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      {/* Content Rating Limit */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Content Rating Limit
        </h2>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Maximum Allowed Rating
          </label>
          <select
            id="content-rating-limit"
            aria-label="Maximum allowed content rating"
            value={contentRatingLimit}
            onChange={(e) => setContentRatingLimit(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {UNIFIED_RATING_ORDER.map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-1">
            Content rated above this level will be hidden from this profile.
            Covers both TV ratings (TV-Y through TV-MA) and movie ratings (G through NC-17).
          </p>
        </div>
      </section>

      {/* Save */}
      {saveMessage && (
        <p className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
          {saveMessage}
        </p>
      )}

      <Button
        variant="primary"
        onClick={handleSave}
        isLoading={isSaving}
      >
        Save Changes
      </Button>
    </div>
  );
}
