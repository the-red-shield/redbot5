export default {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js', '<rootDir>/jest.polyfills.js'], // Include jest.polyfills.js
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleNameMapper: {
    "^axios$": "axios/dist/node/axios.cjs" // Correct path as a string
  },
  "resolver": undefined
};
