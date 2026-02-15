import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MovieSearchForm } from '@/components/acquire/MovieSearchForm';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

describe('MovieSearchForm', () => {
  const defaultProps = {
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with data-testid', () => {
    const { getByTestId } = render(<MovieSearchForm {...defaultProps} />);
    expect(getByTestId('movie-search-form')).toBeDefined();
  });

  it('renders movie title input', () => {
    const { getByPlaceholderText } = render(<MovieSearchForm {...defaultProps} />);
    expect(getByPlaceholderText('e.g. Dune: Part Three')).toBeDefined();
  });

  it('renders TMDB ID input', () => {
    const { getByPlaceholderText } = render(<MovieSearchForm {...defaultProps} />);
    expect(getByPlaceholderText('e.g. 693134')).toBeDefined();
  });

  it('renders quality profile selector', () => {
    const { getByTestId } = render(<MovieSearchForm {...defaultProps} />);
    expect(getByTestId('quality-profile-selector')).toBeDefined();
  });

  it('renders "Monitor Movie" submit button', () => {
    const { getByText } = render(<MovieSearchForm {...defaultProps} />);
    expect(getByText('Monitor Movie')).toBeDefined();
  });

  it('renders cancel button', () => {
    const { getByText } = render(<MovieSearchForm {...defaultProps} />);
    expect(getByText('Cancel')).toBeDefined();
  });

  it('disables submit when title is empty', () => {
    const { getByText } = render(<MovieSearchForm {...defaultProps} />);
    const submitBtn = getByText('Monitor Movie').closest('button')!;
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when title is filled', () => {
    const { getByText, getByPlaceholderText } = render(<MovieSearchForm {...defaultProps} />);
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: 'Some Movie' } });
    const submitBtn = getByText('Monitor Movie').closest('button')!;
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onSubmit with title and default quality on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <MovieSearchForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: 'Dune: Part Three' } });

    fireEvent.submit(getByTestId('movie-search-form'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Dune: Part Three',
        tmdbId: undefined,
        qualityProfile: 'balanced',
      });
    });
  });

  it('includes tmdbId when provided', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <MovieSearchForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: 'Dune' } });
    fireEvent.change(getByPlaceholderText('e.g. 693134'), { target: { value: '693134' } });

    fireEvent.submit(getByTestId('movie-search-form'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Dune',
        tmdbId: '693134',
        qualityProfile: 'balanced',
      });
    });
  });

  it('sends undefined for empty tmdbId', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <MovieSearchForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: 'Film' } });
    fireEvent.change(getByPlaceholderText('e.g. 693134'), { target: { value: '  ' } }); // whitespace only

    fireEvent.submit(getByTestId('movie-search-form'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ tmdbId: undefined }),
      );
    });
  });

  it('trims title whitespace before submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <MovieSearchForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: '  Dune  ' } });

    fireEvent.submit(getByTestId('movie-search-form'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Dune' }),
      );
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    const { getByText } = render(<MovieSearchForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows error message when submit fails with Error', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('TMDB not found'));
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <MovieSearchForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: 'Film' } });

    fireEvent.submit(getByTestId('movie-search-form'));

    await waitFor(() => {
      expect(getByText('TMDB not found')).toBeDefined();
    });
  });

  it('shows generic error for non-Error throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue('something bad');
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <MovieSearchForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: 'Film' } });

    fireEvent.submit(getByTestId('movie-search-form'));

    await waitFor(() => {
      expect(getByText('Failed to monitor movie')).toBeDefined();
    });
  });

  it('shows "Saving..." during submission', async () => {
    let resolve: () => void;
    const onSubmit = vi.fn().mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <MovieSearchForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: 'Film' } });

    fireEvent.submit(getByTestId('movie-search-form'));

    await waitFor(() => {
      expect(getByText('Saving...')).toBeDefined();
    });

    resolve!();
    await waitFor(() => {
      expect(getByText('Monitor Movie')).toBeDefined();
    });
  });

  it('does not submit when title is whitespace-only', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <MovieSearchForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Dune: Part Three'), { target: { value: '   ' } });

    fireEvent.submit(getByTestId('movie-search-form'));

    // Give a tick for any async operations
    await new Promise((r) => setTimeout(r, 50));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders label for Movie Title', () => {
    const { getByText } = render(<MovieSearchForm {...defaultProps} />);
    expect(getByText('Movie Title')).toBeDefined();
  });

  it('renders label for TMDB ID', () => {
    const { getByText } = render(<MovieSearchForm {...defaultProps} />);
    expect(getByText('TMDB ID (optional)')).toBeDefined();
  });
});
