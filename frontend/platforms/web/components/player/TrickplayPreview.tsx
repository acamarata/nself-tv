'use client';

import type { TrickplayCue } from '@/lib/trickplay/loader';

interface TrickplayPreviewProps {
  /** The trickplay cue to display, or null to hide the preview */
  cue: TrickplayCue | null;
  /** Position of the preview relative to the player container */
  position: { x: number; y: number };
  /** Display width of the thumbnail in pixels (default: 160) */
  tileWidth?: number;
  /** Display height of the thumbnail in pixels (default: 90) */
  tileHeight?: number;
}

/** Source tile dimensions from the sprite sheet (standard trickplay size) */
const SOURCE_TILE_WIDTH = 320;
const SOURCE_TILE_HEIGHT = 180;

/**
 * Renders a thumbnail preview during seek scrubbing.
 *
 * Uses CSS background-image and background-position to extract the correct
 * tile from a sprite sheet image. The sprite is scaled down from the source
 * tile size (320x180) to the display size, and background-position is adjusted
 * to offset to the correct tile within the sheet.
 *
 * Positioned absolutely above the timeline, centered on the seek cursor.
 */
export function TrickplayPreview({
  cue,
  position,
  tileWidth = 160,
  tileHeight = 90,
}: TrickplayPreviewProps) {
  if (!cue) return null;

  // Scale factor from source tile dimensions to display dimensions
  const scaleX = tileWidth / SOURCE_TILE_WIDTH;
  const scaleY = tileHeight / SOURCE_TILE_HEIGHT;

  // Scale the background-position to match the scaled background-size
  const bgPosX = cue.x * scaleX;
  const bgPosY = cue.y * scaleY;

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: position.x - tileWidth / 2,
        top: position.y - tileHeight - 12,
        width: tileWidth,
        height: tileHeight,
      }}
    >
      <div
        className="h-full w-full overflow-hidden rounded border-2 border-white shadow-lg"
        style={{
          backgroundImage: `url(${cue.spriteUrl})`,
          backgroundPosition: `-${bgPosX}px -${bgPosY}px`,
          backgroundSize: `auto ${tileHeight}px`,
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  );
}
