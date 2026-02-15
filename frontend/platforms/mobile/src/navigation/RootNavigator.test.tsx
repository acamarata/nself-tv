import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './RootNavigator';

jest.mock('../screens/HomeScreen', () => ({
  HomeScreen: () => null,
}));

jest.mock('../screens/SearchScreen', () => ({
  SearchScreen: () => null,
}));

jest.mock('../screens/LibraryScreen', () => ({
  LibraryScreen: () => null,
}));

jest.mock('../screens/SettingsScreen', () => ({
  SettingsScreen: () => null,
}));

jest.mock('../screens/PlayerScreen', () => ({
  PlayerScreen: () => null,
}));

describe('RootNavigator', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );
    expect(container).toBeTruthy();
  });
});
