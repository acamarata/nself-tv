import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ProfileSelector } from '@/components/profile/ProfileSelector';
import type { Profile } from '@/types/profile';

const mockProfiles: Profile[] = [
  {
    id: 'p1',
    displayName: 'Alice',
    avatarUrl: null,
    role: 'owner',
    isChild: false,
    parentalControls: { maxTvRating: 'TV-MA', maxMovieRating: 'NC-17', pin: null },
    preferences: { subtitleLanguage: null, audioLanguage: null, autoPlayNext: true },
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'p2',
    displayName: 'Bob',
    avatarUrl: '/bob.jpg',
    role: 'helper',
    isChild: false,
    parentalControls: { maxTvRating: 'TV-14', maxMovieRating: 'PG-13', pin: null },
    preferences: { subtitleLanguage: null, audioLanguage: null, autoPlayNext: true },
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('ProfileSelector', () => {
  it('renders "Who\'s watching?" heading', () => {
    const { getByText } = render(
      <ProfileSelector profiles={mockProfiles} onSelect={vi.fn()} onAddNew={vi.fn()} />,
    );
    expect(getByText("Who's watching?")).toBeDefined();
  });

  it('renders all profile names', () => {
    const { getByText } = render(
      <ProfileSelector profiles={mockProfiles} onSelect={vi.fn()} onAddNew={vi.fn()} />,
    );
    expect(getByText('Alice')).toBeDefined();
    expect(getByText('Bob')).toBeDefined();
  });

  it('calls onSelect when a profile is clicked', () => {
    const onSelect = vi.fn();
    const { getByText } = render(
      <ProfileSelector profiles={mockProfiles} onSelect={onSelect} onAddNew={vi.fn()} />,
    );
    fireEvent.click(getByText('Alice'));
    expect(onSelect).toHaveBeenCalledWith(mockProfiles[0]);
  });

  it('renders Add Profile button', () => {
    const { getByText } = render(
      <ProfileSelector profiles={mockProfiles} onSelect={vi.fn()} onAddNew={vi.fn()} />,
    );
    expect(getByText('Add Profile')).toBeDefined();
  });

  it('calls onAddNew when Add Profile is clicked', () => {
    const onAddNew = vi.fn();
    const { getByText } = render(
      <ProfileSelector profiles={mockProfiles} onSelect={vi.fn()} onAddNew={onAddNew} />,
    );
    fireEvent.click(getByText('Add Profile'));
    expect(onAddNew).toHaveBeenCalled();
  });
});
