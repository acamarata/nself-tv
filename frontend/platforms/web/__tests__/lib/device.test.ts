import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDeviceId, resetDeviceId, getCurrentDeviceId } from '@/lib/device';

describe('device', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getDeviceId', () => {
    it('should generate a new device ID if none exists', () => {
      const deviceId = getDeviceId();
      expect(deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should return the same device ID on subsequent calls', () => {
      const deviceId1 = getDeviceId();
      const deviceId2 = getDeviceId();
      expect(deviceId1).toBe(deviceId2);
    });

    it('should persist device ID in localStorage', () => {
      const deviceId = getDeviceId();
      const stored = localStorage.getItem('ntv_device_id');
      expect(stored).toBe(deviceId);
    });

    it('should return a placeholder device ID during SSR', () => {
      // Simulate SSR by temporarily removing window
      const originalWindow = global.window;
      // @ts-expect-error - intentionally removing window for SSR simulation
      delete global.window;

      const deviceId = getDeviceId();
      expect(deviceId).toBe('00000000-0000-0000-0000-000000000000');

      // Restore window
      global.window = originalWindow;
    });

    it('should generate a session-only ID if localStorage is unavailable', () => {
      // Mock localStorage.getItem to throw an error
      const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
      const mockStorage = {
        getItem: vi.fn(() => {
          throw new Error('localStorage unavailable');
        }),
        setItem: vi.fn(() => {
          throw new Error('localStorage unavailable');
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const deviceId = getDeviceId();
      expect(deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to access localStorage for device ID:',
        expect.any(Error)
      );

      // Restore
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
      consoleWarnSpy.mockRestore();
    });
  });

  describe('resetDeviceId', () => {
    it('should remove the device ID from localStorage', () => {
      getDeviceId(); // Create a device ID
      expect(localStorage.getItem('ntv_device_id')).toBeTruthy();

      resetDeviceId();
      expect(localStorage.getItem('ntv_device_id')).toBeNull();
    });

    it('should cause a new device ID to be generated on next getDeviceId call', () => {
      const deviceId1 = getDeviceId();
      resetDeviceId();
      const deviceId2 = getDeviceId();

      expect(deviceId1).not.toBe(deviceId2);
    });

    it('should not throw if localStorage is unavailable', () => {
      const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
      const removeItemMock = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });
      const mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: removeItemMock,
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => resetDeviceId()).not.toThrow();

      expect(removeItemMock).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to reset device ID:',
        expect.any(Error)
      );

      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
      consoleWarnSpy.mockRestore();
    });

    it('should handle SSR gracefully', () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally removing window for SSR simulation
      delete global.window;

      expect(() => resetDeviceId()).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('getCurrentDeviceId', () => {
    it('should return null if no device ID exists', () => {
      const deviceId = getCurrentDeviceId();
      expect(deviceId).toBeNull();
    });

    it('should return the existing device ID without creating a new one', () => {
      const generatedId = getDeviceId();
      const retrievedId = getCurrentDeviceId();
      expect(retrievedId).toBe(generatedId);
    });

    it('should return null during SSR', () => {
      const originalWindow = global.window;
      // @ts-expect-error - intentionally removing window for SSR simulation
      delete global.window;

      const deviceId = getCurrentDeviceId();
      expect(deviceId).toBeNull();

      global.window = originalWindow;
    });

    it('should return null if localStorage is unavailable', () => {
      const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
      const getItemMock = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });
      const mockStorage = {
        getItem: getItemMock,
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const deviceId = getCurrentDeviceId();
      expect(deviceId).toBeNull();

      expect(getItemMock).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to get device ID:',
        expect.any(Error)
      );

      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
      consoleWarnSpy.mockRestore();
    });
  });
});
