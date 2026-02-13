'use client';

import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { QualityToast as QualityToastData, ToastType } from '@/hooks/useQualityMonitor';

interface QualityToastProps {
  /** The toast data to display, or null to hide. */
  toast: QualityToastData | null;
  /** Callback when the toast is dismissed (manually or by auto-dismiss). */
  onDismiss: () => void;
}

/** Auto-dismiss timeout in milliseconds. */
const AUTO_DISMISS_MS = 5_000;

const TOAST_ICONS: Record<ToastType, typeof ChevronDown> = {
  downgrade: ChevronDown,
  recovery: ChevronUp,
  'sustained-low': AlertTriangle,
};

const TOAST_COLORS: Record<ToastType, string> = {
  downgrade: 'text-yellow-400',
  recovery: 'text-green-400',
  'sustained-low': 'text-red-400',
};

/**
 * Displays a quality change notification toast in the top-right
 * corner of the player. Auto-dismisses after 5 seconds.
 */
function QualityToast({ toast, onDismiss }: QualityToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (toast) {
      timerRef.current = setTimeout(() => {
        onDismiss();
        timerRef.current = null;
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  const Icon = TOAST_ICONS[toast.type];
  const iconColor = TOAST_COLORS[toast.type];

  return (
    <div className="absolute top-4 right-4 z-50">
      <div
        className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white shadow-lg"
        role="status"
        aria-live="polite"
      >
        <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
        <span>{toast.message}</span>
        <button
          type="button"
          className="ml-1 text-text-muted hover:text-white transition-colors"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export { QualityToast };
export type { QualityToastProps };
