/**
 * Hook for admin dashboard statistics and monitoring
 */

import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    media_items_aggregate {
      aggregate {
        count
      }
    }
    movies: media_items_aggregate(where: { type: { _eq: "movie" } }) {
      aggregate {
        count
      }
    }
    tv_shows: media_items_aggregate(where: { type: { _eq: "series" } }) {
      aggregate {
        count
      }
    }
    episodes: media_items_aggregate(where: { type: { _eq: "episode" } }) {
      aggregate {
        count
      }
    }
    live_channels: channels_aggregate {
      aggregate {
        count
      }
    }
    active_users: users_aggregate(
      where: { last_sign_in_at: { _gte: "now() - interval '30 days'" } }
    ) {
      aggregate {
        count
      }
    }
    total_watch_time: watch_progress_aggregate {
      aggregate {
        sum {
          position_seconds
        }
      }
    }
  }
`;

const GET_STORAGE_STATS = gql`
  query GetStorageStats {
    media_variants_aggregate {
      aggregate {
        sum {
          file_size_bytes
        }
      }
    }
    media_items_with_storage: media_items(
      where: { media_variants: {} }
      limit: 1
    ) {
      media_variants_aggregate {
        aggregate {
          sum {
            file_size_bytes
          }
        }
      }
    }
  }
`;

const GET_RECENT_ACTIVITY = gql`
  query GetRecentActivity {
    recent_uploads: media_items(
      order_by: { created_at: desc }
      limit: 5
    ) {
      id
      title
      type
      created_at
      poster_url
    }
    active_sessions: watch_progress(
      where: { last_watched_at: { _gte: "now() - interval '1 hour'" } }
      order_by: { last_watched_at: desc }
      limit: 10
    ) {
      id
      user {
        email
      }
      media_item {
        title
        type
      }
      percentage
      last_watched_at
    }
  }
`;

const GET_SYSTEM_HEALTH = gql`
  query GetSystemHealth {
    failed_jobs: media_items_aggregate(
      where: { processing_status: { _eq: "failed" } }
    ) {
      aggregate {
        count
      }
    }
    pending_jobs: media_items_aggregate(
      where: { processing_status: { _in: ["pending", "processing"] } }
    ) {
      aggregate {
        count
      }
    }
    error_logs: media_items(
      where: { processing_error: { _is_null: false } }
      order_by: { updated_at: desc }
      limit: 10
    ) {
      id
      title
      processing_error
      updated_at
    }
  }
`;

export function useDashboardStats() {
  return useQuery(GET_DASHBOARD_STATS, {
    pollInterval: 30000, // Refresh every 30s
  });
}

export function useStorageStats() {
  return useQuery(GET_STORAGE_STATS, {
    pollInterval: 60000, // Refresh every 60s
  });
}

export function useRecentActivity() {
  return useQuery(GET_RECENT_ACTIVITY, {
    pollInterval: 10000, // Refresh every 10s
  });
}

export function useSystemHealth() {
  return useQuery(GET_SYSTEM_HEALTH, {
    pollInterval: 30000, // Refresh every 30s
  });
}

// Helper functions for formatting
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function calculateTotalWatchTime(watchTimeSum: number | null): string {
  if (!watchTimeSum) return '0h';

  const hours = Math.floor(watchTimeSum / 3600);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h`;
}
