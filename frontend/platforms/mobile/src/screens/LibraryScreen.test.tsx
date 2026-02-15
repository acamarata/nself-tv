import React from 'react';
import { render } from '@testing-library/react-native';
import { LibraryScreen } from './LibraryScreen';

describe('LibraryScreen', () => {
  it('should render without crashing', () => {
    const { container } = render(<LibraryScreen />);
    expect(container).toBeTruthy();
  });

  it('should display library title', () => {
    const { getByText } = render(<LibraryScreen />);
    expect(getByText('Library')).toBeTruthy();
  });

  it('should display library sections', () => {
    const { getByText } = render(<LibraryScreen />);
    expect(getByText('Downloads')).toBeTruthy();
    expect(getByText('Favorites')).toBeTruthy();
    expect(getByText('Watch Later')).toBeTruthy();
  });

  it('should display placeholders for each section', () => {
    const { getByText } = render(<LibraryScreen />);
    expect(getByText('Downloaded content will appear here')).toBeTruthy();
    expect(getByText('Favorite content will appear here')).toBeTruthy();
    expect(getByText('Saved content will appear here')).toBeTruthy();
  });
});
