import { NativeModules, Platform } from 'react-native';

export type BiometricType = 'FaceID' | 'TouchID' | 'Fingerprint' | 'Face' | 'Iris' | 'None';

interface BiometricAuthNativeModule {
  isAvailable(): Promise<BiometricType>;
  authenticate(reason: string): Promise<boolean>;
}

const LINKING_ERROR =
  `The package 'react-native-biometric-auth' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- Run 'pod install' in ios/ directory\n", default: '' }) +
  Platform.select({ android: "- Run 'gradle sync' in Android Studio\n", default: '' }) +
  '- Rebuild the app';

// Native module proxy with fallback for development
const BiometricAuthModule: BiometricAuthNativeModule =
  NativeModules.BiometricAuthModule ??
  new Proxy(
    {},
    {
      get() {
        throw new Error(LINKING_ERROR);
      },
    }
  );

export class BiometricAuth {
  /**
   * Check if biometric authentication is available on this device
   * @returns BiometricType indicating which type is available, or 'None'
   */
  static async isAvailable(): Promise<BiometricType> {
    try {
      return await BiometricAuthModule.isAvailable();
    } catch (error) {
      console.error('BiometricAuth.isAvailable error:', error);
      return 'None';
    }
  }

  /**
   * Authenticate using biometrics (Face ID or Touch ID on iOS)
   * @param reason - String explaining why authentication is needed (shown to user)
   * @returns Promise resolving to true if authentication succeeded, false otherwise
   */
  static async authenticate(reason: string): Promise<boolean> {
    try {
      return await BiometricAuthModule.authenticate(reason);
    } catch (error) {
      console.error('BiometricAuth.authenticate error:', error);
      return false;
    }
  }
}
