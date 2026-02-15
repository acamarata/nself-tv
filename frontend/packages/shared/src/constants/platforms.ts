export const PLATFORMS = {
  // Web
  WEB: 'web',

  // Mobile
  IOS: 'ios',
  ANDROID: 'android',

  // Desktop
  MACOS: 'macos',
  WINDOWS: 'windows',
  LINUX: 'linux',

  // TV
  ANDROID_TV: 'android-tv',
  ROKU: 'roku',
  WEBOS: 'webos',
  TVOS: 'tvos',
  TIZEN: 'tizen',

  // Set-top box (Phase 9)
  NTV_OS: 'ntv-os'
} as const;

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];

/**
 * Platform capabilities
 */
export interface PlatformCapabilities {
  offlineDownloads: boolean;
  backgroundAudio: boolean;
  pushNotifications: boolean;
  casting: boolean;
  biometricAuth: boolean;
  pictureInPicture: boolean;
  hardwareAcceleration: boolean;
}

export const PLATFORM_CAPABILITIES: Record<Platform, PlatformCapabilities> = {
  web: {
    offlineDownloads: false,
    backgroundAudio: false,
    pushNotifications: true,
    casting: true,
    biometricAuth: false,
    pictureInPicture: true,
    hardwareAcceleration: true
  },
  ios: {
    offlineDownloads: true,
    backgroundAudio: true,
    pushNotifications: true,
    casting: true,
    biometricAuth: true,
    pictureInPicture: true,
    hardwareAcceleration: true
  },
  android: {
    offlineDownloads: true,
    backgroundAudio: true,
    pushNotifications: true,
    casting: true,
    biometricAuth: true,
    pictureInPicture: true,
    hardwareAcceleration: true
  },
  macos: {
    offlineDownloads: true,
    backgroundAudio: true,
    pushNotifications: true,
    casting: false,
    biometricAuth: false,
    pictureInPicture: true,
    hardwareAcceleration: true
  },
  windows: {
    offlineDownloads: true,
    backgroundAudio: true,
    pushNotifications: true,
    casting: false,
    biometricAuth: false,
    pictureInPicture: true,
    hardwareAcceleration: true
  },
  linux: {
    offlineDownloads: true,
    backgroundAudio: true,
    pushNotifications: true,
    casting: false,
    biometricAuth: false,
    pictureInPicture: true,
    hardwareAcceleration: true
  },
  'android-tv': {
    offlineDownloads: false,
    backgroundAudio: false,
    pushNotifications: false,
    casting: false,
    biometricAuth: false,
    pictureInPicture: false,
    hardwareAcceleration: true
  },
  roku: {
    offlineDownloads: false,
    backgroundAudio: false,
    pushNotifications: false,
    casting: false,
    biometricAuth: false,
    pictureInPicture: false,
    hardwareAcceleration: true
  },
  webos: {
    offlineDownloads: false,
    backgroundAudio: false,
    pushNotifications: false,
    casting: false,
    biometricAuth: false,
    pictureInPicture: false,
    hardwareAcceleration: true
  },
  tvos: {
    offlineDownloads: false,
    backgroundAudio: false,
    pushNotifications: false,
    casting: false,
    biometricAuth: false,
    pictureInPicture: false,
    hardwareAcceleration: true
  },
  tizen: {
    offlineDownloads: false,
    backgroundAudio: false,
    pushNotifications: false,
    casting: false,
    biometricAuth: false,
    pictureInPicture: false,
    hardwareAcceleration: true
  },
  'ntv-os': {
    offlineDownloads: false,
    backgroundAudio: false,
    pushNotifications: false,
    casting: false,
    biometricAuth: false,
    pictureInPicture: false,
    hardwareAcceleration: true
  }
};

/**
 * Platform display names
 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  web: 'Web',
  ios: 'iOS',
  android: 'Android',
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  'android-tv': 'Android TV',
  roku: 'Roku',
  webos: 'LG webOS',
  tvos: 'Apple TV',
  tizen: 'Samsung Tizen',
  'ntv-os': 'nTV OS'
};
