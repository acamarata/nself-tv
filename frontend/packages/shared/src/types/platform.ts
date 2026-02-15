import type { Platform } from '../constants';

export interface PlatformInfo {
  platform: Platform;
  version: string;
  deviceId: string;
  deviceName: string;
}

export interface DeviceInfo extends PlatformInfo {
  osVersion: string;
  appVersion: string;
  screenWidth: number;
  screenHeight: number;
  isTablet?: boolean;
  supportsPiP?: boolean;
  supportsBiometrics?: boolean;
}
