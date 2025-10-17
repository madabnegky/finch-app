const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  // 1. WATCH FOLDERS
  watchFolders: [
    // The root of the monorepo where node_modules is located
    path.resolve(__dirname, '../..'),
    // The shared-logic package
    path.resolve(__dirname, '../shared-logic'),
  ],

  // 2. EXTRA NODE MODULES
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, '../../node_modules'),
    ],
    // Map @shared alias to the shared-logic package
    extraNodeModules: {
      '@shared': path.resolve(__dirname, '../shared-logic/src'),
    },
    // Support package.json exports
    unstable_enablePackageExports: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);