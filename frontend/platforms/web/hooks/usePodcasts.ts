/**
 * Hook for podcast GraphQL queries and mutations
 */

import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// GraphQL queries
const GET_PODCAST_SHOWS = gql`
  query GetPodcastShows($limit: Int = 50) {
    podcast_shows(
      order_by: {title: asc}
      limit: $limit
    ) {
      id
      title
      author
      artwork_url
      description
      explicit
      categories
    }
  }
`;

const GET_PODCAST_SHOWS_BY_CATEGORY = gql`
  query GetPodcastShowsByCategory($category: String!, $limit: Int = 50) {
    podcast_shows(
      where: {categories: {_contains: [$category]}}
      order_by: {title: asc}
      limit: $limit
    ) {
      id
      title
      author
      artwork_url
      description
      explicit
      categories
    }
  }
`;

const GET_SHOW_DETAIL = gql`
  query GetPodcastShowDetail($id: uuid!) {
    podcast_shows_by_pk(id: $id) {
      id
      title
      author
      description
      artwork_url
      explicit
      language
      categories
      feed_url
      podcast_episodes(order_by: {pub_date: desc}) {
        id
        guid
        title
        description
        pub_date
        duration
        enclosure_url
        enclosure_type
        artwork_url
        season
        episode
        explicit
        chapters
      }
    }
  }
`;

const GET_USER_SUBSCRIPTIONS = gql`
  query GetUserSubscriptions {
    podcast_subscriptions {
      id
      show_id
      notifications_enabled
      auto_download
      created_at
      podcast_show {
        id
        title
        author
        artwork_url
        description
        feed_url
      }
    }
  }
`;

const SEARCH_PODCASTS = gql`
  query SearchPodcasts($query: String!) {
    podcast_shows(
      where: {
        _or: [
          {title: {_ilike: $query}}
          {author: {_ilike: $query}}
          {description: {_ilike: $query}}
        ]
      }
      order_by: {title: asc}
    ) {
      id
      title
      author
      artwork_url
      description
    }
  }
`;

// GraphQL mutations
const SUBSCRIBE_TO_SHOW = gql`
  mutation SubscribeToShow($show_id: uuid!) {
    insert_podcast_subscriptions_one(
      object: {show_id: $show_id, notifications_enabled: true}
      on_conflict: {constraint: podcast_subscriptions_user_id_show_id_key, update_columns: []}
    ) {
      id
    }
  }
`;

const UNSUBSCRIBE_FROM_SHOW = gql`
  mutation UnsubscribeFromShow($show_id: uuid!) {
    delete_podcast_subscriptions(
      where: {show_id: {_eq: $show_id}}
    ) {
      affected_rows
    }
  }
`;

const UPDATE_SUBSCRIPTION = gql`
  mutation UpdateSubscription($show_id: uuid!, $notifications_enabled: Boolean, $auto_download: Boolean) {
    update_podcast_subscriptions(
      where: {show_id: {_eq: $show_id}}
      _set: {
        notifications_enabled: $notifications_enabled
        auto_download: $auto_download
      }
    ) {
      affected_rows
    }
  }
`;

const ADD_PODCAST_BY_FEED = gql`
  mutation AddPodcastByFeed($family_id: uuid!, $feed_url: String!, $title: String!) {
    insert_podcast_shows_one(
      object: {
        family_id: $family_id
        feed_url: $feed_url
        title: $title
        fetch_status: "active"
      }
      on_conflict: {
        constraint: podcast_shows_family_id_feed_url_key
        update_columns: []
      }
    ) {
      id
      title
    }
  }
`;

const SAVE_PODCAST_PROGRESS = gql`
  mutation SavePodcastProgress($episode_id: uuid!, $position: Int!, $duration: Int!, $completed: Boolean!) {
    insert_podcast_progress_one(
      object: {
        episode_id: $episode_id
        position: $position
        duration: $duration
        completed: $completed
      }
      on_conflict: {
        constraint: podcast_progress_user_id_episode_id_key
        update_columns: [position, duration, completed]
      }
    ) {
      id
      position
      duration
      completed
      updated_at
    }
  }
`;

// Hooks
export function usePodcastShows(category?: string) {
  return useQuery(category ? GET_PODCAST_SHOWS_BY_CATEGORY : GET_PODCAST_SHOWS, {
    variables: category ? { category } : {},
  });
}

export function useShowDetail(id: string) {
  return useQuery(GET_SHOW_DETAIL, {
    variables: { id },
    skip: !id,
  });
}

export function useUserSubscriptions() {
  return useQuery(GET_USER_SUBSCRIPTIONS);
}

export function useSearchPodcasts(query: string) {
  return useQuery(SEARCH_PODCASTS, {
    variables: { query: `%${query}%` },
    skip: !query || query.length < 2,
  });
}

export function useSubscribe() {
  return useMutation(SUBSCRIBE_TO_SHOW, {
    refetchQueries: ['GetUserSubscriptions'],
  });
}

export function useUnsubscribe() {
  return useMutation(UNSUBSCRIBE_FROM_SHOW, {
    refetchQueries: ['GetUserSubscriptions'],
  });
}

export function useUpdateSubscription() {
  return useMutation(UPDATE_SUBSCRIPTION, {
    refetchQueries: ['GetUserSubscriptions'],
  });
}

export function useSavePodcastProgress() {
  return useMutation(SAVE_PODCAST_PROGRESS);
}

export function useAddPodcastByFeed() {
  return useMutation(ADD_PODCAST_BY_FEED, {
    refetchQueries: ['GetPodcastShows'],
  });
}
