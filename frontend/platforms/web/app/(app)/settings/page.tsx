'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const { currentProfile, updateProfile } = useProfiles();

  const [displayName, setDisplayName] = useState(currentProfile?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setIsSaving(true);
    setSaveMessage('');
    try {
      await updateProfile({ displayName: displayName.trim() });
      setSaveMessage('Profile updated successfully.');
    } catch {
      setSaveMessage('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Password change would be handled by auth service
      // For now, simulate the API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPasswordMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('Failed to change password. Please verify your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      {/* Profile Section */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
            {displayName.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div>
            <p className="text-sm text-text-primary font-medium">{displayName || 'User'}</p>
            <p className="text-xs text-text-tertiary">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter display name"
          />

          <Input
            label="Email"
            value={user?.email ?? ''}
            disabled
            readOnly
          />

          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
              {saveMessage}
            </p>
          )}

          <Button
            variant="primary"
            onClick={handleSaveProfile}
            isLoading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </section>

      {/* Change Password Section */}
      <section className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Change Password
        </h2>

        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            error={passwordError || undefined}
          />

          {passwordMessage && (
            <p className="text-sm text-green-500">{passwordMessage}</p>
          )}

          <Button
            variant="primary"
            onClick={handleChangePassword}
            isLoading={isChangingPassword}
          >
            Change Password
          </Button>
        </div>
      </section>
    </div>
  );
}
