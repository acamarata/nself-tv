/**
 * Controller abstraction layer for cross-platform input handling
 * Supports: d-pad, remote, touch, mouse, keyboard, gamepad
 */

export type InputType = 'dpad' | 'remote' | 'touch' | 'mouse' | 'keyboard' | 'gamepad';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Action = 'select' | 'back' | 'menu' | 'play' | 'pause' | 'next' | 'prev';

export interface InputEvent {
  type: InputType;
  action: Action | Direction | null;
  timestamp: number;
  rawEvent?: any;
}

export interface ControllerAdapter {
  /**
   * Platform-specific initialization
   */
  initialize(): void;

  /**
   * Register input handler
   */
  onInput(handler: (event: InputEvent) => void): () => void;

  /**
   * Check if input type is available on this platform
   */
  isAvailable(type: InputType): boolean;

  /**
   * Get primary input type for this platform
   */
  getPrimaryInputType(): InputType;

  /**
   * Cleanup
   */
  destroy(): void;
}

/**
 * Base controller implementation
 */
export class BaseController implements ControllerAdapter {
  protected handlers: Array<(event: InputEvent) => void> = [];
  protected keyboardListener: ((e: KeyboardEvent) => void) | null = null;
  protected mouseListener: ((e: MouseEvent) => void) | null = null;

  initialize(): void {
    // Keyboard support (universal)
    this.keyboardListener = (e: KeyboardEvent) => {
      const event = this.mapKeyboardEvent(e);
      if (event) {
        this.notifyHandlers(event);
      }
    };
    window.addEventListener('keydown', this.keyboardListener);

    // Mouse support (desktop)
    this.mouseListener = (e: MouseEvent) => {
      if (e.type === 'click') {
        this.notifyHandlers({
          type: 'mouse',
          action: 'select',
          timestamp: Date.now(),
          rawEvent: e,
        });
      }
    };
    window.addEventListener('click', this.mouseListener);
  }

  onInput(handler: (event: InputEvent) => void): () => void {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  isAvailable(type: InputType): boolean {
    switch (type) {
      case 'keyboard':
      case 'mouse':
        return typeof window !== 'undefined';
      case 'touch':
        return typeof window !== 'undefined' && 'ontouchstart' in window;
      case 'gamepad':
        return typeof navigator !== 'undefined' && 'getGamepads' in navigator;
      default:
        return false;
    }
  }

  getPrimaryInputType(): InputType {
    if (this.isAvailable('touch')) return 'touch';
    if (this.isAvailable('mouse')) return 'mouse';
    return 'keyboard';
  }

  destroy(): void {
    if (this.keyboardListener) {
      window.removeEventListener('keydown', this.keyboardListener);
    }
    if (this.mouseListener) {
      window.removeEventListener('click', this.mouseListener);
    }
    this.handlers = [];
  }

  protected mapKeyboardEvent(e: KeyboardEvent): InputEvent | null {
    const keyMap: Record<string, Action | Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      Enter: 'select',
      ' ': 'select',
      Escape: 'back',
      Backspace: 'back',
      m: 'menu',
      M: 'menu',
      p: 'play',
      P: 'play',
    };

    const action = keyMap[e.key];
    if (!action) return null;

    return {
      type: 'keyboard',
      action,
      timestamp: Date.now(),
      rawEvent: e,
    };
  }

  protected notifyHandlers(event: InputEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }
}

/**
 * TV Remote controller (for Android TV, Roku, webOS, tvOS, Tizen)
 */
export class TVRemoteController extends BaseController {
  getPrimaryInputType(): InputType {
    return 'remote';
  }

  isAvailable(type: InputType): boolean {
    if (type === 'remote' || type === 'dpad') return true;
    return super.isAvailable(type);
  }
}

/**
 * Touch controller (for mobile)
 */
export class TouchController extends BaseController {
  private touchStartX = 0;
  private touchStartY = 0;
  private touchListener: ((e: TouchEvent) => void) | null = null;

  initialize(): void {
    super.initialize();

    this.touchListener = (e: TouchEvent) => {
      if (e.type === 'touchstart') {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      } else if (e.type === 'touchend') {
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaY = e.changedTouches[0].clientY - this.touchStartY;
        const minSwipeDistance = 50;

        if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
          let direction: Direction;
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }

          this.notifyHandlers({
            type: 'touch',
            action: direction,
            timestamp: Date.now(),
            rawEvent: e,
          });
        } else {
          // Tap
          this.notifyHandlers({
            type: 'touch',
            action: 'select',
            timestamp: Date.now(),
            rawEvent: e,
          });
        }
      }
    };

    window.addEventListener('touchstart', this.touchListener);
    window.addEventListener('touchend', this.touchListener);
  }

  getPrimaryInputType(): InputType {
    return 'touch';
  }

  destroy(): void {
    super.destroy();
    if (this.touchListener) {
      window.removeEventListener('touchstart', this.touchListener);
      window.removeEventListener('touchend', this.touchListener);
    }
  }
}

/**
 * Factory to create appropriate controller for current platform
 */
export function createController(): ControllerAdapter {
  // TV platforms
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (
      ua.includes('tv') ||
      ua.includes('roku') ||
      ua.includes('webos') ||
      ua.includes('tizen')
    ) {
      return new TVRemoteController();
    }
  }

  // Mobile platforms
  if (typeof window !== 'undefined' && 'ontouchstart' in window) {
    return new TouchController();
  }

  // Desktop platforms (mouse + keyboard)
  return new BaseController();
}
