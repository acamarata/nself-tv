'use client';

import { useState, useEffect } from 'react';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TV_RATING_ORDER, MOVIE_RATING_ORDER } from '@/utils/ratings';

export default function ParentalControlsPage() {
  const { currentProfile, updateProfile } = useProfiles();

  const [isVerified, setIsVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const [maxTVRating, setMaxTVRating] = useState('TV-MA');
  const [maxMovieRating, setMaxMovieRating] = useState('NC-17');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [pinError, setPinError] = useState('');

  const hasExistingPin = Boolean(currentProfile?.parentalControls?.pin);

  useEffect(() => {
    if (currentProfile?.parentalControls) {
      const pc = currentProfile.parentalControls;
      setMaxTVRating(pc.maxTvRating ?? 'TV-MA');
      setMaxMovieRating(pc.maxMovieRating ?? 'NC-17');
      setPinEnabled(pc.pinEnabled ?? false);
    }
    // If no PIN is set, skip verification
    if (!hasExistingPin) {
      setIsVerified(true);
    }
  }, [currentProfile, hasExistingPin]);

  const handleVerifyPin = () => {
    setVerifyError('');
    if (pinInput === currentProfile?.parentalControls?.pin) {
      setIsVerified(true);
      setPinInput('');
    } else {
      setVerifyError('Incorrect PIN. Please try again.');
    }
  };

  const handleSave = async () => {
    setPinError('');
    setSaveMessage('');

    // Validate PIN if being set/changed
    if (pinEnabled && newPin) {
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        setPinError('PIN must be exactly 4 digits.');
        return;
      }
      if (newPin !== confirmPin) {
        setPinError('PINs do not match.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const parentalControls: Record<string, unknown> = {
        ...currentProfile?.parentalControls,
        maxTVRating,
        maxMovieRating,
        pinEnabled,
      };

      if (pinEnabled && newPin) {
        parentalControls.pin = newPin;
      }

      if (!pinEnabled) {
        parentalControls.pin = undefined;
      }

      await updateProfile({ parentalControls });
      setSaveMessage('Parental controls updated.');
      setNewPin('');
      setConfirmPin('');
    } catch {
      setSaveMessage('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // PIN Verification Gate
  if (!isVerified) {
    return (
      <div className="max-w-sm">
        <section className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Enter PIN
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            A PIN is required to view or change parental controls.
          </p>

          <div className="space-y-4">
            <Input
              label="4-Digit PIN"
              type="password"
              value={pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPinInput(val);
              }}
              placeholder="Enter PIN"
              maxLength={4}
              inputMode="numeric"
              error={verifyError || undefined}
            />

            <Button
              variant="primary"
              onClick={handleVerifyPin}
              disabled={pinInput.length !== 4}
            >
              Verify
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Rating Limits */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Content Ratings
        </h2>

        <div className="space-y-6">
          {/* Max TV Rating */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Maximum TV Rating
            </label>
            <select
              value={maxTVRating}
              onChange={(e) => setMaxTVRating(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TV_RATING_ORDER.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              Content rated above this level will be hidden from this profile.
            </p>
          </div>

          {/* Max Movie Rating */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Maximum Movie Rating
            </label>
            <select
              value={maxMovieRating}
              onChange={(e) => setMaxMovieRating(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {MOVIE_RATING_ORDER.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              Movies rated above this level will be hidden from this profile.
            </p>
          </div>
        </div>
      </section>

      {/* PIN Settings */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          PIN Protection
        </h2>

        <div className="space-y-6">
          {/* PIN Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-text-primary">
                Require PIN
              </label>
              <p className="text-xs text-text-tertiary mt-0.5">
                Require a PIN to access parental control settings.
              </p>
            </div>
            <button
              onClick={() => setPinEnabled(!pinEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                pinEnabled ? 'bg-primary' : 'bg-border'
              }`}
              role="switch"
              aria-checked={pinEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pinEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* PIN Set/Change */}
          {pinEnabled && (
            <div className="space-y-4 border-t border-border pt-4">
              <Input
                label={hasExistingPin ? 'New PIN' : 'Set PIN'}
                type="password"
                value={newPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setNewPin(val);
                }}
                placeholder="4-digit PIN"
                maxLength={4}
                inputMode="numeric"
              />

              <Input
                label="Confirm PIN"
                type="password"
                value={confirmPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setConfirmPin(val);
                }}
                placeholder="Confirm PIN"
                maxLength={4}
                inputMode="numeric"
                error={pinError || undefined}
              />
            </div>
          )}
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
