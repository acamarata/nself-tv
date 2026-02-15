import { BiometricAuth } from './BiometricAuth';

describe('BiometricAuth', () => {
  it('should check if biometric auth is available', async () => {
    const type = await BiometricAuth.isAvailable();
    expect(type).toBe('None');
  });

  it('should return false when authenticating in test environment', async () => {
    const result = await BiometricAuth.authenticate('Test authentication');
    expect(result).toBe(false);
  });

  it('should handle authentication with reason string', async () => {
    const result = await BiometricAuth.authenticate('Please authenticate to continue');
    expect(typeof result).toBe('boolean');
  });
});
