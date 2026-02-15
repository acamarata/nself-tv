import { useState, useEffect, useCallback, useRef } from 'react';

export interface GamepadState {
  index: number;
  id: string;
  connected: boolean;
  buttons: boolean[];
  axes: number[];
  mapping: 'standard' | string;
  timestamp: number;
}

export interface GamepadMapping {
  name: string;
  buttons: Record<number, string>;
  axes: Record<number, string>;
}

// Standard gamepad button/axis mappings
export const STANDARD_MAPPING: GamepadMapping = {
  name: 'Standard Gamepad',
  buttons: {
    0: 'A / Cross',
    1: 'B / Circle',
    2: 'X / Square',
    3: 'Y / Triangle',
    4: 'LB / L1',
    5: 'RB / R1',
    6: 'LT / L2',
    7: 'RT / R2',
    8: 'Select / Share',
    9: 'Start / Options',
    10: 'L3',
    11: 'R3',
    12: 'D-Pad Up',
    13: 'D-Pad Down',
    14: 'D-Pad Left',
    15: 'D-Pad Right',
    16: 'Home / Guide',
  },
  axes: {
    0: 'Left Stick X',
    1: 'Left Stick Y',
    2: 'Right Stick X',
    3: 'Right Stick Y',
  },
};

export interface GamepadOptions {
  deadzone?: number; // 0-1, default 0.1
  pollInterval?: number; // ms, default 16 (60fps)
  onButtonPress?: (index: number, button: number) => void;
  onButtonRelease?: (index: number, button: number) => void;
  onAxisMove?: (index: number, axis: number, value: number) => void;
}

export function useGamepad(options: GamepadOptions = {}) {
  const {
    deadzone = 0.1,
    pollInterval = 16,
    onButtonPress,
    onButtonRelease,
    onAxisMove,
  } = options;

  const [gamepads, setGamepads] = useState<GamepadState[]>([]);
  const [supported, setSupported] = useState(false);

  const previousStatesRef = useRef<Map<number, GamepadState>>(new Map());
  const rafIdRef = useRef<number | null>(null);

  // Check if Gamepad API is supported
  useEffect(() => {
    setSupported('getGamepads' in navigator);
  }, []);

  // Apply deadzone to axis values
  const applyDeadzone = useCallback(
    (value: number): number => {
      if (Math.abs(value) < deadzone) return 0;
      // Normalize after deadzone
      const sign = Math.sign(value);
      const magnitude = (Math.abs(value) - deadzone) / (1 - deadzone);
      return sign * magnitude;
    },
    [deadzone]
  );

  // Poll gamepads
  const pollGamepads = useCallback(() => {
    if (!supported) return;

    const rawGamepads = navigator.getGamepads();
    const activeGamepads: GamepadState[] = [];

    for (let i = 0; i < rawGamepads.length; i++) {
      const gamepad = rawGamepads[i];
      if (!gamepad) continue;

      const state: GamepadState = {
        index: gamepad.index,
        id: gamepad.id,
        connected: gamepad.connected,
        buttons: gamepad.buttons.map((b) => b.pressed),
        axes: gamepad.axes.map(applyDeadzone),
        mapping: gamepad.mapping,
        timestamp: gamepad.timestamp,
      };

      // Check for button changes
      const previousState = previousStatesRef.current.get(gamepad.index);
      if (previousState) {
        state.buttons.forEach((pressed, buttonIndex) => {
          const wasPressed = previousState.buttons[buttonIndex];
          if (pressed && !wasPressed) {
            onButtonPress?.(gamepad.index, buttonIndex);
          } else if (!pressed && wasPressed) {
            onButtonRelease?.(gamepad.index, buttonIndex);
          }
        });

        // Check for axis changes
        state.axes.forEach((value, axisIndex) => {
          const previousValue = previousState.axes[axisIndex];
          if (Math.abs(value - previousValue) > 0.01) {
            onAxisMove?.(gamepad.index, axisIndex, value);
          }
        });
      }

      previousStatesRef.current.set(gamepad.index, state);
      activeGamepads.push(state);
    }

    setGamepads(activeGamepads);
  }, [supported, applyDeadzone, onButtonPress, onButtonRelease, onAxisMove]);

  // Start/stop polling
  useEffect(() => {
    if (!supported) return;

    const poll = () => {
      pollGamepads();
      rafIdRef.current = requestAnimationFrame(poll);
    };

    rafIdRef.current = requestAnimationFrame(poll);

    // Event listeners for connect/disconnect
    const handleConnect = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
    };

    const handleDisconnect = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      previousStatesRef.current.delete(e.gamepad.index);
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, [supported, pollGamepads]);

  return {
    gamepads,
    supported,
    mapping: STANDARD_MAPPING,
  };
}

// Vibration/rumble support
export function vibrateGamepad(
  gamepadIndex: number,
  duration: number = 200,
  strongMagnitude: number = 1.0,
  weakMagnitude: number = 0.5
) {
  const gamepads = navigator.getGamepads();
  const gamepad = gamepads[gamepadIndex];

  if (gamepad && 'vibrationActuator' in gamepad) {
    const actuator = (gamepad as any).vibrationActuator;
    if (actuator && actuator.playEffect) {
      actuator.playEffect('dual-rumble', {
        duration,
        strongMagnitude,
        weakMagnitude,
      });
    }
  }
}
