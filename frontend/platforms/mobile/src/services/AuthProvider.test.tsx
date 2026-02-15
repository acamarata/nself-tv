import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './AuthProvider';
import { APIProvider } from './APIProvider';

function TestComponent() {
  const { user, isLoading } = useAuth();
  return (
    <>
      <Text testID="loading">{isLoading ? 'loading' : 'loaded'}</Text>
      <Text testID="user">{user ? user.email : 'not-logged-in'}</Text>
    </>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    AsyncStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should provide auth context to children', async () => {
    const { getByTestId } = render(
      <APIProvider>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </APIProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('loaded');
    });

    expect(getByTestId('user').props.children).toBe('not-logged-in');
  });

  it('should restore user from AsyncStorage on mount', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    await AsyncStorage.setItem('@nself-tv:auth_token', 'test-token');
    await AsyncStorage.setItem('@nself-tv:auth_user', JSON.stringify(mockUser));

    const { getByTestId } = render(
      <APIProvider>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </APIProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('test@example.com');
    });
  });

  it('should throw error when useAuth is used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => render(<TestComponent />)).toThrow(
      'useAuth must be used within AuthProvider'
    );

    consoleSpy.mockRestore();
  });
});
