import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EPGGrid } from '@/components/guide/EPGGrid';
import type { LiveChannel, Program } from '@/types/dvr';

const baseTime = new Date('2026-02-13T12:00:00Z');

const mockChannels: LiveChannel[] = [
  {
    id: 'ch-1',
    number: '2',
    name: 'WCBS',
    logoUrl: null,
    genre: 'News',
    signalQuality: 95,
    isFavorite: false,
  },
  {
    id: 'ch-2',
    number: '4',
    name: 'WNBC',
    logoUrl: null,
    genre: 'Drama',
    signalQuality: 88,
    isFavorite: false,
  },
];

const mockPrograms: Program[] = [
  {
    id: 'prog-1',
    channelId: 'ch-1',
    title: 'Morning News',
    description: 'Morning broadcast',
    startTime: new Date('2026-02-13T12:00:00Z').toISOString(),
    endTime: new Date('2026-02-13T13:00:00Z').toISOString(),
    genre: 'News',
    isNew: false,
    isLive: false,
  },
  {
    id: 'prog-2',
    channelId: 'ch-1',
    title: 'Noon Report',
    description: 'Noon news',
    startTime: new Date('2026-02-13T13:00:00Z').toISOString(),
    endTime: new Date('2026-02-13T13:30:00Z').toISOString(),
    genre: 'News',
    isNew: true,
    isLive: false,
  },
  {
    id: 'prog-3',
    channelId: 'ch-2',
    title: 'Crime Files',
    description: 'Detective drama',
    startTime: new Date('2026-02-13T12:00:00Z').toISOString(),
    endTime: new Date('2026-02-13T14:00:00Z').toISOString(),
    genre: 'Drama',
    isNew: false,
    isLive: false,
  },
];

describe('EPGGrid', () => {
  it('renders the grid container', () => {
    const { getByTestId } = render(
      <EPGGrid
        channels={mockChannels}
        programs={mockPrograms}
        timeStart={baseTime.toISOString()}
        slotCount={12}
        onProgramClick={vi.fn()}
      />,
    );
    expect(getByTestId('epg-grid')).toBeDefined();
  });

  it('renders channel sidebar', () => {
    const { getByTestId } = render(
      <EPGGrid
        channels={mockChannels}
        programs={mockPrograms}
        timeStart={baseTime.toISOString()}
        slotCount={12}
        onProgramClick={vi.fn()}
      />,
    );
    expect(getByTestId('channel-sidebar')).toBeDefined();
  });

  it('renders channel rows for each channel', () => {
    const { getByTestId } = render(
      <EPGGrid
        channels={mockChannels}
        programs={mockPrograms}
        timeStart={baseTime.toISOString()}
        slotCount={12}
        onProgramClick={vi.fn()}
      />,
    );
    expect(getByTestId('channel-row-ch-1')).toBeDefined();
    expect(getByTestId('channel-row-ch-2')).toBeDefined();
  });

  it('renders programs within the visible time window', () => {
    const { getByTestId } = render(
      <EPGGrid
        channels={mockChannels}
        programs={mockPrograms}
        timeStart={baseTime.toISOString()}
        slotCount={12}
        onProgramClick={vi.fn()}
      />,
    );
    expect(getByTestId('program-prog-1')).toBeDefined();
    expect(getByTestId('program-prog-2')).toBeDefined();
    expect(getByTestId('program-prog-3')).toBeDefined();
  });

  it('calls onProgramClick when a program is clicked', () => {
    const onProgramClick = vi.fn();
    const { getByTestId } = render(
      <EPGGrid
        channels={mockChannels}
        programs={mockPrograms}
        timeStart={baseTime.toISOString()}
        slotCount={12}
        onProgramClick={onProgramClick}
      />,
    );
    fireEvent.click(getByTestId('program-prog-1'));
    expect(onProgramClick).toHaveBeenCalledWith(mockPrograms[0]);
  });

  it('does not render programs outside the visible time window', () => {
    const futureProgram: Program = {
      id: 'prog-future',
      channelId: 'ch-1',
      title: 'Future Show',
      description: 'Far future',
      startTime: new Date('2026-02-14T12:00:00Z').toISOString(),
      endTime: new Date('2026-02-14T13:00:00Z').toISOString(),
      genre: 'News',
      isNew: false,
      isLive: false,
    };
    const { queryByTestId } = render(
      <EPGGrid
        channels={mockChannels}
        programs={[...mockPrograms, futureProgram]}
        timeStart={baseTime.toISOString()}
        slotCount={4}
        onProgramClick={vi.fn()}
      />,
    );
    expect(queryByTestId('program-prog-future')).toBeNull();
  });

  it('passes selectedChannelId to sidebar', () => {
    const { getByTestId } = render(
      <EPGGrid
        channels={mockChannels}
        programs={mockPrograms}
        timeStart={baseTime.toISOString()}
        slotCount={12}
        selectedChannelId="ch-1"
        onProgramClick={vi.fn()}
      />,
    );
    const channelBtn = getByTestId('channel-ch-1');
    expect(channelBtn.className).toContain('bg-primary/10');
  });

  it('renders with empty channels and programs', () => {
    const { getByTestId } = render(
      <EPGGrid
        channels={[]}
        programs={[]}
        timeStart={baseTime.toISOString()}
        slotCount={12}
        onProgramClick={vi.fn()}
      />,
    );
    expect(getByTestId('epg-grid')).toBeDefined();
  });

  it('renders time slot headers', () => {
    const { container } = render(
      <EPGGrid
        channels={mockChannels}
        programs={mockPrograms}
        timeStart={baseTime.toISOString()}
        slotCount={4}
        onProgramClick={vi.fn()}
      />,
    );
    // Should have 4 time slot divs in the time header
    const timeHeader = container.querySelector('.sticky');
    expect(timeHeader).toBeDefined();
    const slotElements = timeHeader?.querySelectorAll('[style*="width"]');
    expect(slotElements?.length).toBe(4);
  });
});
