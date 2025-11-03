module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-blob-util|@react-native-firebase)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
