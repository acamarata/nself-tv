module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 85, // Some branches like NODE_ENV fallback are untestable in Jest
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
