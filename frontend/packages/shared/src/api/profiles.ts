import type { HttpClient } from './client';
import type { Profile, WatchProgress, ContinueWatching } from '../models';

export interface CreateProfileData {
  name: string;
  isKids: boolean;
  maxContentRating: string;
  pinProtected: boolean;
  pin?: string;
}

export interface UpdateProfileData {
  name?: string;
  isKids?: boolean;
  maxContentRating?: string;
  pinProtected?: boolean;
  pin?: string;
  preferences?: Partial<Profile['preferences']>;
}

export interface UpdateProgressData {
  mediaId: string;
  currentTime: number;
  duration: number;
}

/**
 * Profiles API client
 */
export class ProfilesAPI {
  constructor(private http: HttpClient) {}

  /**
   * Get all profiles for current family
   */
  async getProfiles(): Promise<Profile[]> {
    const response = await this.http.get<{ profiles: Profile[] }>('/profiles');
    return response.data.profiles;
  }

  /**
   * Get profile by ID
   */
  async getProfile(id: string): Promise<Profile> {
    const response = await this.http.get<{ profile: Profile }>(`/profiles/${id}`);
    return response.data.profile;
  }

  /**
   * Create new profile
   */
  async createProfile(data: CreateProfileData): Promise<Profile> {
    const response = await this.http.post<{ profile: Profile }>('/profiles', data);
    return response.data.profile;
  }

  /**
   * Update profile
   */
  async updateProfile(id: string, data: UpdateProfileData): Promise<Profile> {
    const response = await this.http.patch<{ profile: Profile }>(
      `/profiles/${id}`,
      data
    );
    return response.data.profile;
  }

  /**
   * Delete profile
   */
  async deleteProfile(id: string): Promise<void> {
    await this.http.delete(`/profiles/${id}`);
  }

  /**
   * Verify profile PIN
   */
  async verifyPin(id: string, pin: string): Promise<boolean> {
    const response = await this.http.post<{ valid: boolean }>(
      `/profiles/${id}/verify-pin`,
      { pin }
    );
    return response.data.valid;
  }

  /**
   * Get watch progress for profile
   */
  async getWatchProgress(profileId: string, mediaId: string): Promise<WatchProgress | null> {
    try {
      const response = await this.http.get<{ progress: WatchProgress }>(
        `/profiles/${profileId}/progress/${mediaId}`
      );
      return response.data.progress;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // No progress saved yet
      }
      throw error;
    }
  }

  /**
   * Update watch progress
   */
  async updateWatchProgress(profileId: string, data: UpdateProgressData): Promise<WatchProgress> {
    const response = await this.http.post<{ progress: WatchProgress }>(
      `/profiles/${profileId}/progress`,
      data
    );
    return response.data.progress;
  }

  /**
   * Get continue watching list for profile
   */
  async getContinueWatching(profileId: string, limit: number = 20): Promise<ContinueWatching[]> {
    const response = await this.http.get<{ items: ContinueWatching[] }>(
      `/profiles/${profileId}/continue-watching?limit=${limit}`
    );
    return response.data.items;
  }

  /**
   * Get watchlist for profile
   */
  async getWatchlist(profileId: string): Promise<string[]> {
    const response = await this.http.get<{ mediaIds: string[] }>(
      `/profiles/${profileId}/watchlist`
    );
    return response.data.mediaIds;
  }

  /**
   * Add media to watchlist
   */
  async addToWatchlist(profileId: string, mediaId: string): Promise<void> {
    await this.http.post(`/profiles/${profileId}/watchlist`, { mediaId });
  }

  /**
   * Remove media from watchlist
   */
  async removeFromWatchlist(profileId: string, mediaId: string): Promise<void> {
    await this.http.delete(`/profiles/${profileId}/watchlist/${mediaId}`);
  }

  /**
   * Check if media is in watchlist
   */
  async isInWatchlist(profileId: string, mediaId: string): Promise<boolean> {
    try {
      const response = await this.http.get<{ inWatchlist: boolean }>(
        `/profiles/${profileId}/watchlist/${mediaId}`
      );
      return response.data.inWatchlist;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }
}
