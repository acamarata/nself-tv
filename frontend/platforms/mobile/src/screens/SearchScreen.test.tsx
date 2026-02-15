import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchScreen } from './SearchScreen';

describe('SearchScreen', () => {
  it('should render without crashing', () => {
    const { container } = render(<SearchScreen />);
    expect(container).toBeTruthy();
  });

  it('should display search title', () => {
    const { getByText } = render(<SearchScreen />);
    expect(getByText('Search')).toBeTruthy();
  });

  it('should display search input', () => {
    const { getByPlaceholderText } = render(<SearchScreen />);
    expect(getByPlaceholderText('Search media...')).toBeTruthy();
  });

  it('should update query when typing in search input', () => {
    const { getByPlaceholderText, getByDisplayValue } = render(<SearchScreen />);
    const input = getByPlaceholderText('Search media...');

    fireEvent.changeText(input, 'test query');

    expect(getByDisplayValue('test query')).toBeTruthy();
  });

  it('should show popular searches when query is empty', () => {
    const { getByText } = render(<SearchScreen />);
    expect(getByText('Popular Searches')).toBeTruthy();
  });

  it('should show results placeholder when query is not empty', () => {
    const { getByPlaceholderText, getByText } = render(<SearchScreen />);
    const input = getByPlaceholderText('Search media...');

    fireEvent.changeText(input, 'test');

    expect(getByText('Search results will appear here')).toBeTruthy();
  });
});
