import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import RecordingsPage from '@/app/(app)/recordings/page';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@nself.org' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('RecordingsPage', () => {
  it('renders the Recordings heading', () => {
    const { getByText } = render(<RecordingsPage />);
    expect(getByText('Recordings')).toBeDefined();
  });

  it('shows the recordings count', () => {
    const { getByText } = render(<RecordingsPage />);
    expect(getByText('6 recordings')).toBeDefined();
  });

  it('renders the list view by default', () => {
    const { getByTestId } = render(<RecordingsPage />);
    expect(getByTestId('recordings-list')).toBeDefined();
  });

  it('switches to grid view', () => {
    const { getByLabelText, getByTestId, queryByTestId } = render(<RecordingsPage />);
    fireEvent.click(getByLabelText('Grid view'));
    expect(getByTestId('recordings-grid')).toBeDefined();
    expect(queryByTestId('recordings-list')).toBeNull();
  });

  it('switches back to list view', () => {
    const { getByLabelText, getByTestId } = render(<RecordingsPage />);
    fireEvent.click(getByLabelText('Grid view'));
    fireEvent.click(getByLabelText('List view'));
    expect(getByTestId('recordings-list')).toBeDefined();
  });

  it('displays recording titles in list view', () => {
    const { getByText } = render(<RecordingsPage />);
    expect(getByText('NFL Sunday: Eagles vs Cowboys')).toBeDefined();
    expect(getByText('Evening News')).toBeDefined();
  });

  it('filters recordings by status', () => {
    const { getByLabelText, queryByText, getByText } = render(<RecordingsPage />);
    const select = getByLabelText('Filter by status') as HTMLSelectElement;

    fireEvent.change(select, { target: { value: 'ready' } });

    expect(getByText('NFL Sunday: Eagles vs Cowboys')).toBeDefined();
    expect(getByText('Evening News')).toBeDefined();
    // Recording-status items should be hidden
    expect(queryByText('Late Night Comedy')).toBeNull();
  });

  it('sorts recordings by title', () => {
    const { getByLabelText, getAllByTestId } = render(<RecordingsPage />);
    const sortSelect = getByLabelText('Sort by') as HTMLSelectElement;

    fireEvent.change(sortSelect, { target: { value: 'title' } });

    const rows = getAllByTestId(/^recording-row-/);
    expect(rows.length).toBeGreaterThan(0);
    // First row should be alphabetically first
    expect(rows[0].textContent).toContain('Evening News');
  });

  it('shows delete confirmation modal', () => {
    const { getAllByLabelText, getByTestId, queryByTestId } = render(<RecordingsPage />);

    // No modal initially
    expect(queryByTestId('delete-modal')).toBeNull();

    // Click first delete button
    const deleteButtons = getAllByLabelText(/^Delete /);
    fireEvent.click(deleteButtons[0]);

    expect(getByTestId('delete-modal')).toBeDefined();
  });

  it('closes delete modal on cancel', () => {
    const { getAllByLabelText, getByText, queryByTestId } = render(<RecordingsPage />);

    const deleteButtons = getAllByLabelText(/^Delete /);
    fireEvent.click(deleteButtons[0]);

    fireEvent.click(getByText('Cancel'));
    expect(queryByTestId('delete-modal')).toBeNull();
  });

  it('closes delete modal on confirm', () => {
    const { getAllByLabelText, queryByTestId } = render(<RecordingsPage />);

    const deleteButtons = getAllByLabelText(/^Delete /);
    fireEvent.click(deleteButtons[0]);

    // The "Delete" button in the modal (confirmation)
    const modalDeleteButtons = getAllByLabelText(/^Delete /);
    // Find the button with text "Delete" in the modal
    const confirmDeleteButton = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Delete' && btn.closest('[data-testid="delete-modal"]'),
    );
    if (confirmDeleteButton) {
      fireEvent.click(confirmDeleteButton);
    }
    expect(queryByTestId('delete-modal')).toBeNull();
  });

  it('shows commercial indicators', () => {
    const { getByLabelText, getAllByTestId } = render(<RecordingsPage />);
    // Switch to grid for easier finding
    fireEvent.click(getByLabelText('Grid view'));

    const cleanIndicators = getAllByTestId('commercial-clean');
    expect(cleanIndicators.length).toBeGreaterThan(0);
  });

  it('has status filter options', () => {
    const { getByLabelText } = render(<RecordingsPage />);
    const select = getByLabelText('Filter by status') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('all');
    expect(options).toContain('scheduled');
    expect(options).toContain('recording');
    expect(options).toContain('ready');
    expect(options).toContain('failed');
  });

  it('has sort options', () => {
    const { getByLabelText } = render(<RecordingsPage />);
    const select = getByLabelText('Sort by') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('date');
    expect(options).toContain('title');
    expect(options).toContain('size');
  });

  it('renders recording cards in grid view', () => {
    const { getByLabelText, getByTestId } = render(<RecordingsPage />);
    fireEvent.click(getByLabelText('Grid view'));
    expect(getByTestId('recording-card-rec-1')).toBeDefined();
  });
});
