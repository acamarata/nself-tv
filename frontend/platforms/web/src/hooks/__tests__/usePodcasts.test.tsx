/**
 * Tests for podcast hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import {
  usePodcastShows,
  useShowDetail,
  useUserSubscriptions,
  useSearchPodcasts,
  useSubscribe,
  useUnsubscribe,
} from '../usePodcasts';

const mockShows = [
  {
    id: 'show-1',
    title: 'Tech Podcast',
    author: 'Tech Author',
    artwork_url: 'https://example.com/art1.jpg',
    description: 'A tech podcast',
    explicit: false,
    categories: ['Technology'],
  },
  {
    id: 'show-2',
    title: 'Business Podcast',
    author: 'Business Author',
    artwork_url: 'https://example.com/art2.jpg',
    description: 'A business podcast',
    explicit: false,
    categories: ['Business'],
  },
];

const mockShowDetail = {
  id: 'show-1',
  title: 'Tech Podcast',
  author: 'Tech Author',
  description: 'A tech podcast',
  artwork_url: 'https://example.com/art1.jpg',
  explicit: false,
  language: 'en',
  categories: ['Technology'],
  feed_url: 'https://example.com/feed.xml',
  podcast_episodes: [
    {
      id: 'ep-1',
      guid: 'guid-1',
      title: 'Episode 1',
      description: 'First episode',
      pub_date: '2024-01-01',
      duration: 3600,
      enclosure_url: 'https://example.com/ep1.mp3',
      enclosure_type: 'audio/mpeg',
    },
  ],
};

describe('usePodcasts hooks', () => {
  describe('usePodcastShows', () => {
    it('should fetch all shows', async () => {
      const mocks = [
        {
          request: {
            query: expect.anything(),
            variables: {},
          },
          result: {
            data: {
              podcast_shows: mockShows,
            },
          },
        },
      ];

      const wrapper = ({ children }: any) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => usePodcastShows(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.podcast_shows).toHaveLength(2);
    });

    it('should filter shows by category', async () => {
      const mocks = [
        {
          request: {
            query: expect.anything(),
            variables: { category: 'Technology' },
          },
          result: {
            data: {
              podcast_shows: [mockShows[0]],
            },
          },
        },
      ];

      const wrapper = ({ children }: any) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => usePodcastShows('Technology'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.podcast_shows).toHaveLength(1);
      expect(result.current.data?.podcast_shows[0].title).toBe('Tech Podcast');
    });
  });

  describe('useShowDetail', () => {
    it('should fetch show details with episodes', async () => {
      const mocks = [
        {
          request: {
            query: expect.anything(),
            variables: { id: 'show-1' },
          },
          result: {
            data: {
              podcast_shows_by_pk: mockShowDetail,
            },
          },
        },
      ];

      const wrapper = ({ children }: any) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useShowDetail('show-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const show = result.current.data?.podcast_shows_by_pk;
      expect(show?.title).toBe('Tech Podcast');
      expect(show?.podcast_episodes).toHaveLength(1);
    });
  });

  describe('useSearchPodcasts', () => {
    it('should search podcasts by query', async () => {
      const mocks = [
        {
          request: {
            query: expect.anything(),
            variables: { query: '%tech%' },
          },
          result: {
            data: {
              podcast_shows: [mockShows[0]],
            },
          },
        },
      ];

      const wrapper = ({ children }: any) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useSearchPodcasts('tech'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.podcast_shows).toHaveLength(1);
      expect(result.current.data?.podcast_shows[0].title).toBe('Tech Podcast');
    });

    it('should skip query if less than 2 characters', () => {
      const wrapper = ({ children }: any) => (
        <MockedProvider mocks={[]} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useSearchPodcasts('t'), { wrapper });

      // Should not load since query too short
      expect(result.current.loading).toBe(false);
    });
  });

  describe('useUserSubscriptions', () => {
    it('should fetch user subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          show_id: 'show-1',
          notifications_enabled: true,
          auto_download: false,
          podcast_show: mockShows[0],
        },
      ];

      const mocks = [
        {
          request: {
            query: expect.anything(),
          },
          result: {
            data: {
              podcast_subscriptions: mockSubscriptions,
            },
          },
        },
      ];

      const wrapper = ({ children }: any) => (
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      );

      const { result } = renderHook(() => useUserSubscriptions(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.podcast_subscriptions).toHaveLength(1);
      expect(result.current.data?.podcast_subscriptions[0].notifications_enabled).toBe(true);
    });
  });
});
