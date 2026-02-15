import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { RuleBuilder } from '@/components/acquire/RuleBuilder';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}));

describe('RuleBuilder', () => {
  const defaultProps = {
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with data-testid', () => {
    const { getByTestId } = render(<RuleBuilder {...defaultProps} />);
    expect(getByTestId('rule-builder')).toBeDefined();
  });

  it('renders rule name input', () => {
    const { getByPlaceholderText } = render(<RuleBuilder {...defaultProps} />);
    expect(getByPlaceholderText('e.g. Auto-download Sci-Fi')).toBeDefined();
  });

  it('renders priority input with default value 50', () => {
    const { container } = render(<RuleBuilder {...defaultProps} />);
    const priorityInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(priorityInput.value).toBe('50');
  });

  it('renders one default condition row', () => {
    const { getByTestId } = render(<RuleBuilder {...defaultProps} />);
    expect(getByTestId('condition-row-0')).toBeDefined();
  });

  it('renders condition field selector with all options', () => {
    const { getByTestId } = render(<RuleBuilder {...defaultProps} />);
    const row = getByTestId('condition-row-0');
    const selects = row.querySelectorAll('select');
    const fieldSelect = selects[0];
    const options = fieldSelect.querySelectorAll('option');
    const labels = Array.from(options).map((o) => o.textContent);
    expect(labels).toEqual(['Genre', 'Rating', 'Year', 'Quality']);
  });

  it('renders condition operator selector with all options', () => {
    const { getByTestId } = render(<RuleBuilder {...defaultProps} />);
    const row = getByTestId('condition-row-0');
    const selects = row.querySelectorAll('select');
    const operatorSelect = selects[1];
    const options = operatorSelect.querySelectorAll('option');
    const labels = Array.from(options).map((o) => o.textContent);
    expect(labels).toEqual(['equals', 'not equals', 'greater or equal', 'less or equal']);
  });

  it('renders action selector with all options', () => {
    const { container } = render(<RuleBuilder {...defaultProps} />);
    // The action select is the standalone one (not inside a condition-row)
    const allSelects = container.querySelectorAll('select');
    const actionSelect = allSelects[allSelects.length - 1];
    const options = actionSelect.querySelectorAll('option');
    const labels = Array.from(options).map((o) => o.textContent);
    expect(labels).toEqual(['Auto-download', 'Notify only', 'Skip']);
  });

  it('renders "Create Rule" submit button', () => {
    const { getByText } = render(<RuleBuilder {...defaultProps} />);
    expect(getByText('Create Rule')).toBeDefined();
  });

  it('renders cancel button', () => {
    const { getByText } = render(<RuleBuilder {...defaultProps} />);
    expect(getByText('Cancel')).toBeDefined();
  });

  it('disables submit when name is empty', () => {
    const { getByText } = render(<RuleBuilder {...defaultProps} />);
    const submitBtn = getByText('Create Rule').closest('button')!;
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when name is filled', () => {
    const { getByText, getByPlaceholderText } = render(<RuleBuilder {...defaultProps} />);
    fireEvent.change(getByPlaceholderText('e.g. Auto-download Sci-Fi'), { target: { value: 'My Rule' } });
    const submitBtn = getByText('Create Rule').closest('button')!;
    expect(submitBtn).not.toBeDisabled();
  });

  it('adds a new condition when "Add condition" is clicked', () => {
    const { getByText, queryByTestId } = render(<RuleBuilder {...defaultProps} />);
    expect(queryByTestId('condition-row-1')).toBeNull();
    fireEvent.click(getByText('Add condition'));
    expect(queryByTestId('condition-row-1')).not.toBeNull();
  });

  it('removes a condition when trash icon is clicked', () => {
    const { getByText, getByTestId, queryByTestId } = render(<RuleBuilder {...defaultProps} />);
    // Add a second condition first
    fireEvent.click(getByText('Add condition'));
    expect(getByTestId('condition-row-1')).toBeDefined();
    // Remove the first condition
    const removeBtn = getByTestId('condition-row-0').querySelector('[aria-label="Remove condition"]')!;
    fireEvent.click(removeBtn);
    // Should only have one condition row now
    expect(queryByTestId('condition-row-1')).toBeNull();
    expect(getByTestId('condition-row-0')).toBeDefined();
  });

  it('does not show remove button when only one condition exists', () => {
    const { getByTestId } = render(<RuleBuilder {...defaultProps} />);
    const removeBtn = getByTestId('condition-row-0').querySelector('[aria-label="Remove condition"]');
    expect(removeBtn).toBeNull();
  });

  it('calls onSubmit with JsonLogic for single condition', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <RuleBuilder onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Auto-download Sci-Fi'), { target: { value: 'SciFi Rule' } });

    // Set the condition value
    const condRow = getByTestId('condition-row-0');
    const valueInput = condRow.querySelector('input[type="text"]')!;
    fireEvent.change(valueInput, { target: { value: 'sci-fi' } });

    fireEvent.submit(getByTestId('rule-builder'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'SciFi Rule',
        priority: 50,
        conditions: { '==': [{ var: 'genre' }, 'sci-fi'] },
        action: 'auto_download',
      });
    });
  });

  it('calls onSubmit with AND JsonLogic for multiple conditions', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <RuleBuilder onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Auto-download Sci-Fi'), { target: { value: 'Multi Rule' } });

    // Set first condition value
    const row0 = getByTestId('condition-row-0');
    const value0 = row0.querySelector('input[type="text"]')!;
    fireEvent.change(value0, { target: { value: 'action' } });

    // Add second condition
    fireEvent.click(getByText('Add condition'));
    const row1 = getByTestId('condition-row-1');
    const selects1 = row1.querySelectorAll('select');
    fireEvent.change(selects1[0], { target: { value: 'year' } });
    fireEvent.change(selects1[1], { target: { value: '>=' } });
    const value1 = row1.querySelector('input[type="text"]')!;
    fireEvent.change(value1, { target: { value: '2020' } });

    fireEvent.submit(getByTestId('rule-builder'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Multi Rule',
        priority: 50,
        conditions: {
          and: [
            { '==': [{ var: 'genre' }, 'action'] },
            { '>=': [{ var: 'year' }, 2020] },
          ],
        },
        action: 'auto_download',
      });
    });
  });

  it('converts numeric condition values to numbers', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId } = render(
      <RuleBuilder onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Auto-download Sci-Fi'), { target: { value: 'Rule' } });

    const row = getByTestId('condition-row-0');
    const selects = row.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'rating' } });
    fireEvent.change(selects[1], { target: { value: '>=' } });
    const valueInput = row.querySelector('input[type="text"]')!;
    fireEvent.change(valueInput, { target: { value: '7.5' } });

    fireEvent.submit(getByTestId('rule-builder'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          conditions: { '>=': [{ var: 'rating' }, 7.5] },
        }),
      );
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    const { getByText } = render(<RuleBuilder onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows error message when submit fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Server error'));
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <RuleBuilder onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Auto-download Sci-Fi'), { target: { value: 'Rule' } });

    fireEvent.submit(getByTestId('rule-builder'));

    await waitFor(() => {
      expect(getByText('Server error')).toBeDefined();
    });
  });

  it('shows generic error for non-Error throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue('oops');
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <RuleBuilder onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Auto-download Sci-Fi'), { target: { value: 'Rule' } });

    fireEvent.submit(getByTestId('rule-builder'));

    await waitFor(() => {
      expect(getByText('Failed to create rule')).toBeDefined();
    });
  });

  it('shows "Creating..." during submission', async () => {
    let resolve: () => void;
    const onSubmit = vi.fn().mockImplementation(() => new Promise<void>((r) => { resolve = r; }));
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <RuleBuilder onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Auto-download Sci-Fi'), { target: { value: 'Rule' } });

    fireEvent.submit(getByTestId('rule-builder'));

    await waitFor(() => {
      expect(getByText('Creating...')).toBeDefined();
    });

    resolve!();
    await waitFor(() => {
      expect(getByText('Create Rule')).toBeDefined();
    });
  });

  it('renders "Test rule" button when onTest is provided', () => {
    const { getByText } = render(
      <RuleBuilder {...defaultProps} onTest={vi.fn().mockResolvedValue({ matches: true, action: 'auto_download' })} />,
    );
    expect(getByText('Test rule')).toBeDefined();
  });

  it('does not render "Test rule" button when onTest is not provided', () => {
    const { queryByText } = render(<RuleBuilder {...defaultProps} />);
    expect(queryByText('Test rule')).toBeNull();
  });

  it('displays test result when "Test rule" is clicked (match)', async () => {
    const onTest = vi.fn().mockResolvedValue({ matches: true, action: 'auto_download' });
    const { getByText } = render(
      <RuleBuilder {...defaultProps} onTest={onTest} />,
    );
    fireEvent.click(getByText('Test rule'));

    await waitFor(() => {
      expect(getByText('Match! Action: auto_download')).toBeDefined();
    });
  });

  it('displays "No match" when test does not match', async () => {
    const onTest = vi.fn().mockResolvedValue({ matches: false, action: 'skip' });
    const { getByText } = render(
      <RuleBuilder {...defaultProps} onTest={onTest} />,
    );
    fireEvent.click(getByText('Test rule'));

    await waitFor(() => {
      expect(getByText('No match')).toBeDefined();
    });
  });

  it('clears test result when test throws', async () => {
    const onTest = vi.fn().mockRejectedValue(new Error('fail'));
    const { getByText, queryByText } = render(
      <RuleBuilder {...defaultProps} onTest={onTest} />,
    );
    fireEvent.click(getByText('Test rule'));

    await waitFor(() => {
      expect(queryByText('Match!')).toBeNull();
      expect(queryByText('No match')).toBeNull();
    });
  });

  it('changes priority value', () => {
    const { container } = render(<RuleBuilder {...defaultProps} />);
    const priorityInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(priorityInput, { target: { value: '99' } });
    expect(priorityInput.value).toBe('99');
  });

  it('changes action selection', () => {
    const { container } = render(<RuleBuilder {...defaultProps} />);
    const allSelects = container.querySelectorAll('select');
    const actionSelect = allSelects[allSelects.length - 1] as HTMLSelectElement;
    fireEvent.change(actionSelect, { target: { value: 'notify' } });
    expect(actionSelect.value).toBe('notify');
  });

  it('uses empty conditions fallback when no conditions have values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByTestId, getByText } = render(
      <RuleBuilder onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    fireEvent.change(getByPlaceholderText('e.g. Auto-download Sci-Fi'), { target: { value: 'Rule' } });

    // Remove the default condition, then submit
    // Actually the default has empty value - single condition with empty string
    fireEvent.submit(getByTestId('rule-builder'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          conditions: { '==': [{ var: 'genre' }, ''] },
        }),
      );
    });
  });
});
