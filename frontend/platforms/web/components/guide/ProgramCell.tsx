'use client';

import type { Program } from '@/types/dvr';

/** Genre color map for visual distinction */
const GENRE_COLORS: Record<string, string> = {
  News: 'bg-blue-600/80',
  Sports: 'bg-green-600/80',
  Movie: 'bg-purple-600/80',
  Comedy: 'bg-yellow-600/80',
  Drama: 'bg-red-600/80',
  Documentary: 'bg-teal-600/80',
  Kids: 'bg-orange-600/80',
  Music: 'bg-pink-600/80',
};

const DEFAULT_GENRE_COLOR = 'bg-gray-600/80';

export interface ProgramCellProps {
  /** The program to display */
  program: Program;
  /** Width in pixels based on duration vs slot size */
  width: number;
  /** Whether this program is currently airing */
  isCurrentlyAiring: boolean;
  /** Called when the program cell is clicked */
  onClick: (program: Program) => void;
}

/**
 * Single program block in the EPG grid.
 * Colored by genre, shows title, and indicates live/new status.
 */
function ProgramCell({ program, width, isCurrentlyAiring, onClick }: ProgramCellProps) {
  const genreColor = GENRE_COLORS[program.genre] ?? DEFAULT_GENRE_COLOR;

  return (
    <button
      type="button"
      className={`${genreColor} h-12 rounded px-2 flex items-center gap-1 overflow-hidden cursor-pointer hover:brightness-110 transition-all border ${
        isCurrentlyAiring ? 'border-primary ring-1 ring-primary' : 'border-transparent'
      }`}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
      onClick={() => onClick(program)}
      title={`${program.title} (${program.genre})`}
      data-testid={`program-${program.id}`}
    >
      <span className="text-white text-xs font-medium truncate">{program.title}</span>
      {program.isLive && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1 rounded flex-shrink-0">
          LIVE
        </span>
      )}
      {program.isNew && !program.isLive && (
        <span className="bg-yellow-500 text-black text-[10px] font-bold px-1 rounded flex-shrink-0">
          NEW
        </span>
      )}
    </button>
  );
}

export { ProgramCell };
