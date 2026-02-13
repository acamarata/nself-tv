import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlayerKeyboard } from '@/hooks/usePlayerKeyboard';

describe('usePlayerKeyboard', () => {
  const createHandlers = () => ({
    onPlayPause: vi.fn(),
    onSeek: vi.fn(),
    onVolumeChange: vi.fn(),
    onMuteToggle: vi.fn(),
    onFullscreenToggle: vi.fn(),
    onSubtitleToggle: vi.fn(),
    duration: 3600,
    currentTime: 100,
    volume: 0.5,
  });

  let handlers: ReturnType<typeof createHandlers>;

  beforeEach(() => {
    handlers = createHandlers();
  });

  /**
   * Dispatches a keydown event from a specific element (default: document.body).
   * The event bubbles up to the document where the hook's listener is attached.
   */
  function pressKey(key: string, element: HTMLElement = document.body) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
  }

  it('Space key triggers play/pause', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey(' ');

    expect(handlers.onPlayPause).toHaveBeenCalledOnce();
  });

  it('ArrowLeft triggers seek backward by 10 seconds', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('ArrowLeft');

    expect(handlers.onSeek).toHaveBeenCalledWith(90); // 100 - 10
  });

  it('ArrowRight triggers seek forward by 10 seconds', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('ArrowRight');

    expect(handlers.onSeek).toHaveBeenCalledWith(110); // 100 + 10
  });

  it('ArrowLeft clamps to 0 when near beginning', () => {
    handlers.currentTime = 5;
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('ArrowLeft');

    expect(handlers.onSeek).toHaveBeenCalledWith(0);
  });

  it('ArrowRight clamps to duration when near end', () => {
    handlers.currentTime = 3595;
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('ArrowRight');

    expect(handlers.onSeek).toHaveBeenCalledWith(3600);
  });

  it('ArrowUp increases volume by 5%', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('ArrowUp');

    expect(handlers.onVolumeChange).toHaveBeenCalledWith(0.55);
  });

  it('ArrowDown decreases volume by 5%', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('ArrowDown');

    expect(handlers.onVolumeChange).toHaveBeenCalledWith(0.45);
  });

  it('ArrowUp clamps volume to 1', () => {
    handlers.volume = 0.98;
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('ArrowUp');

    expect(handlers.onVolumeChange).toHaveBeenCalledWith(1);
  });

  it('ArrowDown clamps volume to 0', () => {
    handlers.volume = 0.03;
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('ArrowDown');

    expect(handlers.onVolumeChange).toHaveBeenCalledWith(0);
  });

  it('F key toggles fullscreen', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('f');

    expect(handlers.onFullscreenToggle).toHaveBeenCalledOnce();
  });

  it('uppercase F key toggles fullscreen', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('F');

    expect(handlers.onFullscreenToggle).toHaveBeenCalledOnce();
  });

  it('M key toggles mute', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('m');

    expect(handlers.onMuteToggle).toHaveBeenCalledOnce();
  });

  it('uppercase M key toggles mute', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('M');

    expect(handlers.onMuteToggle).toHaveBeenCalledOnce();
  });

  it('C key toggles subtitles', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('c');

    expect(handlers.onSubtitleToggle).toHaveBeenCalledOnce();
  });

  it('uppercase C key toggles subtitles', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('C');

    expect(handlers.onSubtitleToggle).toHaveBeenCalledOnce();
  });

  it('C key does nothing when onSubtitleToggle is not provided', () => {
    const { onSubtitleToggle, ...handlersWithoutSubtitles } = handlers;
    renderHook(() => usePlayerKeyboard(handlersWithoutSubtitles));

    // Should not throw
    pressKey('c');
  });

  it('number key 0 seeks to 0% of duration', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('0');

    expect(handlers.onSeek).toHaveBeenCalledWith(0); // (0/10) * 3600
  });

  it('number key 5 seeks to 50% of duration', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('5');

    expect(handlers.onSeek).toHaveBeenCalledWith(1800); // (5/10) * 3600
  });

  it('number key 9 seeks to 90% of duration', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('9');

    expect(handlers.onSeek).toHaveBeenCalledWith(3240); // (9/10) * 3600
  });

  it('number keys do nothing when duration is 0', () => {
    handlers.duration = 0;
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('5');

    expect(handlers.onSeek).not.toHaveBeenCalled();
  });

  it('ignores keystrokes when an input element is focused', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    const input = document.createElement('input');
    document.body.appendChild(input);

    pressKey(' ', input);

    expect(handlers.onPlayPause).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('ignores keystrokes when a textarea is focused', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    pressKey(' ', textarea);

    expect(handlers.onPlayPause).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('ignores keystrokes when contentEditable is focused', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    // jsdom does not implement isContentEditable, so we polyfill it
    Object.defineProperty(div, 'isContentEditable', { value: true, configurable: true });
    document.body.appendChild(div);

    pressKey(' ', div);

    expect(handlers.onPlayPause).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it('removes event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => usePlayerKeyboard(handlers));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('ignores unrecognized keys', () => {
    renderHook(() => usePlayerKeyboard(handlers));

    pressKey('z');

    expect(handlers.onPlayPause).not.toHaveBeenCalled();
    expect(handlers.onSeek).not.toHaveBeenCalled();
    expect(handlers.onVolumeChange).not.toHaveBeenCalled();
    expect(handlers.onMuteToggle).not.toHaveBeenCalled();
    expect(handlers.onFullscreenToggle).not.toHaveBeenCalled();
    expect(handlers.onSubtitleToggle).not.toHaveBeenCalled();
  });
});
