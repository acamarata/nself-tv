import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlayerScreen } from './PlayerScreen';
import type { RootStackParamList } from '../navigation/RootNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

function TestNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          initialParams={{ mediaId: 'test-123', title: 'Test Video' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('PlayerScreen', () => {
  it('should render without crashing', () => {
    const { container } = render(<TestNavigator />);
    expect(container).toBeTruthy();
  });

  it('should display video title from params', () => {
    const { getByText } = render(<TestNavigator />);
    expect(getByText('Test Video')).toBeTruthy();
  });

  it('should display close button', () => {
    const { getByText } = render(<TestNavigator />);
    expect(getByText('✕')).toBeTruthy();
  });

  it('should display play/pause button', () => {
    const { getByText } = render(<TestNavigator />);
    // Initially paused=false, so should show pause icon
    expect(getByText('⏸')).toBeTruthy();
  });
});
