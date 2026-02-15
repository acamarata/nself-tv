import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from './SettingsScreen';
import { APIProvider } from '../services/APIProvider';
import { AuthProvider } from '../services/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('SettingsScreen', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <APIProvider>
        <AuthProvider>
          <SettingsScreen />
        </AuthProvider>
      </APIProvider>
    );
    expect(container).toBeTruthy();
  });

  it('should display settings title', () => {
    const { getByText } = render(
      <APIProvider>
        <AuthProvider>
          <SettingsScreen />
        </AuthProvider>
      </APIProvider>
    );
    expect(getByText('Settings')).toBeTruthy();
  });

  it('should display playback settings', () => {
    const { getByText } = render(
      <APIProvider>
        <AuthProvider>
          <SettingsScreen />
        </AuthProvider>
      </APIProvider>
    );
    expect(getByText('Playback')).toBeTruthy();
    expect(getByText('Auto-play next episode')).toBeTruthy();
  });

  it('should display downloads settings', () => {
    const { getByText } = render(
      <APIProvider>
        <AuthProvider>
          <SettingsScreen />
        </AuthProvider>
      </APIProvider>
    );
    expect(getByText('Downloads')).toBeTruthy();
    expect(getByText('Download over Wi-Fi only')).toBeTruthy();
  });

  it('should display about section with version', () => {
    const { getByText } = render(
      <APIProvider>
        <AuthProvider>
          <SettingsScreen />
        </AuthProvider>
      </APIProvider>
    );
    expect(getByText('About')).toBeTruthy();
    expect(getByText('Version')).toBeTruthy();
    expect(getByText('0.7.0')).toBeTruthy();
  });

  it('should display user account when logged in', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    await AsyncStorage.setItem('@nself-tv:auth_token', 'test-token');
    await AsyncStorage.setItem('@nself-tv:auth_user', JSON.stringify(mockUser));

    const { getByText } = render(
      <APIProvider>
        <AuthProvider>
          <SettingsScreen />
        </AuthProvider>
      </APIProvider>
    );

    await waitFor(() => {
      expect(getByText('Account')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
    });
  });
});
