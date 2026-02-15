import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

export interface DeviceCapabilities {
  deviceId: string;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  touchSupport: boolean;
  maxVideoResolution: '4k' | '1080p' | '720p' | '480p';
  videoCodecs: string[];
  audioCodecs: string[];
  hdrSupport: boolean;
  networkSpeed: 'slow' | 'medium' | 'fast';
  batteryLevel?: number;
  isCharging?: boolean;
  timestamp: string;
}

export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);

  const reportMutation = useMutation({
    mutationFn: async (caps: DeviceCapabilities) => {
      const response = await fetch('/api/v1/telemetry/device-capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caps),
      });
      if (!response.ok) throw new Error('Failed to report capabilities');
      return response.json();
    },
  });

  useEffect(() => {
    const detectCapabilities = async (): Promise<DeviceCapabilities> => {
      // Generate or retrieve device ID
      let deviceId = localStorage.getItem('device-id');
      if (!deviceId) {
        deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem('device-id', deviceId);
      }

      // Detect video codec support
      const videoCodecs: string[] = [];
      const video = document.createElement('video');
      const testCodecs = [
        { name: 'h264', mime: 'video/mp4; codecs="avc1.42E01E"' },
        { name: 'h265', mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' },
        { name: 'vp9', mime: 'video/webm; codecs="vp9"' },
        { name: 'av1', mime: 'video/mp4; codecs="av01.0.05M.08"' },
      ];
      for (const codec of testCodecs) {
        if (video.canPlayType(codec.mime)) {
          videoCodecs.push(codec.name);
        }
      }

      // Detect audio codec support
      const audioCodecs: string[] = [];
      const audio = document.createElement('audio');
      const testAudioCodecs = [
        { name: 'aac', mime: 'audio/mp4; codecs="mp4a.40.2"' },
        { name: 'opus', mime: 'audio/webm; codecs="opus"' },
        { name: 'vorbis', mime: 'audio/webm; codecs="vorbis"' },
      ];
      for (const codec of testAudioCodecs) {
        if (audio.canPlayType(codec.mime)) {
          audioCodecs.push(codec.name);
        }
      }

      // Determine max video resolution based on screen size
      const width = window.screen.width * window.devicePixelRatio;
      const height = window.screen.height * window.devicePixelRatio;
      let maxVideoResolution: '4k' | '1080p' | '720p' | '480p';
      if (width >= 3840 && height >= 2160) {
        maxVideoResolution = '4k';
      } else if (width >= 1920 && height >= 1080) {
        maxVideoResolution = '1080p';
      } else if (width >= 1280 && height >= 720) {
        maxVideoResolution = '720p';
      } else {
        maxVideoResolution = '480p';
      }

      // Detect HDR support (approximation)
      const hdrSupport =
        window.matchMedia('(dynamic-range: high)').matches ||
        window.matchMedia('(color-gamut: p3)').matches;

      // Estimate network speed
      let networkSpeed: 'slow' | 'medium' | 'fast' = 'medium';
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const effectiveType = connection.effectiveType;
          if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            networkSpeed = 'slow';
          } else if (effectiveType === '3g') {
            networkSpeed = 'medium';
          } else {
            networkSpeed = 'fast';
          }
        }
      }

      // Battery status
      let batteryLevel: number | undefined;
      let isCharging: boolean | undefined;
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
          isCharging = battery.charging;
        } catch (e) {
          // Battery API not available or blocked
        }
      }

      return {
        deviceId,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        pixelRatio: window.devicePixelRatio,
        touchSupport: 'ontouchstart' in window,
        maxVideoResolution,
        videoCodecs,
        audioCodecs,
        hdrSupport,
        networkSpeed,
        batteryLevel,
        isCharging,
        timestamp: new Date().toISOString(),
      };
    };

    detectCapabilities().then((caps) => {
      setCapabilities(caps);

      // Report to backend
      reportMutation.mutate(caps);
    });
  }, []);

  return {
    capabilities,
    isReporting: reportMutation.isPending,
    reportError: reportMutation.error,
  };
}
