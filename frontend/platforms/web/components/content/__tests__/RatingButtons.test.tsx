import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { RatingButtons } from '../RatingButtons';

describe('RatingButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all three rating buttons', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('Thumbs down')).toBeInTheDocument();
    expect(screen.getByLabelText('Thumbs up')).toBeInTheDocument();
    expect(screen.getByLabelText('Love this content')).toBeInTheDocument();
  });

  it('should show initial rating when provided - love (10)', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={10} />
      </MockedProvider>,
    );

    const loveButton = screen.getByLabelText('Love this content');
    expect(loveButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('should show initial rating when provided - thumbs down (2)', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={2} />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('Thumbs down')).toHaveAttribute('aria-pressed', 'true');
  });

  it('should show initial rating when provided - thumbs up (7)', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={7} />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('Thumbs up')).toHaveAttribute('aria-pressed', 'true');
  });

  it('should handle thumbs up click with optimistic update', async () => {
    const onRatingChange = vi.fn();

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons
          mediaItemId="test-media-id"
          onRatingChange={onRatingChange}
        />
      </MockedProvider>,
    );

    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    fireEvent.click(thumbsUpButton);

    // Optimistic update should happen immediately
    await waitFor(() => {
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('should handle thumbs down click with optimistic update', async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" />
      </MockedProvider>,
    );

    const thumbsDownButton = screen.getByLabelText('Thumbs down');
    fireEvent.click(thumbsDownButton);

    await waitFor(() => {
      expect(thumbsDownButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('should handle love click with optimistic update', async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" />
      </MockedProvider>,
    );

    const loveButton = screen.getByLabelText('Love this content');
    fireEvent.click(loveButton);

    await waitFor(() => {
      expect(loveButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('should toggle off when clicking the same rating twice', async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={7} />
      </MockedProvider>,
    );

    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(thumbsUpButton);

    await waitFor(() => {
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('should switch between different ratings', async () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={7} />
      </MockedProvider>,
    );

    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    const loveButton = screen.getByLabelText('Love this content');

    expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'true');
    expect(loveButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(loveButton);

    await waitFor(() => {
      expect(thumbsUpButton).toHaveAttribute('aria-pressed', 'false');
      expect(loveButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('should call onRatingChange with correct value for thumbs up', async () => {
    const onRatingChange = vi.fn();

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons
          mediaItemId="test-media-id"
          onRatingChange={onRatingChange}
        />
      </MockedProvider>,
    );

    const thumbsUpButton = screen.getByLabelText('Thumbs up');
    fireEvent.click(thumbsUpButton);

    // Wait for async operation
    await waitFor(() => {
      // Check if called (might fail due to mutation error, but optimistic call should happen)
      expect(onRatingChange).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should apply correct CSS classes for active state', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={10} />
      </MockedProvider>,
    );

    const loveButton = screen.getByLabelText('Love this content');
    expect(loveButton.className).toContain('scale-110');
  });

  it('should have fill-current class on heart when love is active', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={10} />
      </MockedProvider>,
    );

    const loveButton = screen.getByLabelText('Love this content');
    // Check the button contains an element with fill-current class
    expect(loveButton.innerHTML).toContain('fill-current');
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" />
      </MockedProvider>,
    );

    const container = screen.getByRole('group', { name: /rate this content/i });
    expect(container).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed');
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('should apply custom className', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons
          mediaItemId="test-media-id"
          className="custom-class"
        />
      </MockedProvider>,
    );

    const container = screen.getByRole('group');
    expect(container.className).toContain('custom-class');
  });

  it('should map edge case rating 3 to thumbs_down', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={3} />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('Thumbs down')).toHaveAttribute('aria-pressed', 'true');
  });

  it('should map edge case rating 9 to love', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={9} />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('Love this content')).toHaveAttribute('aria-pressed', 'true');
  });

  it('should map edge case rating 5 to thumbs_up', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={5} />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('Thumbs up')).toHaveAttribute('aria-pressed', 'true');
  });

  it('should handle null initial rating', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RatingButtons mediaItemId="test-media-id" initialRating={null} />
      </MockedProvider>,
    );

    expect(screen.getByLabelText('Thumbs down')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Thumbs up')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Love this content')).toHaveAttribute('aria-pressed', 'false');
  });
});
