import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';

describe('ProfileAvatar', () => {
  it('renders fallback letter when no avatarUrl', () => {
    const { getByText } = render(
      <ProfileAvatar profile={{ displayName: 'John', avatarUrl: null }} />,
    );
    expect(getByText('J')).toBeDefined();
  });

  it('renders avatar image when avatarUrl provided', () => {
    const { container } = render(
      <ProfileAvatar profile={{ displayName: 'John', avatarUrl: '/avatar.jpg' }} />,
    );
    const img = container.querySelector('img');
    expect(img).toBeDefined();
  });

  it('applies sm size', () => {
    const { container } = render(
      <ProfileAvatar profile={{ displayName: 'John', avatarUrl: null }} size="sm" />,
    );
    const div = container.firstElementChild;
    expect(div?.className).toContain('w-8');
  });

  it('applies md size by default', () => {
    const { container } = render(
      <ProfileAvatar profile={{ displayName: 'John', avatarUrl: null }} />,
    );
    const div = container.firstElementChild;
    expect(div?.className).toContain('w-12');
  });

  it('applies lg size', () => {
    const { container } = render(
      <ProfileAvatar profile={{ displayName: 'John', avatarUrl: null }} size="lg" />,
    );
    const div = container.firstElementChild;
    expect(div?.className).toContain('w-24');
  });
});
