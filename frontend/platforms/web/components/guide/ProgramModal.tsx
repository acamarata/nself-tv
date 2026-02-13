'use client';

import { X, Play, Circle, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Program } from '@/types/dvr';

export interface ProgramModalProps {
  /** Program to display details for */
  program: Program | null;
  /** Called when the modal is closed */
  onClose: () => void;
  /** Called when "Tune" is clicked */
  onTune: (program: Program) => void;
  /** Called when "Record" is clicked */
  onRecord: (program: Program) => void;
}

/**
 * Modal showing program details with tune and record action buttons.
 */
function ProgramModal({ program, onClose, onTune, onRecord }: ProgramModalProps) {
  if (!program) return null;

  const startDate = new Date(program.startTime);
  const endDate = new Date(program.endTime);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  const formatTimeStr = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      data-testid="program-modal-overlay"
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Program details: ${program.title}`}
        data-testid="program-modal"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-text-primary truncate">{program.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              {program.isLive && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  LIVE
                </span>
              )}
              {program.isNew && (
                <span className="bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded">
                  NEW
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              {formatTimeStr(startDate)} - {formatTimeStr(endDate)} ({durationMinutes} min)
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Tag className="w-4 h-4 flex-shrink-0" />
            <span>{program.genre}</span>
          </div>

          {program.seasonNumber != null && program.episodeNumber != null && (
            <p className="text-sm text-text-secondary">
              Season {program.seasonNumber}, Episode {program.episodeNumber}
            </p>
          )}

          {program.description && (
            <p className="text-sm text-text-secondary leading-relaxed">{program.description}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => onTune(program)} className="flex-1">
            <Play className="w-4 h-4 mr-2" />
            Tune
          </Button>
          <Button variant="secondary" onClick={() => onRecord(program)} className="flex-1">
            <Circle className="w-4 h-4 mr-2 text-red-500" />
            Record
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ProgramModal };
