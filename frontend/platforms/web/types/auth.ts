export interface User {
  id: string;
  familyId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  defaultRole: string;
  roles: string[];
  createdAt: string;
  metadata?: {
    familyId?: string;
    familyRole?: string;
    [key: string]: unknown;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  familyName: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface DeviceCodeResponse {
  userCode: string;
  deviceCode: string;
  expiresIn: number;
  interval: number;
  verificationUri: string;
}

export type DeviceCodeStatus = 'pending' | 'authorized' | 'expired' | 'denied';

export interface DeviceCodePollResponse {
  status: DeviceCodeStatus;
  user?: User;
  tokens?: AuthTokens;
}
