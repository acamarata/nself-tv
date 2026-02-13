import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ProgramModal } from '@/components/guide/ProgramModal';
import type { Program } from '@/types/dvr';

const mockProgram: Program = {
  id: 'prog-1',
  channelId: 'ch-2',
  title: 'Evening News',
  description: 'The latest headlines and weather.',
  startTime: new Date('2026-02-13T18:00:00Z').toISOString(),
  endTime: new Date('2026-02-13T19:00:00Z').toISOString(),
  genre: 'News',
  isNew: true,
  isLive: false,
  seasonNumber: 3,
  episodeNumber: 12,
};

describe('ProgramModal', () => {
  it('returns null when program is null', () => {
    const { container } = render(
      <ProgramModal program={null} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal when program is provided', () => {
    const { getByTestId } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    expect(getByTestId('program-modal')).toBeDefined();
  });

  it('displays the program title', () => {
    const { getByText } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    expect(getByText('Evening News')).toBeDefined();
  });

  it('displays the program description', () => {
    const { getByText } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    expect(getByText('The latest headlines and weather.')).toBeDefined();
  });

  it('displays the genre', () => {
    const { getByText } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    expect(getByText('News')).toBeDefined();
  });

  it('displays season and episode info', () => {
    const { getByText } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    expect(getByText('Season 3, Episode 12')).toBeDefined();
  });

  it('shows NEW badge for new programs', () => {
    const { getByText } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    expect(getByText('NEW')).toBeDefined();
  });

  it('shows LIVE badge for live programs', () => {
    const liveProgram = { ...mockProgram, isLive: true };
    const { getByText } = render(
      <ProgramModal program={liveProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    expect(getByText('LIVE')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(
      <ProgramModal program={mockProgram} onClose={onClose} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <ProgramModal program={mockProgram} onClose={onClose} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    fireEvent.click(getByTestId('program-modal-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(
      <ProgramModal program={mockProgram} onClose={onClose} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    fireEvent.click(getByTestId('program-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onTune when Tune button is clicked', () => {
    const onTune = vi.fn();
    const { getByText } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={onTune} onRecord={vi.fn()} />,
    );
    fireEvent.click(getByText('Tune'));
    expect(onTune).toHaveBeenCalledWith(mockProgram);
  });

  it('calls onRecord when Record button is clicked', () => {
    const onRecord = vi.fn();
    const { getByText } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={onRecord} />,
    );
    fireEvent.click(getByText('Record'));
    expect(onRecord).toHaveBeenCalledWith(mockProgram);
  });

  it('has correct aria attributes', () => {
    const { getByRole } = render(
      <ProgramModal program={mockProgram} onClose={vi.fn()} onTune={vi.fn()} onRecord={vi.fn()} />,
    );
    const dialog = getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
