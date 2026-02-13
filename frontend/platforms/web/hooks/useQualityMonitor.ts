'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { QualityLevel } from '@/lib/bba2/algorithm';

export type ToastType = 'downgrade' | 'recovery' | 'sustained-low';

export interface QualityToast {
  /** Type of quality change notification. */
  type: ToastType;
  /** Human-readable message describing the quality change. */
  message: string;
  /** Name of the current quality level. */
  level: string;
}

/** Duration in milliseconds before a downgrade toast is emitted. */
const DOWNGRADE_THRESHOLD_MS = 10_000;

/** Duration in milliseconds before a sustained-low toast is emitted. */
const SUSTAINED_LOW_THRESHOLD_MS = 60_000;

interface UseQualityMonitorProps {
  /** Current quality level index. */
  currentLevel: number;
  /** User's preferred quality level index. */
  preferredLevel: number;
  /** Available quality levels. */
  levels: QualityLevel[];
}

interface UseQualityMonitorReturn {
  /** Current toast notification, or null if none active. */
  toast: QualityToast | null;
  /** Dismiss the current toast. */
  dismissToast: () => void;
}

/**
 * Monitors quality level changes and produces toast notifications
 * when quality drops below the preferred level, sustains low, or recovers.
 */
export function useQualityMonitor({
  currentLevel,
  preferredLevel,
  levels,
}: UseQualityMonitorProps): UseQualityMonitorReturn {
  const [toast, setToast] = useState<QualityToast | null>(null);

  const downgradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sustainedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasDowngradedRef = useRef(false);
  const downgradeToastShownRef = useRef(false);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    const currentName = levels[currentLevel]?.name ?? `Level ${currentLevel}`;
    const isBelowPreferred = currentLevel < preferredLevel;

    if (isBelowPreferred && !wasDowngradedRef.current) {
      wasDowngradedRef.current = true;
      downgradeToastShownRef.current = false;

      downgradeTimerRef.current = setTimeout(() => {
        downgradeToastShownRef.current = true;
        setToast({
          type: 'downgrade',
          message: `Quality reduced to ${currentName}`,
          level: currentName,
        });
      }, DOWNGRADE_THRESHOLD_MS);

      sustainedTimerRef.current = setTimeout(() => {
        setToast({
          type: 'sustained-low',
          message: `Quality has been at ${currentName} for over a minute`,
          level: currentName,
        });
      }, SUSTAINED_LOW_THRESHOLD_MS);
    } else if (isBelowPreferred && wasDowngradedRef.current) {
      if (downgradeToastShownRef.current) {
        setToast({
          type: 'downgrade',
          message: `Quality reduced to ${currentName}`,
          level: currentName,
        });
      }
    } else if (!isBelowPreferred && wasDowngradedRef.current) {
      wasDowngradedRef.current = false;
      downgradeToastShownRef.current = false;

      if (downgradeTimerRef.current) {
        clearTimeout(downgradeTimerRef.current);
        downgradeTimerRef.current = null;
      }
      if (sustainedTimerRef.current) {
        clearTimeout(sustainedTimerRef.current);
        sustainedTimerRef.current = null;
      }

      setToast({
        type: 'recovery',
        message: `Quality restored to ${currentName}`,
        level: currentName,
      });
    }

    return () => {
      if (downgradeTimerRef.current) {
        clearTimeout(downgradeTimerRef.current);
        downgradeTimerRef.current = null;
      }
      if (sustainedTimerRef.current) {
        clearTimeout(sustainedTimerRef.current);
        sustainedTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- levels.length is sufficient; avoids infinite loop from inline array references
  }, [currentLevel, preferredLevel, levels.length]);

  return { toast, dismissToast };
}
