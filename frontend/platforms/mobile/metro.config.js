const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration for React Native
 * with support for pnpm workspaces and monorepo
 */
const config = {
  watchFolders: [
    path.resolve(__dirname, '../../packages/shared'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    extraNodeModules: {
      '@ntv/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
