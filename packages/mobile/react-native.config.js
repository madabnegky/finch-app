module.exports = {
  project: {
    ios: {
      sourceDir: './ios',
    },
    android: {
      sourceDir: './android',
    },
  },
  dependencies: {
    // Explicitly list dependencies from the root node_modules
  },
  assets: [
    '../../node_modules/react-native-vector-icons/Fonts/',
    './src/assets/videos/',
  ],
};
