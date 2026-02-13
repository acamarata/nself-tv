'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type Hls from 'hls.js';

/** Number of buffering stalls before auto-reverting to auto mode. */
const MAX_BUFFERING_STALLS = 3;

interface UseManualQualityProps {
  /** The HLS.js instance, or null if not yet initialized. */
  hlsInstance: Hls | null;
}

interface UseManualQualityReturn {
  /** Currently selected manual level, or null if auto mode. */
  manualLevel: number | null;
  /** Whether auto quality selection is active. */
  isAutoMode: boolean;
  /** Select a specific quality level or 'auto' for automatic selection. */
  selectQuality: (level: number | 'auto') => void;
  /** Number of buffering stalls while in manual mode. */
  bufferingCount: number;
}

/**
 * Manual quality override hook with automatic revert behavior.
 *
 * Allows explicit quality level selection on the HLS instance.
 * Monitors buffering events and automatically reverts to auto mode
 * after 3 consecutive buffering stalls while in manual mode.
 */
export function useManualQuality({
  hlsInstance,
}: UseManualQualityProps): UseManualQualityReturn {
  const [manualLevel, setManualLevel] = useState<number | null>(null);
  const [bufferingCount, setBufferingCount] = useState(0);
  const bufferingCountRef = useRef(0);

  const isAutoMode = manualLevel === null;

  const selectQuality = useCallback(
    (level: number | 'auto') => {
      if (!hlsInstance) return;

      if (level === 'auto') {
        hlsInstance.currentLevel = -1;
        setManualLevel(null);
        setBufferingCount(0);
        bufferingCountRef.current = 0;
      } else {
        hlsInstance.currentLevel = level;
        setManualLevel(level);
        setBufferingCount(0);
        bufferingCountRef.current = 0;
      }
    },
    [hlsInstance],
  );

  useEffect(() => {
    if (!hlsInstance) return;

    const onBufferStalled = () => {
      if (manualLevel === null) return;

      bufferingCountRef.current += 1;
      const newCount = bufferingCountRef.current;
      setBufferingCount(newCount);

      if (newCount >= MAX_BUFFERING_STALLS) {
        hlsInstance.currentLevel = -1;
        setManualLevel(null);
        setBufferingCount(0);
        bufferingCountRef.current = 0;
      }
    };

    /**
     * HLS.js emits Events.ERROR for buffer stall events.
     * We listen on the 'hlsError' event name and check for buffer stall details.
     */
    const onError = (_event: string, data: { details: string }) => {
      if (data.details === 'bufferStalledError') {
        onBufferStalled();
      }
    };

    hlsInstance.on('hlsError' as never, onError as never);

    return () => {
      hlsInstance.off('hlsError' as never, onError as never);
    };
  }, [hlsInstance, manualLevel]);

  return {
    manualLevel,
    isAutoMode,
    selectQuality,
    bufferingCount,
  };
}
