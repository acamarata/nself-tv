import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ProgramCell } from '@/components/guide/ProgramCell';
import type { Program } from '@/types/dvr';

const mockProgram: Program = {
  id: 'prog-1',
  channelId: 'ch-1',
  title: 'Evening News',
  description: 'Nightly news broadcast',
  startTime: new Date('2026-02-13T18:00:00Z').toISOString(),
  endTime: new Date('2026-02-13T19:00:00Z').toISOString(),
  genre: 'News',
  isNew: false,
  isLive: false,
};

describe('ProgramCell', () => {
  it('renders the program title', () => {
    const { getByText } = render(
      <ProgramCell program={mockProgram} width={200} isCurrentlyAiring={false} onClick={vi.fn()} />,
    );
    expect(getByText('Evening News')).toBeDefined();
  });

  it('renders with correct width', () => {
    const { getByTestId } = render(
      <ProgramCell program={mockProgram} width={250} isCurrentlyAiring={false} onClick={vi.fn()} />,
    );
    const cell = getByTestId('program-prog-1');
    expect(cell.style.width).toBe('250px');
  });

  it('shows LIVE badge when program is live', () => {
    const liveProgram = { ...mockProgram, isLive: true };
    const { getByText } = render(
      <ProgramCell program={liveProgram} width={200} isCurrentlyAiring={false} onClick={vi.fn()} />,
    );
    expect(getByText('LIVE')).toBeDefined();
  });

  it('shows NEW badge when program is new', () => {
    const newProgram = { ...mockProgram, isNew: true };
    const { getByText } = render(
      <ProgramCell program={newProgram} width={200} isCurrentlyAiring={false} onClick={vi.fn()} />,
    );
    expect(getByText('NEW')).toBeDefined();
  });

  it('does not show NEW badge when program is live (LIVE takes priority)', () => {
    const liveNewProgram = { ...mockProgram, isLive: true, isNew: true };
    const { queryByText } = render(
      <ProgramCell program={liveNewProgram} width={200} isCurrentlyAiring={false} onClick={vi.fn()} />,
    );
    expect(queryByText('NEW')).toBeNull();
    expect(queryByText('LIVE')).toBeDefined();
  });

  it('has ring styling when currently airing', () => {
    const { getByTestId } = render(
      <ProgramCell program={mockProgram} width={200} isCurrentlyAiring={true} onClick={vi.fn()} />,
    );
    const cell = getByTestId('program-prog-1');
    expect(cell.className).toContain('ring-1');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { getByTestId } = render(
      <ProgramCell program={mockProgram} width={200} isCurrentlyAiring={false} onClick={onClick} />,
    );
    fireEvent.click(getByTestId('program-prog-1'));
    expect(onClick).toHaveBeenCalledWith(mockProgram);
  });

  it('has correct genre color for News', () => {
    const { getByTestId } = render(
      <ProgramCell program={mockProgram} width={200} isCurrentlyAiring={false} onClick={vi.fn()} />,
    );
    const cell = getByTestId('program-prog-1');
    expect(cell.className).toContain('bg-blue-600/80');
  });

  it('has correct genre color for Sports', () => {
    const sportsProgram = { ...mockProgram, genre: 'Sports' };
    const { getByTestId } = render(
      <ProgramCell program={sportsProgram} width={200} isCurrentlyAiring={false} onClick={vi.fn()} />,
    );
    const cell = getByTestId(`program-${sportsProgram.id}`);
    expect(cell.className).toContain('bg-green-600/80');
  });

  it('uses default color for unknown genre', () => {
    const unknownGenre = { ...mockProgram, genre: 'Unknown' };
    const { getByTestId } = render(
      <ProgramCell program={unknownGenre} width={200} isCurrentlyAiring={false} onClick={vi.fn()} />,
    );
    const cell = getByTestId(`program-${unknownGenre.id}`);
    expect(cell.className).toContain('bg-gray-600/80');
  });
});
