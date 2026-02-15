import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RulesPage from '@/app/(app)/acquire/rules/page';

// Mock lucide-react icons
vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />;
  },
}));

describe('RulesPage', () => {
  it('renders the Download Rules heading', () => {
    render(<RulesPage />);
    expect(screen.getByText('Download Rules')).toBeDefined();
  });

  it('renders the Add Rule button', () => {
    render(<RulesPage />);
    expect(screen.getByText('Add Rule')).toBeDefined();
  });

  it('renders all rule rows', () => {
    render(<RulesPage />);
    expect(screen.getByTestId('rule-row-r1')).toBeDefined();
    expect(screen.getByTestId('rule-row-r2')).toBeDefined();
    expect(screen.getByTestId('rule-row-r3')).toBeDefined();
    expect(screen.getByTestId('rule-row-r4')).toBeDefined();
    expect(screen.getByTestId('rule-row-r5')).toBeDefined();
  });

  it('renders rule names', () => {
    render(<RulesPage />);
    expect(screen.getByText('Prefer 4K Remux')).toBeDefined();
    expect(screen.getByText('Skip CAM Releases')).toBeDefined();
    expect(screen.getByText('Notify on 1080p WEB-DL')).toBeDefined();
    expect(screen.getByText('Auto-grab Balanced')).toBeDefined();
    expect(screen.getByText('Skip Low Quality')).toBeDefined();
  });

  it('renders table column headers', () => {
    render(<RulesPage />);
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Priority')).toBeDefined();
    expect(screen.getByText('Action')).toBeDefined();
    expect(screen.getByText('Conditions')).toBeDefined();
    expect(screen.getByText('Enabled')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('renders rule priorities', () => {
    render(<RulesPage />);
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('renders action badges', () => {
    render(<RulesPage />);
    const autoDownloads = screen.getAllByText('Auto Download');
    expect(autoDownloads.length).toBe(2); // r1 and r4
    expect(screen.getByText('Notify')).toBeDefined();
    const skips = screen.getAllByText('Skip');
    expect(skips.length).toBe(2); // r2 and r5
  });

  it('renders conditions preview text', () => {
    render(<RulesPage />);
    expect(screen.getByText('Quality: remux, bluray | Min: 10 GB')).toBeDefined();
    expect(screen.getByText('Contains: CAM, TS, HDCAM')).toBeDefined();
    expect(screen.getByText('Quality: web-dl | Resolution: 1080p')).toBeDefined();
  });

  it('renders delete buttons for each rule', () => {
    render(<RulesPage />);
    expect(screen.getByLabelText('Delete Prefer 4K Remux')).toBeDefined();
    expect(screen.getByLabelText('Delete Skip CAM Releases')).toBeDefined();
    expect(screen.getByLabelText('Delete Notify on 1080p WEB-DL')).toBeDefined();
    expect(screen.getByLabelText('Delete Auto-grab Balanced')).toBeDefined();
    expect(screen.getByLabelText('Delete Skip Low Quality')).toBeDefined();
  });

  it('renders enable/disable toggle buttons', () => {
    render(<RulesPage />);
    // r4 is disabled, others are enabled
    expect(screen.getByLabelText('Disable Prefer 4K Remux')).toBeDefined();
    expect(screen.getByLabelText('Disable Skip CAM Releases')).toBeDefined();
    expect(screen.getByLabelText('Disable Notify on 1080p WEB-DL')).toBeDefined();
    expect(screen.getByLabelText('Enable Auto-grab Balanced')).toBeDefined();
    expect(screen.getByLabelText('Disable Skip Low Quality')).toBeDefined();
  });

  it('applies reduced opacity for disabled rules', () => {
    render(<RulesPage />);
    const r4Row = screen.getByTestId('rule-row-r4');
    expect(r4Row.className).toContain('opacity-50');
  });

  it('toggles a rule enabled state', () => {
    render(<RulesPage />);
    // r1 is enabled, toggle should change label to Enable
    const toggleBtn = screen.getByLabelText('Disable Prefer 4K Remux');
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText('Enable Prefer 4K Remux')).toBeDefined();

    // r4 is disabled, toggle should change label to Disable
    const enableBtn = screen.getByLabelText('Enable Auto-grab Balanced');
    fireEvent.click(enableBtn);
    expect(screen.getByLabelText('Disable Auto-grab Balanced')).toBeDefined();
  });

  it('deletes a rule when delete button is clicked', () => {
    render(<RulesPage />);
    expect(screen.getByTestId('rule-row-r1')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Delete Prefer 4K Remux'));
    expect(screen.queryByTestId('rule-row-r1')).toBeNull();
    // Other rules remain
    expect(screen.getByTestId('rule-row-r2')).toBeDefined();
  });

  it('does not show the form by default', () => {
    render(<RulesPage />);
    expect(screen.queryByText('New Download Rule')).toBeNull();
  });

  it('shows the form when Add Rule is clicked', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Add Rule'));
    expect(screen.getByText('New Download Rule')).toBeDefined();
    expect(screen.getByLabelText('Rule Name')).toBeDefined();
    expect(screen.getByLabelText('Priority')).toBeDefined();
    expect(screen.getByLabelText('Action')).toBeDefined();
    expect(screen.getByLabelText('Quality (comma-separated)')).toBeDefined();
    expect(screen.getByLabelText('Title Contains (comma-separated)')).toBeDefined();
  });

  it('hides the form when Cancel is clicked', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Add Rule'));
    expect(screen.getByText('New Download Rule')).toBeDefined();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Download Rule')).toBeNull();
  });

  it('allows typing in form fields', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Add Rule'));

    const nameInput = screen.getByLabelText('Rule Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Custom Rule' } });
    expect(nameInput.value).toBe('My Custom Rule');

    const qualityInput = screen.getByLabelText('Quality (comma-separated)') as HTMLInputElement;
    fireEvent.change(qualityInput, { target: { value: 'remux, bluray' } });
    expect(qualityInput.value).toBe('remux, bluray');

    const titleInput = screen.getByLabelText('Title Contains (comma-separated)') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'IMAX, HDR' } });
    expect(titleInput.value).toBe('IMAX, HDR');
  });

  it('renders the Action dropdown with correct options', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Add Rule'));

    const select = screen.getByLabelText('Action') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('auto_download');
    expect(options).toContain('notify');
    expect(options).toContain('skip');
  });

  it('submits the form and hides it', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Add Rule'));

    const nameInput = screen.getByLabelText('Rule Name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Test Rule' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Rule' }));
    expect(screen.queryByText('New Download Rule')).toBeNull();
  });

  it('shows empty state when all rules are deleted', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByLabelText('Delete Prefer 4K Remux'));
    fireEvent.click(screen.getByLabelText('Delete Skip CAM Releases'));
    fireEvent.click(screen.getByLabelText('Delete Notify on 1080p WEB-DL'));
    fireEvent.click(screen.getByLabelText('Delete Auto-grab Balanced'));
    fireEvent.click(screen.getByLabelText('Delete Skip Low Quality'));

    expect(screen.getByText('No download rules')).toBeDefined();
    expect(screen.getByText('Create rules to automatically filter and prioritize downloads based on quality, size, and other criteria.')).toBeDefined();
  });

  it('sets default priority based on rule count', () => {
    render(<RulesPage />);
    fireEvent.click(screen.getByText('Add Rule'));

    const priorityInput = screen.getByLabelText('Priority') as HTMLInputElement;
    // Default priority should be rules.length + 1 = 6
    expect(priorityInput.value).toBe('6');
  });
});
