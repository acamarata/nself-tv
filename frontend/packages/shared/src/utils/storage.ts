/**
 * Storage abstraction supporting web localStorage, React Native AsyncStorage, and Tauri Store
 *
 * Implementations must be provided by platform-specific code
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Type-safe storage wrapper with JSON serialization
 */
export class Storage {
  constructor(private adapter: StorageAdapter) {}

  /**
   * Get typed value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.adapter.getItem(key);
    if (value === null) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set typed value in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    await this.adapter.setItem(key, JSON.stringify(value));
  }

  /**
   * Remove value from storage
   */
  async remove(key: string): Promise<void> {
    await this.adapter.removeItem(key);
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    await this.adapter.clear();
  }

  /**
   * Get string value (no JSON parsing)
   */
  async getString(key: string): Promise<string | null> {
    return this.adapter.getItem(key);
  }

  /**
   * Set string value (no JSON serialization)
   */
  async setString(key: string, value: string): Promise<void> {
    await this.adapter.setItem(key, value);
  }
}

/**
 * Web localStorage adapter
 */
export class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}

/**
 * In-memory storage adapter (for testing or platforms without persistence)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
