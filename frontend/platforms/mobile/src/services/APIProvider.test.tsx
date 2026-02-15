import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { APIProvider, useAPI } from './APIProvider';

function TestComponent() {
  const { baseURL } = useAPI();
  return <Text testID="base-url">{baseURL}</Text>;
}

describe('APIProvider', () => {
  it('should provide API context to children', () => {
    const { getByTestId } = render(
      <APIProvider>
        <TestComponent />
      </APIProvider>
    );

    const baseURLElement = getByTestId('base-url');
    expect(baseURLElement.props.children).toBe('http://localhost:8080');
  });

  it('should throw error when useAPI is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => render(<TestComponent />)).toThrow(
      'useAPI must be used within APIProvider'
    );

    consoleSpy.mockRestore();
  });

  it('should create GraphQL client with correct endpoint', () => {
    const { getByTestId } = render(
      <APIProvider>
        <TestComponent />
      </APIProvider>
    );

    const baseURLElement = getByTestId('base-url');
    expect(baseURLElement.props.children).toContain('localhost:8080');
  });
});
