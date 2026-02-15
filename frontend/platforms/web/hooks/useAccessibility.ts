import { useEffect, useRef, useCallback } from 'react';

/**
 * Screen reader announcements
 */
export function useScreenReader() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcer element if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcerRef.current) {
      announcerRef.current.setAttribute('aria-live', priority);
      announcerRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return { announce };
}

/**
 * Focus management
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [containerRef, isActive]);
}

/**
 * Focus restoration (save and restore focus when opening/closing modals)
 */
export function useFocusRestore() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * Skip links for keyboard navigation
 */
export function useSkipLinks() {
  useEffect(() => {
    // Add skip link container if it doesn't exist
    if (!document.getElementById('skip-links')) {
      const skipLinksContainer = document.createElement('div');
      skipLinksContainer.id = 'skip-links';
      skipLinksContainer.className = 'skip-links';

      const skipToMain = document.createElement('a');
      skipToMain.href = '#main-content';
      skipToMain.textContent = 'Skip to main content';
      skipToMain.className = 'skip-link';

      const skipToNav = document.createElement('a');
      skipToNav.href = '#main-navigation';
      skipToNav.textContent = 'Skip to navigation';
      skipToNav.className = 'skip-link';

      skipLinksContainer.appendChild(skipToMain);
      skipLinksContainer.appendChild(skipToNav);

      document.body.insertBefore(skipLinksContainer, document.body.firstChild);

      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .skip-links {
          position: absolute;
          top: -1000px;
          left: 0;
          width: 100%;
          z-index: 100000;
        }
        .skip-link {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          padding: 1rem 2rem;
          background: #000;
          color: #fff;
          text-decoration: none;
          border-radius: 0 0 8px 8px;
          font-size: 1rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        .skip-link:focus {
          top: 0;
        }
        .skip-link:hover {
          background: #4a9eff;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
}

/**
 * Reduced motion preference
 */
export function useReducedMotion() {
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  return prefersReducedMotion;
}

/**
 * High contrast mode detection
 */
export function useHighContrast() {
  const prefersHighContrast =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-contrast: high)').matches ||
        window.matchMedia('(prefers-contrast: more)').matches
      : false;

  return prefersHighContrast;
}

/**
 * Accessible route announcements
 */
export function useRouteAnnouncer() {
  const { announce } = useScreenReader();

  useEffect(() => {
    // Announce page title on route change
    const observer = new MutationObserver(() => {
      const title = document.title.replace(' - nself-tv', '');
      announce(`Navigated to ${title}`);
    });

    observer.observe(document.querySelector('title')!, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [announce]);
}

/**
 * ARIA live region for dynamic content
 */
export function useLiveRegion() {
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!regionRef.current) {
      const region = document.createElement('div');
      region.id = 'live-region';
      region.setAttribute('role', 'region');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'false');
      region.style.position = 'absolute';
      region.style.left = '-10000px';
      region.style.width = '1px';
      region.style.height = '1px';
      region.style.overflow = 'hidden';
      document.body.appendChild(region);
      regionRef.current = region;
    }

    return () => {
      if (regionRef.current) {
        document.body.removeChild(regionRef.current);
        regionRef.current = null;
      }
    };
  }, []);

  const update = useCallback((content: string) => {
    if (regionRef.current) {
      regionRef.current.textContent = content;
    }
  }, []);

  return { update };
}

/**
 * Keyboard navigation helpers
 */
export function useArrowNavigation(
  itemsRef: React.RefObject<HTMLElement[]>,
  options: {
    wrap?: boolean;
    horizontal?: boolean;
    onActivate?: (index: number) => void;
  } = {}
) {
  const { wrap = true, horizontal = false, onActivate } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!itemsRef.current || itemsRef.current.length === 0) return;

      const items = itemsRef.current;
      const currentIndex = items.findIndex((item) => item === document.activeElement);

      if (currentIndex === -1) return;

      const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';

      let nextIndex = currentIndex;

      if (e.key === nextKey) {
        e.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = wrap ? 0 : items.length - 1;
        }
      } else if (e.key === prevKey) {
        e.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = wrap ? items.length - 1 : 0;
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate?.(currentIndex);
        return;
      } else {
        return;
      }

      items[nextIndex]?.focus();
    },
    [itemsRef, wrap, horizontal, onActivate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * ARIA labels utility
 */
export function getAriaLabel(type: string, data: any): string {
  switch (type) {
    case 'content-card':
      return `${data.title}, ${data.year}, rated ${data.rating} out of 10${
        data.genres ? `, genres: ${data.genres.join(', ')}` : ''
      }`;

    case 'player':
      return `Video player${data.title ? ` for ${data.title}` : ''}${
        data.paused ? ', paused' : ', playing'
      }, ${data.currentTime} of ${data.duration}`;

    case 'progress':
      return `${data.percent}% complete${data.title ? ` of ${data.title}` : ''}`;

    default:
      return '';
  }
}
