/**
 * Accessibility (a11y) utilities and helpers
 * WCAG 2.1 Level AA compliance
 */

// Focus management
export class FocusManager {
  private static focusTrapStack: HTMLElement[] = [];

  /**
   * Trap focus within a container (for modals, dialogs)
   */
  static trapFocus(element: HTMLElement) {
    const focusableElements = this.getFocusableElements(element);

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
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

    element.addEventListener('keydown', handleTabKey);
    this.focusTrapStack.push(element);

    // Focus first element
    firstElement.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
      this.focusTrapStack = this.focusTrapStack.filter(el => el !== element);
    };
  }

  /**
   * Get all focusable elements within a container
   */
  static getFocusableElements(element: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(element.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }

  /**
   * Restore focus to previously focused element
   */
  static restoreFocus(previousElement: HTMLElement | null) {
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  }
}

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private liveRegion: HTMLElement | null = null;

  private constructor() {
    if (typeof document !== 'undefined') {
      this.createLiveRegion();
    }
  }

  static getInstance(): ScreenReaderAnnouncer {
    if (!this.instance) {
      this.instance = new ScreenReaderAnnouncer();
    }
    return this.instance;
  }

  private createLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);

    // Clear previous message
    this.liveRegion.textContent = '';

    // Set new message after a brief delay to ensure it's announced
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 100);
  }
}

// Keyboard navigation helpers
export const KeyboardShortcuts = {
  /**
   * Common keyboard shortcuts
   */
  SHORTCUTS: {
    ESCAPE: 'Escape',
    ENTER: 'Enter',
    SPACE: ' ',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    TAB: 'Tab',
  },

  /**
   * Handle arrow key navigation for lists
   */
  handleListNavigation(
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onSelect: (index: number) => void
  ) {
    let newIndex = currentIndex;

    switch (event.key) {
      case this.SHORTCUTS.ARROW_UP:
        event.preventDefault();
        newIndex = Math.max(0, currentIndex - 1);
        break;

      case this.SHORTCUTS.ARROW_DOWN:
        event.preventDefault();
        newIndex = Math.min(items.length - 1, currentIndex + 1);
        break;

      case this.SHORTCUTS.HOME:
        event.preventDefault();
        newIndex = 0;
        break;

      case this.SHORTCUTS.END:
        event.preventDefault();
        newIndex = items.length - 1;
        break;

      case this.SHORTCUTS.ENTER:
      case this.SHORTCUTS.SPACE:
        event.preventDefault();
        onSelect(currentIndex);
        return;

      default:
        return;
    }

    if (newIndex !== currentIndex && items[newIndex]) {
      items[newIndex].focus();
      onSelect(newIndex);
    }
  },
};

// Color contrast checker
export const ColorContrast = {
  /**
   * Calculate relative luminance (WCAG formula)
   */
  getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;

    const [rs, gs, bs] = [r, g, b].map(channel => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio(rgb1: { r: number; g: number; b: number }, rgb2: { r: number; g: number; b: number }): number {
    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Check if contrast ratio meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
   */
  meetsWCAG_AA(ratio: number, isLargeText: boolean = false): boolean {
    return ratio >= (isLargeText ? 3 : 4.5);
  },

  /**
   * Check if contrast ratio meets WCAG AAA (7:1 for normal text, 4.5:1 for large text)
   */
  meetsWCAG_AAA(ratio: number, isLargeText: boolean = false): boolean {
    return ratio >= (isLargeText ? 4.5 : 7);
  },
};

// ARIA helpers
export const ARIA = {
  /**
   * Generate unique IDs for ARIA relationships
   */
  generateId(prefix: string = 'a11y'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Common ARIA role constants
   */
  ROLES: {
    ALERT: 'alert',
    ALERTDIALOG: 'alertdialog',
    APPLICATION: 'application',
    ARTICLE: 'article',
    BANNER: 'banner',
    BUTTON: 'button',
    CHECKBOX: 'checkbox',
    DIALOG: 'dialog',
    GRID: 'grid',
    GRIDCELL: 'gridcell',
    HEADING: 'heading',
    IMG: 'img',
    LINK: 'link',
    LIST: 'list',
    LISTITEM: 'listitem',
    MAIN: 'main',
    MENU: 'menu',
    MENUITEM: 'menuitem',
    NAVIGATION: 'navigation',
    PROGRESSBAR: 'progressbar',
    RADIO: 'radio',
    RADIOGROUP: 'radiogroup',
    REGION: 'region',
    SEARCH: 'search',
    SLIDER: 'slider',
    STATUS: 'status',
    TAB: 'tab',
    TABLIST: 'tablist',
    TABPANEL: 'tabpanel',
    TEXTBOX: 'textbox',
    TOOLBAR: 'toolbar',
    TOOLTIP: 'tooltip',
  },

  /**
   * Common ARIA properties
   */
  PROPERTIES: {
    ATOMIC: 'aria-atomic',
    AUTOCOMPLETE: 'aria-autocomplete',
    BUSY: 'aria-busy',
    CHECKED: 'aria-checked',
    CONTROLS: 'aria-controls',
    CURRENT: 'aria-current',
    DESCRIBEDBY: 'aria-describedby',
    DISABLED: 'aria-disabled',
    EXPANDED: 'aria-expanded',
    HASPOPUP: 'aria-haspopup',
    HIDDEN: 'aria-hidden',
    INVALID: 'aria-invalid',
    LABEL: 'aria-label',
    LABELLEDBY: 'aria-labelledby',
    LEVEL: 'aria-level',
    LIVE: 'aria-live',
    MODAL: 'aria-modal',
    MULTISELECTABLE: 'aria-multiselectable',
    ORIENTATION: 'aria-orientation',
    OWNS: 'aria-owns',
    PLACEHOLDER: 'aria-placeholder',
    PRESSED: 'aria-pressed',
    READONLY: 'aria-readonly',
    RELEVANT: 'aria-relevant',
    REQUIRED: 'aria-required',
    SELECTED: 'aria-selected',
    SORT: 'aria-sort',
    VALUEMAX: 'aria-valuemax',
    VALUEMIN: 'aria-valuemin',
    VALUENOW: 'aria-valuenow',
    VALUETEXT: 'aria-valuetext',
  },
};

// Skip links for keyboard navigation
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.className = 'sr-only sr-only-focusable';
  skipLink.textContent = label;

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  return skipLink;
}

// Export singleton announcer
export const announcer = ScreenReaderAnnouncer.getInstance();

// Utility to check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Utility to check if user prefers high contrast
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(prefers-contrast: high)').matches ||
    window.matchMedia('(-ms-high-contrast: active)').matches
  );
}
