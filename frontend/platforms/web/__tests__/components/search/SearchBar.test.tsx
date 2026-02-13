import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/components/search/SearchBar';

describe('SearchBar', () => {
  it('renders input with placeholder', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChange={vi.fn()} placeholder="Search..." />,
    );
    expect(getByPlaceholderText('Search...')).toBeDefined();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <SearchBar value="" onChange={onChange} />,
    );
    fireEvent.change(getByLabelText('Search'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('shows clear button when value is not empty', () => {
    const { getByLabelText } = render(
      <SearchBar value="test" onChange={vi.fn()} />,
    );
    expect(getByLabelText('Clear search')).toBeDefined();
  });

  it('hides clear button when value is empty', () => {
    const { queryByLabelText } = render(
      <SearchBar value="" onChange={vi.fn()} />,
    );
    expect(queryByLabelText('Clear search')).toBeNull();
  });

  it('calls onChange with empty string when clear is clicked', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <SearchBar value="test" onChange={onChange} />,
    );
    fireEvent.click(getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('calls onSubmit on form submit', () => {
    const onSubmit = vi.fn();
    const { getByLabelText } = render(
      <SearchBar value="test" onChange={vi.fn()} onSubmit={onSubmit} />,
    );
    fireEvent.submit(getByLabelText('Search'));
    expect(onSubmit).toHaveBeenCalledWith('test');
  });
});
