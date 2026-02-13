import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LivePlayer } from '@/components/player/LivePlayer';
import type { LivePlayerProps, LiveMetadata } from '@/components/player/LivePlayer';
import type { CommercialMarker } from '@/types/dvr';

const defaultMetadata: LiveMetadata = {
  channelName: 'FOX 5',
  channelNumber: '5',
  programTitle: 'NFL Sunday',
};

function makeProps(overrides: Partial<LivePlayerProps> = {}): LivePlayerProps {
  return {
    playing: true,
    buffering: false,
    currentTime: 100,
    bufferDuration: 21600,
    liveEdge: 110,
    volume: 0.8,
    muted: false,
    fullscreen: false,
    metadata: defaultMetadata,
    commercialMarkers: [],
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onSeek: vi.fn(),
    onJumpToLive: vi.fn(),
    onVolumeChange: vi.fn(),
    onMuteToggle: vi.fn(),
    onFullscreenToggle: vi.fn(),
    onCommercialSkip: vi.fn(),
    ...overrides,
  };
}

describe('LivePlayer', () => {
  it('renders the live player container', () => {
    const { getByTestId } = render(<LivePlayer {...makeProps()} />);
    expect(getByTestId('live-player')).toBeDefined();
  });

  it('shows LIVE badge when at live edge', () => {
    const { getByTestId } = render(
      <LivePlayer {...makeProps({ currentTime: 105, liveEdge: 110 })} />,
    );
    const badge = getByTestId('live-badge');
    expect(badge.textContent).toContain('LIVE');
  });

  it('shows DELAYED badge when behind live edge', () => {
    const { getByTestId } = render(
      <LivePlayer {...makeProps({ currentTime: 50, liveEdge: 110 })} />,
    );
    const badge = getByTestId('live-badge');
    expect(badge.textContent).toContain('DELAYED');
  });

  it('shows Jump to Live button when behind live edge', () => {
    const { getByTestId } = render(
      <LivePlayer {...makeProps({ currentTime: 50, liveEdge: 110 })} />,
    );
    expect(getByTestId('jump-to-live')).toBeDefined();
  });

  it('hides Jump to Live button when at live edge', () => {
    const { queryByTestId } = render(
      <LivePlayer {...makeProps({ currentTime: 105, liveEdge: 110 })} />,
    );
    expect(queryByTestId('jump-to-live')).toBeNull();
  });

  it('calls onJumpToLive when Jump to Live is clicked', () => {
    const onJumpToLive = vi.fn();
    const { getByTestId } = render(
      <LivePlayer {...makeProps({ currentTime: 50, liveEdge: 110, onJumpToLive })} />,
    );
    fireEvent.click(getByTestId('jump-to-live'));
    expect(onJumpToLive).toHaveBeenCalledOnce();
  });

  it('displays channel name and program title', () => {
    const { getByTestId } = render(<LivePlayer {...makeProps()} />);
    const metadataBar = getByTestId('metadata-bar');
    expect(metadataBar.textContent).toContain('FOX 5');
    expect(metadataBar.textContent).toContain('NFL Sunday');
  });

  it('displays sports score when teams are provided', () => {
    const props = makeProps({
      metadata: {
        ...defaultMetadata,
        teams: { home: 'Eagles', away: 'Cowboys' },
        score: { home: 24, away: 17 },
      },
    });
    const { getByTestId } = render(<LivePlayer {...props} />);
    const scoreDisplay = getByTestId('score-display');
    expect(scoreDisplay.textContent).toContain('Eagles');
    expect(scoreDisplay.textContent).toContain('Cowboys');
    expect(scoreDisplay.textContent).toContain('24');
    expect(scoreDisplay.textContent).toContain('17');
  });

  it('shows buffering spinner when buffering', () => {
    const { container } = render(
      <LivePlayer {...makeProps({ buffering: true })} />,
    );
    // Loader2 from lucide renders an svg with animate-spin class
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  it('shows center play button when paused and not buffering', () => {
    const { getAllByLabelText } = render(
      <LivePlayer {...makeProps({ playing: false, buffering: false })} />,
    );
    // There are two "Play" buttons: center and control bar
    expect(getAllByLabelText('Play').length).toBeGreaterThan(0);
  });

  it('calls onPlay when center play button is clicked', () => {
    const onPlay = vi.fn();
    const { getAllByLabelText } = render(
      <LivePlayer {...makeProps({ playing: false, buffering: false, onPlay })} />,
    );
    // First "Play" is center button, second is control bar
    fireEvent.click(getAllByLabelText('Play')[0]);
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('calls onPause when pause button is clicked', () => {
    const onPause = vi.fn();
    const { getByLabelText } = render(
      <LivePlayer {...makeProps({ playing: true, onPause })} />,
    );
    fireEvent.click(getByLabelText('Pause'));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('calls onMuteToggle when mute button is clicked', () => {
    const onMuteToggle = vi.fn();
    const { getByLabelText } = render(
      <LivePlayer {...makeProps({ onMuteToggle })} />,
    );
    fireEvent.click(getByLabelText('Mute'));
    expect(onMuteToggle).toHaveBeenCalledOnce();
  });

  it('calls onFullscreenToggle when fullscreen button is clicked', () => {
    const onFullscreenToggle = vi.fn();
    const { getByLabelText } = render(
      <LivePlayer {...makeProps({ onFullscreenToggle })} />,
    );
    fireEvent.click(getByLabelText('Fullscreen'));
    expect(onFullscreenToggle).toHaveBeenCalledOnce();
  });

  it('shows behind-live time when not at live edge', () => {
    const { getByTestId } = render(
      <LivePlayer {...makeProps({ currentTime: 50, liveEdge: 110 })} />,
    );
    expect(getByTestId('behind-live')).toBeDefined();
  });

  it('hides behind-live time when at live edge', () => {
    const { queryByTestId } = render(
      <LivePlayer {...makeProps({ currentTime: 105, liveEdge: 110 })} />,
    );
    expect(queryByTestId('behind-live')).toBeNull();
  });

  it('shows skip prompt for medium-confidence commercials', () => {
    const markers: CommercialMarker[] = [
      { startMs: 99000, endMs: 120000, confidence: 0.8, source: 'comskip' },
    ];
    const { getByTestId } = render(
      <LivePlayer {...makeProps({ currentTime: 100, commercialMarkers: markers })} />,
    );
    expect(getByTestId('skip-prompt')).toBeDefined();
  });

  it('auto-skips high-confidence commercials', () => {
    const onSeek = vi.fn();
    const onCommercialSkip = vi.fn();
    const markers: CommercialMarker[] = [
      { startMs: 99000, endMs: 120000, confidence: 0.95, source: 'comskip' },
    ];
    render(
      <LivePlayer
        {...makeProps({
          currentTime: 100,
          commercialMarkers: markers,
          onSeek,
          onCommercialSkip,
        })}
      />,
    );
    expect(onSeek).toHaveBeenCalledWith(120);
    expect(onCommercialSkip).toHaveBeenCalledWith(markers[0]);
  });

  it('skips commercial when skip button is clicked', () => {
    const onSeek = vi.fn();
    const onCommercialSkip = vi.fn();
    const markers: CommercialMarker[] = [
      { startMs: 99000, endMs: 120000, confidence: 0.8, source: 'comskip' },
    ];
    const { getByLabelText } = render(
      <LivePlayer
        {...makeProps({
          currentTime: 100,
          commercialMarkers: markers,
          onSeek,
          onCommercialSkip,
        })}
      />,
    );
    fireEvent.click(getByLabelText('Skip commercial'));
    expect(onSeek).toHaveBeenCalledWith(120);
    expect(onCommercialSkip).toHaveBeenCalledWith(markers[0]);
  });

  it('displays unmute label when muted', () => {
    const { getByLabelText } = render(
      <LivePlayer {...makeProps({ muted: true })} />,
    );
    expect(getByLabelText('Unmute')).toBeDefined();
  });

  it('displays exit fullscreen label when in fullscreen', () => {
    const { getByLabelText } = render(
      <LivePlayer {...makeProps({ fullscreen: true })} />,
    );
    expect(getByLabelText('Exit fullscreen')).toBeDefined();
  });
});
