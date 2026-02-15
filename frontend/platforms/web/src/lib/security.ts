/**
 * Security utilities and helpers
 * Includes XSS prevention, CSP, input sanitization, and secure storage
 */

// Input sanitization
export const Sanitize = {
  /**
   * Sanitize HTML to prevent XSS attacks
   * Note: React auto-escapes by default, but this is for cases where dangerouslySetInnerHTML is needed
   */
  html(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Sanitize URL to prevent javascript: and data: protocols
   */
  url(input: string): string {
    const url = input.trim().toLowerCase();

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.some(proto => url.startsWith(proto))) {
      return '';
    }

    return input;
  },

  /**
   * Sanitize string for use in SQL LIKE clauses (prevent SQL injection in search)
   */
  sqlLike(input: string): string {
    return input.replace(/[%_\\]/g, '\\$&');
  },

  /**
   * Sanitize filename to prevent path traversal
   */
  filename(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+/, '')
      .substring(0, 255);
  },
};

// Content Security Policy helpers
export const CSP = {
  /**
   * Generate nonce for inline scripts
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)));
  },

  /**
   * CSP directives for nself-tv
   */
  getDirectives(nonce?: string): Record<string, string[]> {
    return {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        nonce ? `'nonce-${nonce}'` : '',
        'https://www.gstatic.com', // Google Cast SDK
      ].filter(Boolean),
      'style-src': ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'media-src': ["'self'", 'https:', 'blob:'],
      'connect-src': [
        "'self'",
        'wss://*.nself.org', // WebSocket for GraphQL subscriptions
        'https://*.nself.org',
      ],
      'font-src': ["'self'", 'data:'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'self'"],
      'upgrade-insecure-requests': [],
    };
  },

  /**
   * Convert directives to CSP header value
   */
  toString(directives: Record<string, string[]>): string {
    return Object.entries(directives)
      .map(([key, values]) => `${key} ${values.join(' ')}`.trim())
      .join('; ');
  },
};

// Secure storage (encrypted localStorage)
export class SecureStorage {
  private static readonly ENCRYPTION_KEY_NAME = 'nself-tv-encryption-key';
  private static encryptionKey: CryptoKey | null = null;

  /**
   * Initialize encryption key
   */
  private static async getOrCreateKey(): Promise<CryptoKey> {
    if (this.encryptionKey) return this.encryptionKey;

    // Try to load existing key from IndexedDB
    // For now, generate a new key each session (better: persist in IndexedDB)
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    this.encryptionKey = key;
    return key;
  }

  /**
   * Encrypt and store data
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      const encryptionKey = await this.getOrCreateKey();

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        new TextEncoder().encode(value)
      );

      // Store IV + encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      localStorage.setItem(key, btoa(String.fromCharCode(...combined)));
    } catch (error) {
      console.error('Secure storage encryption failed:', error);
      // Fallback to regular localStorage
      localStorage.setItem(key, value);
    }
  }

  /**
   * Decrypt and retrieve data
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const encryptionKey = await this.getOrCreateKey();

      // Decode stored data
      const combined = new Uint8Array(
        atob(stored).split('').map(c => c.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Secure storage decryption failed:', error);
      // Fallback to regular localStorage
      return localStorage.getItem(key);
    }
  }

  /**
   * Remove item
   */
  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all secure storage
   */
  static clear(): void {
    localStorage.clear();
  }
}

// Token management with expiry checks
export class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry';

  /**
   * Store auth token with expiry
   */
  static async setToken(token: string, expiresIn: number) {
    const expiry = Date.now() + expiresIn * 1000;

    await SecureStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiry.toString());
  }

  /**
   * Get auth token (null if expired)
   */
  static async getToken(): Promise<string | null> {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

    if (!expiry || Date.now() >= parseInt(expiry)) {
      this.clearToken();
      return null;
    }

    return await SecureStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    return !expiry || Date.now() >= parseInt(expiry);
  }

  /**
   * Clear auth token
   */
  static clearToken() {
    SecureStorage.removeItem(this.TOKEN_KEY);
    SecureStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Refresh token before expiry (call 5min before expiry)
   */
  static shouldRefresh(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return false;

    const expiryTime = parseInt(expiry);
    const fiveMinutes = 5 * 60 * 1000;

    return Date.now() >= expiryTime - fiveMinutes;
  }
}

// Rate limiting for client-side actions
export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
   * Check if action is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.timestamps.get(key) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.timestamps.set(key, validTimestamps);

    return true;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string) {
    this.timestamps.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear() {
    this.timestamps.clear();
  }
}

// Password strength validator
export const Password = {
  /**
   * Check password strength
   */
  checkStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      feedback.push('Add lowercase letters');
    }
    if (!/[A-Z]/.test(password)) {
      feedback.push('Add uppercase letters');
    }
    if (!/[0-9]/.test(password)) {
      feedback.push('Add numbers');
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      feedback.push('Add special characters');
    }

    // Check common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      feedback.push('Avoid common passwords');
      score = Math.max(0, score - 2);
    }

    return { score, feedback };
  },

  /**
   * Generate random secure password
   */
  generate(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    return Array.from(array)
      .map(x => charset[x % charset.length])
      .join('');
  },
};

// CSRF token management
export class CSRFProtection {
  private static readonly TOKEN_KEY = 'csrf_token';
  private static readonly HEADER_NAME = 'X-CSRF-Token';

  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = btoa(String.fromCharCode(...array));

    sessionStorage.setItem(this.TOKEN_KEY, token);
    return token;
  }

  /**
   * Get current CSRF token
   */
  static getToken(): string | null {
    let token = sessionStorage.getItem(this.TOKEN_KEY);

    if (!token) {
      token = this.generateToken();
    }

    return token;
  }

  /**
   * Add CSRF token to fetch headers
   */
  static addToHeaders(headers: HeadersInit = {}): HeadersInit {
    const token = this.getToken();

    if (token) {
      return {
        ...headers,
        [this.HEADER_NAME]: token,
      };
    }

    return headers;
  }

  /**
   * Verify CSRF token
   */
  static verifyToken(token: string): boolean {
    const storedToken = this.getToken();
    return storedToken === token;
  }
}

// Export rate limiter instances for common actions
export const searchRateLimiter = new RateLimiter(10, 60000); // 10 searches per minute
export const uploadRateLimiter = new RateLimiter(5, 300000); // 5 uploads per 5 minutes
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 API calls per minute
