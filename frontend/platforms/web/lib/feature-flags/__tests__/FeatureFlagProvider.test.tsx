import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FeatureFlagProvider, withFeatureFlag } from '../FeatureFlagProvider';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

// Create mock function
const mockGetServerFeatureFlags = vi.fn();
const mockGetEnvironmentConfig = vi.fn();

// Mock the config modules
vi.mock('@/lib/config/environment', () => ({
  getEnvironmentConfig: () => mockGetEnvironmentConfig(),
}));

vi.mock('@/lib/config/server-config', () => ({
  getServerFeatureFlags: () => mockGetServerFeatureFlags(),
}));

describe('FeatureFlagProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mocks
    mockGetEnvironmentConfig.mockReturnValue({
      backendUrl: null,
      mode: 'standalone',
      defaultFeatures: {
        vod: true,
        liveTV: false,
        sports: false,
        podcasts: false,
        games: false,
        dvr: false,
        downloads: false,
        watchParty: false,
      },
    });
    mockGetServerFeatureFlags.mockResolvedValue({
      vod: true,
      liveTV: false,
      sports: false,
      podcasts: false,
      games: false,
      dvr: false,
      downloads: false,
      watchParty: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should provide default feature flags', () => {
    const TestComponent = () => {
      const flags = useFeatureFlags();
      return <div data-testid="flags">{JSON.stringify(flags)}</div>;
    };

    render(
      <FeatureFlagProvider>
        <TestComponent />
      </FeatureFlagProvider>,
    );

    const flagsElement = screen.getByTestId('flags');
    const flags = JSON.parse(flagsElement.textContent || '{}');

    expect(flags.vod).toBe(true);
    expect(flags.liveTV).toBe(false);
  });

  it('should use provided initial flags', () => {
    const TestComponent = () => {
      const flags = useFeatureFlags();
      return <div data-testid="flags">{JSON.stringify(flags)}</div>;
    };

    const customFlags = {
      vod: true,
      liveTV: true,
      sports: true,
      podcasts: true,
      games: true,
      dvr: true,
      downloads: true,
      watchParty: true,
    };

    mockGetServerFeatureFlags.mockResolvedValue(customFlags);

    render(
      <FeatureFlagProvider flags={customFlags}>
        <TestComponent />
      </FeatureFlagProvider>,
    );

    const flagsElement = screen.getByTestId('flags');
    const flags = JSON.parse(flagsElement.textContent || '{}');

    expect(flags).toEqual(customFlags);
  });

  it('should fetch server flags on mount', async () => {
    const TestComponent = () => {
      const flags = useFeatureFlags();
      return <div data-testid="flags">{JSON.stringify(flags)}</div>;
    };

    const serverFlags = {
      vod: true,
      liveTV: true,
      sports: false,
      podcasts: true,
      games: false,
      dvr: false,
      downloads: true,
      watchParty: false,
    };

    mockGetServerFeatureFlags.mockResolvedValue(serverFlags);

    render(
      <FeatureFlagProvider>
        <TestComponent />
      </FeatureFlagProvider>,
    );

    await waitFor(() => {
      const flagsElement = screen.getByTestId('flags');
      const flags = JSON.parse(flagsElement.textContent || '{}');
      expect(flags.podcasts).toBe(true);
      expect(flags.downloads).toBe(true);
    });

    expect(mockGetServerFeatureFlags).toHaveBeenCalled();
  });

  it('should handle server fetch errors gracefully', async () => {
    const TestComponent = () => {
      const flags = useFeatureFlags();
      return <div data-testid="flags">{JSON.stringify(flags)}</div>;
    };

    mockGetServerFeatureFlags.mockRejectedValue(new Error('Network error'));

    // Should not throw
    expect(() => {
      render(
        <FeatureFlagProvider>
          <TestComponent />
        </FeatureFlagProvider>,
      );
    }).not.toThrow();

    // Should keep using default flags
    const flagsElement = screen.getByTestId('flags');
    const flags = JSON.parse(flagsElement.textContent || '{}');
    expect(flags.vod).toBe(true);
  });

  describe('withFeatureFlag HOC', () => {
    it('should render component when flag is enabled', () => {
      const TestComponent = () => <div data-testid="content">Feature Content</div>;
      const WrappedComponent = withFeatureFlag(TestComponent, 'vod');

      const flags = {
        vod: true,
        liveTV: false,
        sports: false,
        podcasts: false,
        games: false,
        dvr: false,
        downloads: false,
        watchParty: false,
      };

      mockGetServerFeatureFlags.mockResolvedValue(flags);

      render(
        <FeatureFlagProvider flags={flags}>
          <WrappedComponent />
        </FeatureFlagProvider>,
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should not render component when flag is disabled', () => {
      const TestComponent = () => <div data-testid="content">Feature Content</div>;
      const WrappedComponent = withFeatureFlag(TestComponent, 'liveTV');

      const flags = {
        vod: true,
        liveTV: false,
        sports: false,
        podcasts: false,
        games: false,
        dvr: false,
        downloads: false,
        watchParty: false,
      };

      mockGetServerFeatureFlags.mockResolvedValue(flags);

      render(
        <FeatureFlagProvider flags={flags}>
          <WrappedComponent />
        </FeatureFlagProvider>,
      );

      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should set display name correctly', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';

      const WrappedComponent = withFeatureFlag(TestComponent, 'vod');

      expect(WrappedComponent.displayName).toBe('withFeatureFlag(TestComponent)');
    });

    it('should handle component without display name', () => {
      function AnonymousComponent() {
        return <div>Test</div>;
      }

      const WrappedComponent = withFeatureFlag(AnonymousComponent, 'vod');

      expect(WrappedComponent.displayName).toBe('withFeatureFlag(AnonymousComponent)');
    });
  });
});
