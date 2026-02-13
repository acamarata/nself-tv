import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeatureFlagProvider, FeatureFlagContext, withFeatureFlag } from '@/lib/feature-flags/FeatureFlagProvider';
import { useContext } from 'react';
import type { FeatureFlags } from '@/types/config';

function TestConsumer() {
  const flags = useContext(FeatureFlagContext);
  return (
    <div>
      <span data-testid="vod">{String(flags.vod)}</span>
      <span data-testid="liveTV">{String(flags.liveTV)}</span>
      <span data-testid="sports">{String(flags.sports)}</span>
      <span data-testid="podcasts">{String(flags.podcasts)}</span>
      <span data-testid="games">{String(flags.games)}</span>
    </div>
  );
}

describe('FeatureFlagProvider', () => {
  it('provides default flags when none passed', () => {
    const { getByTestId } = render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    );
    expect(getByTestId('vod').textContent).toBe('true');
    expect(getByTestId('liveTV').textContent).toBe('false');
    expect(getByTestId('sports').textContent).toBe('false');
    expect(getByTestId('podcasts').textContent).toBe('false');
    expect(getByTestId('games').textContent).toBe('false');
  });

  it('provides custom flags when passed', () => {
    const flags: FeatureFlags = {
      vod: true,
      liveTV: true,
      sports: true,
      podcasts: true,
      games: false,
      dvr: false,
      downloads: false,
      watchParty: false,
    };
    const { getByTestId } = render(
      <FeatureFlagProvider flags={flags}>
        <TestConsumer />
      </FeatureFlagProvider>,
    );
    expect(getByTestId('vod').textContent).toBe('true');
    expect(getByTestId('liveTV').textContent).toBe('true');
    expect(getByTestId('sports').textContent).toBe('true');
    expect(getByTestId('podcasts').textContent).toBe('true');
    expect(getByTestId('games').textContent).toBe('false');
  });

  it('falls back to defaults when null passed', () => {
    const { getByTestId } = render(
      <FeatureFlagProvider flags={null}>
        <TestConsumer />
      </FeatureFlagProvider>,
    );
    expect(getByTestId('vod').textContent).toBe('true');
  });
});

describe('withFeatureFlag', () => {
  function TestComponent() {
    return <span data-testid="wrapped">visible</span>;
  }

  it('renders component when flag is enabled', () => {
    const Wrapped = withFeatureFlag(TestComponent, 'vod');
    const flags: FeatureFlags = { vod: true, liveTV: false, sports: false, podcasts: false, games: false, dvr: false, downloads: false, watchParty: false };
    const { getByTestId } = render(
      <FeatureFlagProvider flags={flags}>
        <Wrapped />
      </FeatureFlagProvider>,
    );
    expect(getByTestId('wrapped')).toBeDefined();
  });

  it('does not render component when flag is disabled', () => {
    const Wrapped = withFeatureFlag(TestComponent, 'liveTV');
    const flags: FeatureFlags = { vod: true, liveTV: false, sports: false, podcasts: false, games: false, dvr: false, downloads: false, watchParty: false };
    const { queryByTestId } = render(
      <FeatureFlagProvider flags={flags}>
        <Wrapped />
      </FeatureFlagProvider>,
    );
    expect(queryByTestId('wrapped')).toBeNull();
  });

  it('sets displayName on wrapped component', () => {
    const Wrapped = withFeatureFlag(TestComponent, 'vod');
    expect(Wrapped.displayName).toBe('withFeatureFlag(TestComponent)');
  });
});
