/**
 * EmulatorJS web-based game emulator
 * Supports: NES, SNES, GB, GBA, N64, PS1, Genesis, and more
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Maximize2, Volume2, VolumeX, Save, Upload, Settings, X } from 'lucide-react';

interface EmulatorPlayerProps {
  romUrl: string;
  systemCore: string; // 'nes', 'snes', 'gba', 'n64', 'psx', etc.
  onSaveState?: (slot: number, data: Blob) => void;
  onLoadState?: (slot: number) => Promise<Blob | null>;
  onExit?: () => void;
}

export function EmulatorPlayer({
  romUrl,
  systemCore,
  onSaveState,
  onLoadState,
  onExit,
}: EmulatorPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // EmulatorJS instance
  const emulatorRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load EmulatorJS script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/loader.js';
    script.async = true;

    script.onload = () => {
      initializeEmulator();
    };

    script.onerror = () => {
      setError('Failed to load emulator. Please check your internet connection.');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (emulatorRef.current) {
        emulatorRef.current.destroy?.();
      }
    };
  }, [romUrl, systemCore]);

  const initializeEmulator = () => {
    if (!containerRef.current || !(window as any).EJS) {
      setError('Emulator failed to initialize');
      setIsLoading(false);
      return;
    }

    try {
      const EJS = (window as any).EJS;

      // Configure EmulatorJS
      EJS.core = systemCore;
      EJS.gameUrl = romUrl;
      EJS.pathtodata = 'https://cdn.jsdelivr.net/npm/emulatorjs@latest/data/';

      // Customization
      EJS.color = '#667eea';
      EJS.backgroundColor = '#000000';

      // Control settings
      EJS.volume = isMuted ? 0 : 0.5;
      EJS.mute = isMuted;

      // Start emulator
      EJS.startEmulator(containerRef.current);

      emulatorRef.current = EJS;

      // Set loading to false once initialized
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    } catch (err) {
      console.error('Emulator initialization error:', err);
      setError('Failed to start emulator');
      setIsLoading(false);
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMute = () => {
    if (!emulatorRef.current) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (emulatorRef.current.setVolume) {
      emulatorRef.current.setVolume(newMuted ? 0 : 0.5);
    }
  };

  const handleSaveState = async (slot: number) => {
    if (!emulatorRef.current || !onSaveState) return;

    try {
      // Get save state from emulator
      const saveData = await emulatorRef.current.saveState();

      if (saveData) {
        const blob = new Blob([saveData], { type: 'application/octet-stream' });
        onSaveState(slot, blob);
        alert(`Game saved to slot ${slot}`);
      }
    } catch (err) {
      console.error('Save state error:', err);
      alert('Failed to save game');
    }
  };

  const handleLoadState = async (slot: number) => {
    if (!emulatorRef.current || !onLoadState) return;

    try {
      const saveBlob = await onLoadState(slot);

      if (saveBlob) {
        const arrayBuffer = await saveBlob.arrayBuffer();
        await emulatorRef.current.loadState(arrayBuffer);
        alert(`Game loaded from slot ${slot}`);
      } else {
        alert(`No save found in slot ${slot}`);
      }
    } catch (err) {
      console.error('Load state error:', err);
      alert('Failed to load game');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background-dark text-text-primary">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={onExit}>Exit</Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Emulator Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ backgroundColor: '#000' }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
            <p className="text-white text-lg">Loading {systemCore.toUpperCase()} emulator...</p>
            <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

      {/* Control Overlay (bottom bar) */}
      {!isLoading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 z-40 transition-opacity hover:opacity-100 opacity-0 focus-within:opacity-100">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={handleFullscreen}
                aria-label="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Center - Save/Load */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save States
                </Button>

                {showSettings && (
                  <div className="absolute bottom-full mb-2 left-0 bg-surface border border-border rounded-lg shadow-xl p-4 min-w-[200px]">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Save Slots</h3>

                    <div className="space-y-2">
                      {[1, 2, 3, 4].map(slot => (
                        <div key={slot} className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSaveState(slot)}
                            className="flex-1"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save {slot}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleLoadState(slot)}
                            className="flex-1"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            Load {slot}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>

              {onExit && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={onExit}
                  aria-label="Exit"
                >
                  <X className="w-4 h-4" />
                  Exit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="absolute top-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-xs opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <h4 className="font-semibold mb-2">Keyboard Controls</h4>
        <ul className="space-y-1">
          <li>Arrow Keys: D-Pad</li>
          <li>Z/X: A/B Buttons</li>
          <li>A/S: L/R Buttons</li>
          <li>Enter: Start</li>
          <li>Shift: Select</li>
          <li>F11: Fullscreen</li>
        </ul>
      </div>
    </div>
  );
}
