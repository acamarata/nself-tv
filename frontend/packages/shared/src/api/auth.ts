import type { HttpClient } from './client';
import type { User, UserSession } from '../models';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  familyName?: string;
}

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

export interface DeviceCodePollResponse {
  status: 'pending' | 'authorized' | 'expired' | 'denied';
  session?: UserSession;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Authentication API client
 */
export class AuthAPI {
  constructor(private http: HttpClient) {}

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<UserSession> {
    const response = await this.http.post<{ session: UserSession }>(
      '/auth/login',
      credentials,
      { skipAuth: true }
    );
    return response.data.session;
  }

  /**
   * Register new user account
   */
  async register(data: RegisterData): Promise<UserSession> {
    const response = await this.http.post<{ session: UserSession }>(
      '/auth/register',
      data,
      { skipAuth: true }
    );
    return response.data.session;
  }

  /**
   * Logout current session
   */
  async logout(): Promise<void> {
    await this.http.post('/auth/logout');
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await this.http.post<RefreshTokenResponse>(
      '/auth/refresh',
      { refreshToken },
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.http.get<{ user: User }>('/auth/me');
    return response.data.user;
  }

  /**
   * Request device code for device-code auth flow
   */
  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await this.http.post<DeviceCodeResponse>(
      '/auth/device/code',
      {},
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * Poll for device code authorization
   */
  async pollDeviceCode(deviceCode: string): Promise<DeviceCodePollResponse> {
    const response = await this.http.post<DeviceCodePollResponse>(
      '/auth/device/poll',
      { deviceCode },
      { skipAuth: true }
    );
    return response.data;
  }

  /**
   * Authorize device code (called from web/mobile after user scans QR)
   */
  async authorizeDeviceCode(userCode: string): Promise<void> {
    await this.http.post('/auth/device/authorize', { userCode });
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.http.post(
      '/auth/password/reset',
      { email },
      { skipAuth: true }
    );
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.http.post(
      '/auth/password/confirm',
      { token, newPassword },
      { skipAuth: true }
    );
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.http.post('/auth/password/change', {
      currentPassword,
      newPassword
    });
  }
}
