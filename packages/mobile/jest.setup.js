// Mock React Native modules
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock react-native-blob-util
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: {
        DocumentDir: '/mock/documents',
        DownloadDir: '/mock/downloads',
      },
      writeFile: jest.fn(() => Promise.resolve()),
    },
  },
}));

// Mock Firebase Firestore
jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestore = () => ({
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })),
          })),
        })),
      })),
      get: jest.fn(() => Promise.resolve({ docs: [] })),
    })),
  });

  mockFirestore.Timestamp = {
    fromDate: jest.fn((date) => date),
  };

  return {
    __esModule: true,
    default: mockFirestore,
  };
});
