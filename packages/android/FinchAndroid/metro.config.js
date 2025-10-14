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
    // The root of the monorepo
    path.resolve(__dirname, '../../..'),
    // The shared-logic package (Corrected Path)
    path.resolve(__dirname, '../../shared-logic'),
  ],

  // 2. EXTRA NODE MODULES
  resolver: {
    extraNodeModules: new Proxy(
      {},
      {
        get: (target, name) => {
          if (name === 'react' || name === 'react-native') {
            return path.join(__dirname, `node_modules/${name}`);
          }
          return path.join(process.cwd(), `node_modules/${name}`);
        },
      },
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);