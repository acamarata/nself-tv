import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <NavigationContainer>
        <HomeScreen />
      </NavigationContainer>
    );
    expect(container).toBeTruthy();
  });

  it('should display app title', () => {
    const { getByText } = render(
      <NavigationContainer>
        <HomeScreen />
      </NavigationContainer>
    );
    expect(getByText('nself-tv')).toBeTruthy();
  });

  it('should display content sections', () => {
    const { getByText } = render(
      <NavigationContainer>
        <HomeScreen />
      </NavigationContainer>
    );
    expect(getByText('Continue Watching')).toBeTruthy();
    expect(getByText('Recommended')).toBeTruthy();
    expect(getByText('Trending')).toBeTruthy();
  });

  it('should display demo play button', () => {
    const { getByText } = render(
      <NavigationContainer>
        <HomeScreen />
      </NavigationContainer>
    );
    expect(getByText('Play Demo Video')).toBeTruthy();
  });
});
