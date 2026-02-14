import type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  DeviceCodeResponse,
  DeviceCodePollResponse,
} from '@/types/auth';

let authBaseUrl = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:4000';

export function setAuthBaseUrl(url: string): void {
  authBaseUrl = url;
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${authBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new AuthError(body.message || `Auth request failed: ${res.status}`, res.status);
  }
  return res.json();
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
  const data = await authFetch<{ session: { accessToken: string; refreshToken: string; accessTokenExpiresIn: number }; user: { id: string; email: string; displayName: string; avatarUrl: string; defaultRole: string; roles: Array<{ role: string }> ; createdAt: string; metadata?: Record<string, unknown> } }>('/signin/email-password', {
    method: 'POST',
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });

  // Extract familyId from metadata if available, otherwise fallback to user.id
  const metadata = data.user.metadata as { familyId?: string; familyRole?: string; [key: string]: unknown } | undefined;
  const familyId = metadata?.familyId || data.user.id;

  return {
    user: {
      id: data.user.id,
      familyId,
      email: data.user.email,
      displayName: data.user.displayName,
      avatarUrl: data.user.avatarUrl || null,
      defaultRole: data.user.defaultRole,
      roles: data.user.roles.map((r) => r.role),
      createdAt: data.user.createdAt,
      metadata,
    },
    tokens: {
      accessToken: data.session.accessToken,
      refreshToken: data.session.refreshToken,
      expiresIn: data.session.accessTokenExpiresIn,
      expiresAt: Date.now() + data.session.accessTokenExpiresIn * 1000,
    },
  };
}

export async function register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
  const res = await authFetch<{ session: { accessToken: string; refreshToken: string; accessTokenExpiresIn: number }; user: { id: string; email: string; displayName: string; avatarUrl: string; defaultRole: string; roles: Array<{ role: string }>; createdAt: string; metadata?: Record<string, unknown> } }>('/signup/email-password', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      options: {
        displayName: data.displayName,
        metadata: {
          familyName: data.familyName,
          // When proper family system is implemented, set familyId here
          // familyId: newFamilyId,
          // familyRole: 'owner'
        },
      },
    }),
  });

  // Extract familyId from metadata if available, otherwise fallback to user.id
  const metadata = res.user.metadata as { familyId?: string; familyRole?: string; [key: string]: unknown } | undefined;
  const familyId = metadata?.familyId || res.user.id;

  return {
    user: {
      id: res.user.id,
      familyId,
      email: res.user.email,
      displayName: res.user.displayName,
      avatarUrl: res.user.avatarUrl || null,
      defaultRole: res.user.defaultRole,
      roles: res.user.roles.map((r) => r.role),
      createdAt: res.user.createdAt,
      metadata,
    },
    tokens: {
      accessToken: res.session.accessToken,
      refreshToken: res.session.refreshToken,
      expiresIn: res.session.accessTokenExpiresIn,
      expiresAt: Date.now() + res.session.accessTokenExpiresIn * 1000,
    },
  };
}

export async function refreshToken(token: string): Promise<AuthTokens> {
  const data = await authFetch<{ accessToken: string; refreshToken: string; accessTokenExpiresIn: number }>('/token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: token }),
  });
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.accessTokenExpiresIn,
    expiresAt: Date.now() + data.accessTokenExpiresIn * 1000,
  };
}

export async function logout(token: string): Promise<void> {
  await authFetch('/signout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: token }),
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await authFetch('/user/password/reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(ticket: string, newPassword: string): Promise<void> {
  await authFetch('/user/password/reset/change', {
    method: 'POST',
    body: JSON.stringify({ ticket, newPassword }),
  });
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  return authFetch<DeviceCodeResponse>('/device-code/request', { method: 'POST' });
}

export async function pollDeviceCode(deviceCode: string): Promise<DeviceCodePollResponse> {
  return authFetch<DeviceCodePollResponse>('/device-code/poll', {
    method: 'POST',
    body: JSON.stringify({ deviceCode }),
  });
}

export async function authorizeDeviceCode(userCode: string): Promise<void> {
  await authFetch('/device-code/authorize', {
    method: 'POST',
    body: JSON.stringify({ userCode }),
  });
}
