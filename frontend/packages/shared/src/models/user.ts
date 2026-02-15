export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  familyId: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
}

export type UserRole = 'owner' | 'admin' | 'helper' | 'user';

export const USER_ROLES: UserRole[] = ['owner', 'admin', 'helper', 'user'];

export interface UserSession {
  userId: string;
  sessionId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
}
