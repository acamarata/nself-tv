import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import DeviceCodeDisplay from '@/components/auth/DeviceCodeDisplay';

describe('DeviceCodeDisplay', () => {
  it('shows generate button when no code', () => {
    const { getByText } = render(
      <DeviceCodeDisplay
        code={null}
        status="idle"
        expiresIn={300}
        onRequestCode={vi.fn()}
      />,
    );
    expect(getByText('Generate Code')).toBeDefined();
  });

  it('calls onRequestCode when generate button clicked', () => {
    const onRequestCode = vi.fn();
    const { getByText } = render(
      <DeviceCodeDisplay
        code={null}
        status="idle"
        expiresIn={300}
        onRequestCode={onRequestCode}
      />,
    );
    fireEvent.click(getByText('Generate Code'));
    expect(onRequestCode).toHaveBeenCalled();
  });

  it('displays code when pending', () => {
    const { getByText } = render(
      <DeviceCodeDisplay
        code="ABC123"
        status="pending"
        expiresIn={300}
        onRequestCode={vi.fn()}
      />,
    );
    expect(getByText('ABC123')).toBeDefined();
    expect(getByText(/Waiting for authorization/)).toBeDefined();
  });

  it('shows countdown timer', () => {
    const { getByText } = render(
      <DeviceCodeDisplay
        code="ABC123"
        status="pending"
        expiresIn={125}
        onRequestCode={vi.fn()}
      />,
    );
    expect(getByText('2:05')).toBeDefined();
  });

  it('shows authorized state', () => {
    const { getByText } = render(
      <DeviceCodeDisplay
        code="ABC123"
        status="authorized"
        expiresIn={0}
        onRequestCode={vi.fn()}
      />,
    );
    expect(getByText('Device Authorized')).toBeDefined();
  });

  it('shows expired state with request new code button', () => {
    const { getByText } = render(
      <DeviceCodeDisplay
        code="ABC123"
        status="expired"
        expiresIn={0}
        onRequestCode={vi.fn()}
      />,
    );
    expect(getByText('Code Expired')).toBeDefined();
    expect(getByText('Request New Code')).toBeDefined();
  });
});
