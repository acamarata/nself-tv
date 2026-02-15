import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MoviesPage from '@/app/(app)/acquire/movies/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

// Mock QualityProfileSelector component
vi.mock('@/components/acquire/QualityProfileSelector', () => ({
  QualityProfileSelector: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select data-testid="quality-profile-selector" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="minimal">Minimal</option>
      <option value="balanced">Balanced</option>
      <option value="4k_premium">4K Premium</option>
    </select>
  ),
}));

describe('MoviesPage', () => {
  it('renders the Movie Monitoring heading', () => {
    render(<MoviesPage />);
    expect(screen.getByText('Movie Monitoring')).toBeDefined();
  });

  it('renders the Monitor Movie button', () => {
    render(<MoviesPage />);
    expect(screen.getByText('Monitor Movie')).toBeDefined();
  });

  it('renders all movie cards with data-testid attributes', () => {
    render(<MoviesPage />);
    expect(screen.getByTestId('movie-card-m1')).toBeDefined();
    expect(screen.getByTestId('movie-card-m2')).toBeDefined();
    expect(screen.getByTestId('movie-card-m3')).toBeDefined();
    expect(screen.getByTestId('movie-card-m4')).toBeDefined();
    expect(screen.getByTestId('movie-card-m5')).toBeDefined();
    expect(screen.getByTestId('movie-card-m6')).toBeDefined();
  });

  it('renders movie titles', () => {
    render(<MoviesPage />);
    expect(screen.getByText('Dune: Part Three')).toBeDefined();
    expect(screen.getByText('The Batman Part II')).toBeDefined();
    expect(screen.getByText('Oppenheimer')).toBeDefined();
    expect(screen.getByText('Blade Runner 2099')).toBeDefined();
    expect(screen.getByText('Killers of the Flower Moon')).toBeDefined();
    expect(screen.getByText('Civil War')).toBeDefined();
  });

  it('renders the movies grid container', () => {
    render(<MoviesPage />);
    expect(screen.getByTestId('movies-grid')).toBeDefined();
  });

  it('renders status badges on movie cards', () => {
    render(<MoviesPage />);
    const monitoringBadges = screen.getAllByText('monitoring');
    expect(monitoringBadges.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('completed')).toBeDefined();
    expect(screen.getByText('downloading')).toBeDefined();
    expect(screen.getByText('failed')).toBeDefined();
  });

  it('renders the status filter dropdown', () => {
    render(<MoviesPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;
    expect(select).toBeDefined();
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('all');
    expect(options).toContain('monitoring');
    expect(options).toContain('released');
    expect(options).toContain('downloading');
    expect(options).toContain('completed');
    expect(options).toContain('failed');
  });

  it('shows movie count text', () => {
    render(<MoviesPage />);
    expect(screen.getByText('6 movies')).toBeDefined();
  });

  it('filters movies by status', () => {
    render(<MoviesPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'completed' } });
    expect(screen.getByText('1 movies')).toBeDefined();
    expect(screen.getByText('Oppenheimer')).toBeDefined();
    expect(screen.queryByText('Dune: Part Three')).toBeNull();
  });

  it('filters to monitoring status showing correct count', () => {
    render(<MoviesPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'monitoring' } });
    expect(screen.getByText('3 movies')).toBeDefined();
  });

  it('shows empty state when filter returns no results', () => {
    render(<MoviesPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'released' } });
    expect(screen.getByText('No movies monitored')).toBeDefined();
  });

  it('returns to all movies when filter is set back to all', () => {
    render(<MoviesPage />);
    const select = screen.getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'completed' } });
    expect(screen.getByText('1 movies')).toBeDefined();

    fireEvent.change(select, { target: { value: 'all' } });
    expect(screen.getByText('6 movies')).toBeDefined();
  });

  it('does not show the form by default', () => {
    render(<MoviesPage />);
    expect(screen.queryByText('Monitor New Movie')).toBeNull();
  });

  it('shows the form when Monitor Movie is clicked', () => {
    render(<MoviesPage />);
    fireEvent.click(screen.getByText('Monitor Movie'));
    expect(screen.getByText('Monitor New Movie')).toBeDefined();
    expect(screen.getByLabelText('Movie Title')).toBeDefined();
    expect(screen.getByLabelText('TMDB ID (optional)')).toBeDefined();
  });

  it('hides the form when Cancel is clicked', () => {
    render(<MoviesPage />);
    fireEvent.click(screen.getByText('Monitor Movie'));
    expect(screen.getByText('Monitor New Movie')).toBeDefined();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Monitor New Movie')).toBeNull();
  });

  it('allows typing in movie title input', () => {
    render(<MoviesPage />);
    fireEvent.click(screen.getByText('Monitor Movie'));

    const input = screen.getByLabelText('Movie Title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Inception 2' } });
    expect(input.value).toBe('Inception 2');
  });

  it('allows typing in TMDB ID input', () => {
    render(<MoviesPage />);
    fireEvent.click(screen.getByText('Monitor Movie'));

    const input = screen.getByLabelText('TMDB ID (optional)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12345' } });
    expect(input.value).toBe('12345');
  });

  it('submits the form and hides it', () => {
    render(<MoviesPage />);
    fireEvent.click(screen.getByText('Monitor Movie'));

    const titleInput = screen.getByLabelText('Movie Title') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Test Movie' } });

    fireEvent.click(screen.getByRole('button', { name: 'Start Monitoring' }));
    expect(screen.queryByText('Monitor New Movie')).toBeNull();
  });

  it('renders remove buttons for each movie', () => {
    render(<MoviesPage />);
    expect(screen.getByLabelText('Remove Dune: Part Three')).toBeDefined();
    expect(screen.getByLabelText('Remove The Batman Part II')).toBeDefined();
    expect(screen.getByLabelText('Remove Oppenheimer')).toBeDefined();
  });

  it('renders TMDB IDs where available', () => {
    render(<MoviesPage />);
    expect(screen.getByText('TMDB: 945961')).toBeDefined();
    expect(screen.getByText('TMDB: 414906')).toBeDefined();
    expect(screen.getByText('TMDB: 872585')).toBeDefined();
  });

  it('renders release dates formatted', () => {
    render(<MoviesPage />);
    expect(screen.getByText('Mar 15, 2026')).toBeDefined();
    expect(screen.getByText('Oct 1, 2026')).toBeDefined();
  });
});
