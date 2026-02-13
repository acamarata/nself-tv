'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeviceCodeResponse, DeviceCodeStatus } from '@/types/auth';
import * as authApi from '@/lib/auth/api';

interface UseDeviceCodeReturn {
  userCode: string | null;
  status: DeviceCodeStatus | 'idle' | 'requesting';
  expiresIn: number;
  error: string | null;
  requestCode: () => Promise<void>;
  reset: () => void;
}

export function useDeviceCode(): UseDeviceCodeReturn {
  const [codeData, setCodeData] = useState<DeviceCodeResponse | null>(null);
  const [status, setStatus] = useState<DeviceCodeStatus | 'idle' | 'requesting'>('idle');
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const requestCode = useCallback(async () => {
    cleanup();
    setStatus('requesting');
    setError(null);

    try {
      const data = await authApi.requestDeviceCode();
      setCodeData(data);
      setStatus('pending');
      setExpiresIn(data.expiresIn);

      // Countdown timer
      timerRef.current = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            cleanup();
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Polling for authorization
      pollRef.current = setInterval(async () => {
        try {
          const result = await authApi.pollDeviceCode(data.deviceCode);
          if (result.status === 'authorized') {
            cleanup();
            setStatus('authorized');
            if (result.tokens) {
              localStorage.setItem('ntv_tokens', JSON.stringify(result.tokens));
            }
            if (result.user) {
              localStorage.setItem('ntv_user', JSON.stringify(result.user));
            }
            window.location.reload();
          } else if (result.status === 'denied') {
            cleanup();
            setStatus('denied');
          } else if (result.status === 'expired') {
            cleanup();
            setStatus('expired');
          }
        } catch {
          // Continue polling on error
        }
      }, (data.interval || 5) * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request device code');
      setStatus('idle');
    }
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setCodeData(null);
    setStatus('idle');
    setExpiresIn(0);
    setError(null);
  }, [cleanup]);

  return {
    userCode: codeData?.userCode || null,
    status,
    expiresIn,
    error,
    requestCode,
    reset,
  };
}
