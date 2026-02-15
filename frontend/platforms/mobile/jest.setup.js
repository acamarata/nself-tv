// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-video
jest.mock('react-native-video', () => 'Video');

// Mock native modules
jest.mock('./src/native/VideoPlayer', () => ({
  VideoPlayer: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    seek: jest.fn(),
    getPosition: jest.fn().mockResolvedValue(0),
    getDuration: jest.fn().mockResolvedValue(100),
    setPlaybackRate: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('./src/native/BiometricAuth', () => ({
  BiometricAuth: {
    isAvailable: jest.fn().mockResolvedValue('None'),
    authenticate: jest.fn().mockResolvedValue(false),
  },
}));
