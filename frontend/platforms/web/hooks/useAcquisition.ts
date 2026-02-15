/**
 * Hooks for content acquisition management.
 * Covers: acquisition_preferences, acquisition_history, acquisition_notifications.
 */

import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// ============================================================
// QUERIES
// ============================================================

const GET_ACQUISITION_PREFERENCES = gql`
  query GetAcquisitionPreferences {
    acquisition_preferences {
      family_id
      default_quality_profile
      auto_download_enabled
      max_concurrent_downloads
      preferred_subtitle_languages
      vpn_required
      seed_ratio_target
      bandwidth_schedule_enabled
      updated_at
    }
  }
`;

const GET_ACQUISITION_HISTORY = gql`
  query GetAcquisitionHistory($limit: Int = 50, $offset: Int = 0) {
    acquisition_history(
      order_by: {acquired_at: desc}
      limit: $limit
      offset: $offset
    ) {
      id
      family_id
      media_item_id
      download_id
      content_type
      title
      source_quality
      source_size_bytes
      encoded_size_bytes
      download_duration_seconds
      encode_duration_seconds
      subtitle_languages
      audio_tracks_count
      acquired_at
      media_item {
        id
        title
        poster_url
        status
      }
    }
    acquisition_history_aggregate {
      aggregate {
        count
      }
    }
  }
`;

const GET_ACQUISITION_NOTIFICATIONS = gql`
  query GetAcquisitionNotifications {
    acquisition_notifications(order_by: {event_type: asc}) {
      id
      user_id
      event_type
      enabled
      notify_method
    }
  }
`;

// ============================================================
// MUTATIONS
// ============================================================

const UPDATE_ACQUISITION_PREFERENCES = gql`
  mutation UpdateAcquisitionPreferences(
    $family_id: uuid!
    $changes: acquisition_preferences_set_input!
  ) {
    update_acquisition_preferences_by_pk(
      pk_columns: {family_id: $family_id}
      _set: $changes
    ) {
      family_id
      default_quality_profile
      auto_download_enabled
      max_concurrent_downloads
      preferred_subtitle_languages
      vpn_required
      seed_ratio_target
      bandwidth_schedule_enabled
      updated_at
    }
  }
`;

const UPDATE_NOTIFICATION_PREFERENCE = gql`
  mutation UpdateNotificationPreference($id: uuid!, $enabled: Boolean!, $notify_method: String!) {
    update_acquisition_notifications_by_pk(
      pk_columns: {id: $id}
      _set: {enabled: $enabled, notify_method: $notify_method}
    ) {
      id
      enabled
      notify_method
    }
  }
`;

const INSERT_NOTIFICATION_PREFERENCE = gql`
  mutation InsertNotificationPreference(
    $event_type: String!
    $enabled: Boolean!
    $notify_method: String!
  ) {
    insert_acquisition_notifications_one(
      object: {
        event_type: $event_type
        enabled: $enabled
        notify_method: $notify_method
      }
      on_conflict: {
        constraint: acquisition_notifications_user_id_event_type_key
        update_columns: [enabled, notify_method]
      }
    ) {
      id
      event_type
      enabled
      notify_method
    }
  }
`;

// ============================================================
// HOOKS
// ============================================================

export function useAcquisitionPreferences() {
  return useQuery(GET_ACQUISITION_PREFERENCES);
}

export function useAcquisitionHistory(limit = 50, offset = 0) {
  return useQuery(GET_ACQUISITION_HISTORY, {
    variables: { limit, offset },
  });
}

export function useAcquisitionNotifications() {
  return useQuery(GET_ACQUISITION_NOTIFICATIONS);
}

export function useUpdateAcquisitionPreferences() {
  return useMutation(UPDATE_ACQUISITION_PREFERENCES, {
    refetchQueries: ['GetAcquisitionPreferences'],
  });
}

export function useUpdateNotificationPreference() {
  return useMutation(UPDATE_NOTIFICATION_PREFERENCE, {
    refetchQueries: ['GetAcquisitionNotifications'],
  });
}

export function useInsertNotificationPreference() {
  return useMutation(INSERT_NOTIFICATION_PREFERENCE, {
    refetchQueries: ['GetAcquisitionNotifications'],
  });
}
