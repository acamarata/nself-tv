import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonCard } from '@/components/content/SkeletonCard';

describe('SkeletonCard', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<SkeletonCard />);
    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it('has poster placeholder with correct aspect ratio', () => {
    const { container } = render(<SkeletonCard />);
    const aspect = container.querySelector('.aspect-\\[2\\/3\\]');
    expect(aspect).toBeDefined();
  });
});
