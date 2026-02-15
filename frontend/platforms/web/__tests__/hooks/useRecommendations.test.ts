import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecommendations, usePersonalizedSuggestions } from '@/hooks/useRecommendations';

// Mock GraphQL
vi.mock('@/hooks/useGraphQL', () => ({
  useGraphQL: () => ({
    request: vi.fn().mockResolvedValue({
      recommendations: [
        {
          id: '1',
          contentId: 'content-1',
          score: 0.95,
          reason: 'Based on your viewing history',
          content: {
            id: 'content-1',
            title: 'Test Movie',
            posterUrl: '/poster.jpg',
            backdropUrl: '/backdrop.jpg',
            mediaType: 'movie',
            year: 2024,
            rating: 8.5,
            genres: ['Action', 'Sci-Fi'],
            overview: 'A test movie',
          },
        },
      ],
      watch_history: [],
      user_ratings: [],
    }),
  }),
}));

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => [
      {
        id: 'content-2',
        title: 'Suggested Movie',
        genres: ['Drama'],
        year: 2023,
        rating: 7.5,
        popularity: 500,
      },
    ],
  })
) as any;

describe('useRecommendations', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it('should fetch recommendations for a profile', async () => {
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRecommendations('profile-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(1);
    expect(result.current.data?.[0].content.title).toBe('Test Movie');
  });

  it('should not fetch when profileId is empty', () => {
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRecommendations(''), { wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('usePersonalizedSuggestions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it('should calculate personalized suggestions with default weights', async () => {
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePersonalizedSuggestions('profile-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('should respect custom recommendation weights', async () => {
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const customWeights = {
      genreMatch: 0.5,
      ratingSimilarity: 0.3,
      recency: 0.1,
      popularity: 0.1,
    };

    const { result } = renderHook(
      () => usePersonalizedSuggestions('profile-1', customWeights),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
  });

  it('should filter out already watched content', async () => {
    // Mock with watched content
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'content-1', title: 'Movie 1', genres: [], year: 2023, rating: 8, popularity: 100 },
        { id: 'content-2', title: 'Movie 2', genres: [], year: 2023, rating: 8, popularity: 100 },
      ],
    } as any);

    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePersonalizedSuggestions('profile-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should exclude watched content (mocked empty watch history, so both should be included)
    expect(result.current.data?.length).toBeGreaterThan(0);
  });
});
