// Set up any necessary global variables or configurations for Jest tests

// Example: Mocking a global function
global.fetch = require('node-fetch');

// Example: Setting up environment variables
process.env.NODE_ENV = 'test';

// Example: Adding custom matchers from jest-extended
import 'jest-extended';

// Example: Mocking a module
jest.mock('some-module', () => {
  return {
    someFunction: jest.fn().mockReturnValue('mocked value'),
  };
});
