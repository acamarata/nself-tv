'use client';

import { AlertTriangle } from 'lucide-react';
import type { PlayerError } from '@/lib/player/error-handler';

interface ErrorOverlayProps {
  /** The player error to display, or null to hide the overlay. */
  error: PlayerError | null;
  /** Callback when the user clicks the retry button. */
  onRetry: () => void;
  /** Callback when the user dismisses the overlay. */
  onDismiss: () => void;
}

/**
 * Full-screen error overlay for the video player.
 *
 * Displays a warning icon, error title, error message, and
 * action buttons for retry (if the error is retryable) and dismiss.
 */
function ErrorOverlay({ error, onRetry, onDismiss }: ErrorOverlayProps) {
  if (!error) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400" />

        <h2 className="text-xl font-semibold text-white">Playback Error</h2>

        <p className="text-sm text-gray-300">{error.message}</p>

        <div className="flex items-center gap-3 mt-2">
          {error.retryable && (
            <button
              type="button"
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
              onClick={onRetry}
            >
              Retry
            </button>
          )}
          <button
            type="button"
            className="px-4 py-2 bg-surface hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-colors"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export { ErrorOverlay };
export type { ErrorOverlayProps };
