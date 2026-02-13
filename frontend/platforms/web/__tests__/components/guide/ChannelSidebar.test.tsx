import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ChannelSidebar } from '@/components/guide/ChannelSidebar';
import type { LiveChannel } from '@/types/dvr';

const mockChannels: LiveChannel[] = [
  {
    id: 'ch-2',
    number: '2',
    name: 'WCBS',
    logoUrl: null,
    genre: 'News',
    signalQuality: 95,
    isFavorite: true,
  },
  {
    id: 'ch-4',
    number: '4',
    name: 'WNBC',
    logoUrl: '/logos/wnbc.png',
    genre: 'News',
    signalQuality: 88,
    isFavorite: false,
  },
  {
    id: 'ch-5',
    number: '5',
    name: 'FOX 5',
    logoUrl: null,
    genre: 'Drama',
    signalQuality: 72,
    isFavorite: false,
  },
];

describe('ChannelSidebar', () => {
  it('renders the sidebar container', () => {
    const { getByTestId } = render(
      <ChannelSidebar channels={mockChannels} />,
    );
    expect(getByTestId('channel-sidebar')).toBeDefined();
  });

  it('renders all channels', () => {
    const { getByTestId } = render(
      <ChannelSidebar channels={mockChannels} />,
    );
    expect(getByTestId('channel-ch-2')).toBeDefined();
    expect(getByTestId('channel-ch-4')).toBeDefined();
    expect(getByTestId('channel-ch-5')).toBeDefined();
  });

  it('displays channel names', () => {
    const { getByText } = render(
      <ChannelSidebar channels={mockChannels} />,
    );
    expect(getByText('WCBS')).toBeDefined();
    expect(getByText('WNBC')).toBeDefined();
    expect(getByText('FOX 5')).toBeDefined();
  });

  it('shows channel number when no logo', () => {
    const { getByText } = render(
      <ChannelSidebar channels={mockChannels} />,
    );
    expect(getByText('2')).toBeDefined();
  });

  it('shows channel logo image when logoUrl is present', () => {
    const { container } = render(
      <ChannelSidebar channels={mockChannels} />,
    );
    const img = container.querySelector('img[alt="WNBC"]');
    expect(img).toBeDefined();
    expect(img?.getAttribute('src')).toBe('/logos/wnbc.png');
  });

  it('shows star icon for favorite channels', () => {
    const { getByTestId } = render(
      <ChannelSidebar channels={mockChannels} />,
    );
    // WCBS is favorite, check for star within its button
    const wcbsBtn = getByTestId('channel-ch-2');
    const star = wcbsBtn.querySelector('svg');
    expect(star).toBeDefined();
  });

  it('highlights selected channel', () => {
    const { getByTestId } = render(
      <ChannelSidebar channels={mockChannels} selectedChannelId="ch-4" />,
    );
    const selected = getByTestId('channel-ch-4');
    expect(selected.className).toContain('bg-primary/10');
  });

  it('calls onChannelClick when a channel is clicked', () => {
    const onChannelClick = vi.fn();
    const { getByTestId } = render(
      <ChannelSidebar channels={mockChannels} onChannelClick={onChannelClick} />,
    );
    fireEvent.click(getByTestId('channel-ch-5'));
    expect(onChannelClick).toHaveBeenCalledWith(mockChannels[2]);
  });

  it('renders with empty channels array', () => {
    const { getByTestId } = render(
      <ChannelSidebar channels={[]} />,
    );
    expect(getByTestId('channel-sidebar')).toBeDefined();
  });
});
