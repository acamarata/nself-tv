import { describe, it, expect, beforeEach } from 'vitest';
import { Storage, MemoryStorageAdapter, WebStorageAdapter } from './storage';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(new MemoryStorageAdapter());
  });

  describe('get/set', () => {
    it('should store and retrieve typed values', async () => {
      await storage.set('key', { name: 'John', age: 30 });
      const value = await storage.get<{ name: string; age: number }>('key');
      expect(value).toEqual({ name: 'John', age: 30 });
    });

    it('should return null for non-existent keys', async () => {
      const value = await storage.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should handle primitive types', async () => {
      await storage.set('string', 'hello');
      await storage.set('number', 42);
      await storage.set('boolean', true);

      expect(await storage.get('string')).toBe('hello');
      expect(await storage.get('number')).toBe(42);
      expect(await storage.get('boolean')).toBe(true);
    });

    it('should handle arrays', async () => {
      await storage.set('array', [1, 2, 3]);
      expect(await storage.get('array')).toEqual([1, 2, 3]);
    });

    it('should handle null values', async () => {
      await storage.set('null', null);
      expect(await storage.get('null')).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      await storage.getString('invalid', 'not json');
      const value = await storage.get('invalid');
      expect(value).toBeNull();
    });
  });

  describe('getString/setString', () => {
    it('should store and retrieve plain strings', async () => {
      await storage.setString('key', 'plain string');
      const value = await storage.getString('key');
      expect(value).toBe('plain string');
    });

    it('should not parse JSON', async () => {
      await storage.setString('json', '{"key": "value"}');
      const value = await storage.getString('json');
      expect(value).toBe('{"key": "value"}');
    });
  });

  describe('remove', () => {
    it('should remove value', async () => {
      await storage.set('key', 'value');
      await storage.remove('key');
      const value = await storage.get('key');
      expect(value).toBeNull();
    });

    it('should not throw when removing non-existent key', async () => {
      await expect(storage.remove('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all values', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.clear();

      expect(await storage.get('key1')).toBeNull();
      expect(await storage.get('key2')).toBeNull();
    });
  });
});

describe('MemoryStorageAdapter', () => {
  let adapter: MemoryStorageAdapter;

  beforeEach(() => {
    adapter = new MemoryStorageAdapter();
  });

  it('should store and retrieve items', async () => {
    await adapter.setItem('key', 'value');
    expect(await adapter.getItem('key')).toBe('value');
  });

  it('should return null for non-existent keys', async () => {
    expect(await adapter.getItem('nonexistent')).toBeNull();
  });

  it('should remove items', async () => {
    await adapter.setItem('key', 'value');
    await adapter.removeItem('key');
    expect(await adapter.getItem('key')).toBeNull();
  });

  it('should clear all items', async () => {
    await adapter.setItem('key1', 'value1');
    await adapter.setItem('key2', 'value2');
    await adapter.clear();

    expect(await adapter.getItem('key1')).toBeNull();
    expect(await adapter.getItem('key2')).toBeNull();
  });

  it('should handle multiple operations', async () => {
    await adapter.setItem('key1', 'value1');
    await adapter.setItem('key2', 'value2');
    await adapter.setItem('key3', 'value3');

    expect(await adapter.getItem('key1')).toBe('value1');
    expect(await adapter.getItem('key2')).toBe('value2');
    expect(await adapter.getItem('key3')).toBe('value3');

    await adapter.removeItem('key2');
    expect(await adapter.getItem('key2')).toBeNull();
    expect(await adapter.getItem('key1')).toBe('value1');
    expect(await adapter.getItem('key3')).toBe('value3');
  });
});

describe('WebStorageAdapter', () => {
  let adapter: WebStorageAdapter;

  beforeEach(() => {
    // Skip if localStorage not available (Node.js environment)
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.clear();
    adapter = new WebStorageAdapter();
  });

  it.skipIf(typeof localStorage === 'undefined')('should store and retrieve items', async () => {
    await adapter.setItem('key', 'value');
    expect(await adapter.getItem('key')).toBe('value');
  });

  it.skipIf(typeof localStorage === 'undefined')('should return null for non-existent keys', async () => {
    expect(await adapter.getItem('nonexistent')).toBeNull();
  });

  it.skipIf(typeof localStorage === 'undefined')('should remove items', async () => {
    await adapter.setItem('key', 'value');
    await adapter.removeItem('key');
    expect(await adapter.getItem('key')).toBeNull();
  });

  it.skipIf(typeof localStorage === 'undefined')('should clear all items', async () => {
    await adapter.setItem('key1', 'value1');
    await adapter.setItem('key2', 'value2');
    await adapter.clear();

    expect(await adapter.getItem('key1')).toBeNull();
    expect(await adapter.getItem('key2')).toBeNull();
  });

  it.skipIf(typeof localStorage === 'undefined')('should use localStorage', async () => {
    await adapter.setItem('key', 'value');
    expect(localStorage.getItem('key')).toBe('value');
  });
});
