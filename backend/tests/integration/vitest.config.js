import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Run from the integration test directory
    root: resolve(import.meta.dirname),

    // Include all test files
    include: ['test_*.js'],

    // No need for DOM
    environment: 'node',

    // Reasonable timeout for file-reading tests
    testTimeout: 10000,

    // Reporter configuration
    reporters: ['verbose'],
  },

  resolve: {
    alias: {
      '@backend': resolve(import.meta.dirname, '../../'),
    },
  },
});
