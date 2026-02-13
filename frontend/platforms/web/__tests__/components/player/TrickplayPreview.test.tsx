import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TrickplayPreview } from '@/components/player/TrickplayPreview';
import type { TrickplayCue } from '@/lib/trickplay/loader';

function makeCue(overrides: Partial<TrickplayCue> = {}): TrickplayCue {
  return {
    startTime: 10,
    endTime: 20,
    spriteUrl: 'https://example.com/sprites/sheet-0.jpg',
    x: 320,
    y: 180,
    ...overrides,
  };
}

describe('TrickplayPreview', () => {
  it('returns null when cue is null', () => {
    const { container } = render(
      <TrickplayPreview cue={null} position={{ x: 200, y: 300 }} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when cue is provided', () => {
    const cue = makeCue();
    const { container } = render(
      <TrickplayPreview cue={cue} position={{ x: 200, y: 300 }} />,
    );
    expect(container.innerHTML).not.toBe('');
  });

  it('positions the preview based on x/y position props with default tile size', () => {
    const cue = makeCue();
    const { container } = render(
      <TrickplayPreview cue={cue} position={{ x: 200, y: 300 }} />,
    );
    const outer = container.firstChild as HTMLElement;
    // Default tileWidth=160, tileHeight=90
    // left = 200 - 160/2 = 120
    // top = 300 - 90 - 12 = 198
    expect(outer.style.left).toBe('120px');
    expect(outer.style.top).toBe('198px');
    expect(outer.style.width).toBe('160px');
    expect(outer.style.height).toBe('90px');
  });

  it('applies sprite background image', () => {
    const cue = makeCue({ spriteUrl: 'https://example.com/sprites/sheet-1.jpg' });
    const { container } = render(
      <TrickplayPreview cue={cue} position={{ x: 100, y: 200 }} />,
    );
    const inner = container.querySelector('.overflow-hidden') as HTMLElement;
    expect(inner.style.backgroundImage).toContain('https://example.com/sprites/sheet-1.jpg');
  });

  it('applies sprite x/y offset as background-position with scaling', () => {
    // Source tile: 320x180, display tile (default): 160x90
    // Scale: 160/320 = 0.5 for X, 90/180 = 0.5 for Y
    // Cue x=640, y=360 => bgPosX=320, bgPosY=180
    const cue = makeCue({ x: 640, y: 360 });
    const { container } = render(
      <TrickplayPreview cue={cue} position={{ x: 100, y: 200 }} />,
    );
    const inner = container.querySelector('.overflow-hidden') as HTMLElement;
    expect(inner.style.backgroundPosition).toBe('-320px -180px');
  });

  it('applies zero offset when cue x and y are zero', () => {
    const cue = makeCue({ x: 0, y: 0 });
    const { container } = render(
      <TrickplayPreview cue={cue} position={{ x: 100, y: 200 }} />,
    );
    const inner = container.querySelector('.overflow-hidden') as HTMLElement;
    // jsdom normalizes -0px to 0px
    expect(inner.style.backgroundPosition).toBe('0px 0px');
  });

  it('renders at correct position with custom tile dimensions', () => {
    const cue = makeCue({ x: 320, y: 180 });
    const { container } = render(
      <TrickplayPreview
        cue={cue}
        position={{ x: 400, y: 500 }}
        tileWidth={320}
        tileHeight={180}
      />,
    );
    const outer = container.firstChild as HTMLElement;
    // left = 400 - 320/2 = 240
    // top = 500 - 180 - 12 = 308
    expect(outer.style.left).toBe('240px');
    expect(outer.style.top).toBe('308px');
    expect(outer.style.width).toBe('320px');
    expect(outer.style.height).toBe('180px');

    // Scale: 320/320 = 1, 180/180 = 1
    // bgPosX = 320 * 1 = 320, bgPosY = 180 * 1 = 180
    const inner = container.querySelector('.overflow-hidden') as HTMLElement;
    expect(inner.style.backgroundPosition).toBe('-320px -180px');
  });

  it('sets background-size based on tile height', () => {
    const cue = makeCue();
    const { container } = render(
      <TrickplayPreview cue={cue} position={{ x: 100, y: 200 }} />,
    );
    const inner = container.querySelector('.overflow-hidden') as HTMLElement;
    // Default tileHeight = 90
    expect(inner.style.backgroundSize).toBe('auto 90px');
  });

  it('sets background-size with custom tile height', () => {
    const cue = makeCue();
    const { container } = render(
      <TrickplayPreview
        cue={cue}
        position={{ x: 100, y: 200 }}
        tileHeight={180}
      />,
    );
    const inner = container.querySelector('.overflow-hidden') as HTMLElement;
    expect(inner.style.backgroundSize).toBe('auto 180px');
  });
});
