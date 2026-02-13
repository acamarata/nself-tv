'use client';

import { Check } from 'lucide-react';
import type { QualityLevel } from '@/lib/bba2/algorithm';

interface QualitySelectorProps {
  /** Available quality levels sorted from lowest to highest. */
  levels: QualityLevel[];
  /** Currently active quality level index. */
  currentLevel: number;
  /** Whether auto quality selection is active. */
  autoMode: boolean;
  /** Callback when a quality level or auto mode is selected. */
  onSelectLevel: (level: number | 'auto') => void;
}

/**
 * Settings menu for manual quality level selection.
 *
 * Displays an "Auto" option with the current quality name in parentheses
 * when active, plus a list of all available quality levels showing name
 * and resolution height.
 */
function QualitySelector({
  levels,
  currentLevel,
  autoMode,
  onSelectLevel,
}: QualitySelectorProps) {
  const currentName = levels[currentLevel]?.name ?? '';

  return (
    <div className="bg-surface border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]">
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Quality
        </span>
      </div>

      <ul className="py-1" role="listbox" aria-label="Quality levels">
        <li role="option" aria-selected={autoMode}>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors"
            onClick={() => onSelectLevel('auto')}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              {autoMode && <Check className="w-4 h-4 text-primary" />}
            </span>
            <span>
              Auto
              {autoMode && currentName ? (
                <span className="text-text-muted ml-1">({currentName})</span>
              ) : null}
            </span>
          </button>
        </li>

        {[...levels].reverse().map((level) => {
          const isActive = !autoMode && level.index === currentLevel;

          return (
            <li key={level.index} role="option" aria-selected={isActive}>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors"
                onClick={() => onSelectLevel(level.index)}
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  {isActive && <Check className="w-4 h-4 text-primary" />}
                </span>
                <span>
                  {level.name}
                  <span className="text-text-muted ml-1">{level.height}p</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { QualitySelector };
export type { QualitySelectorProps };
