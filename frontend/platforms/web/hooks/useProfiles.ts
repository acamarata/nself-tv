'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import type { Profile, CreateProfileInput, UpdateProfileInput } from '@/types/profile';
import { GET_FAMILY_PROFILES, CREATE_PROFILE, UPDATE_PROFILE, DELETE_PROFILE } from '@/lib/graphql/queries';
import { useAuth } from './useAuth';

const CURRENT_PROFILE_KEY = 'ntv_current_profile';

function mapProfile(raw: Record<string, unknown>): Profile {
  return {
    id: raw.id as string,
    userId: raw.user_id as string,
    displayName: raw.display_name as string,
    avatarUrl: (raw.avatar_url as string) || null,
    role: raw.role as Profile['role'],
    parentalControls: raw.parental_controls as Profile['parentalControls'],
    preferences: raw.preferences as Profile['preferences'],
    isDefault: raw.is_default as boolean,
    createdAt: raw.created_at as string,
  };
}

export function useProfiles() {
  const { user } = useAuth();
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(null);

  const { data, loading, refetch } = useQuery(GET_FAMILY_PROFILES, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  const [createMutation] = useMutation(CREATE_PROFILE);
  const [updateMutation] = useMutation(UPDATE_PROFILE);
  const [deleteMutation] = useMutation(DELETE_PROFILE);

  const profiles: Profile[] = (data?.profiles || []).map(mapProfile);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(CURRENT_PROFILE_KEY);
    if (stored && profiles.length > 0) {
      try {
        const parsed = JSON.parse(stored);
        const match = profiles.find((p) => p.id === parsed.id);
        if (match) {
          setCurrentProfileState(match);
          return;
        }
      } catch { /* fallthrough */ }
    }
    if (profiles.length > 0 && !currentProfile) {
      const defaultProfile = profiles.find((p) => p.isDefault) || profiles[0];
      setCurrentProfileState(defaultProfile);
    }
  }, [profiles, currentProfile]);

  const selectProfile = useCallback((profile: Profile | null) => {
    setCurrentProfileState(profile);
    if (profile) {
      localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(CURRENT_PROFILE_KEY);
    }
  }, []);

  const createProfile = useCallback(async (input: CreateProfileInput) => {
    const result = await createMutation({
      variables: {
        input: {
          user_id: user?.id,
          display_name: input.displayName,
          avatar_url: input.avatarUrl || null,
          role: input.role,
          parental_controls: input.parentalControls || {
            maxTvRating: 'TV-MA',
            maxMovieRating: 'NC-17',
            pinEnabled: false,
            pin: null,
          },
          preferences: {
            subtitleLanguage: 'en',
            audioLanguage: 'en',
            qualityCap: '1080p',
            autoplayNextEpisode: true,
          },
        },
      },
    });
    await refetch();
    return mapProfile(result.data.insert_profiles_one);
  }, [user, createMutation, refetch]);

  const updateProfile = useCallback(async (idOrInput: string | UpdateProfileInput, maybeInput?: UpdateProfileInput) => {
    const id = typeof idOrInput === 'string' ? idOrInput : currentProfile?.id;
    const input = typeof idOrInput === 'string' ? maybeInput! : idOrInput;
    if (!id) throw new Error('No profile selected');
    const setInput: Record<string, unknown> = {};
    if (input.displayName !== undefined) setInput.display_name = input.displayName;
    if (input.avatarUrl !== undefined) setInput.avatar_url = input.avatarUrl;
    if (input.parentalControls !== undefined) setInput.parental_controls = input.parentalControls;
    if (input.preferences !== undefined) setInput.preferences = input.preferences;

    const result = await updateMutation({ variables: { id, input: setInput } });
    await refetch();
    const updated = mapProfile(result.data.update_profiles_by_pk);
    if (currentProfile?.id === id) {
      setCurrentProfileState(updated);
      localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(updated));
    }
    return updated;
  }, [updateMutation, refetch, currentProfile]);

  const deleteProfile = useCallback(async (id: string) => {
    await deleteMutation({ variables: { id } });
    await refetch();
    if (currentProfile?.id === id) {
      setCurrentProfileState(null);
      localStorage.removeItem(CURRENT_PROFILE_KEY);
    }
  }, [deleteMutation, refetch, currentProfile]);

  return {
    profiles,
    currentProfile,
    isLoading: loading,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    needsProfileSelection: !loading && profiles.length > 0 && !currentProfile,
  };
}
