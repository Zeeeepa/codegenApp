// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables for all tests
process.env.REACT_APP_API_TOKEN = 'test-token';
process.env.REACT_APP_API_BASE_URL = 'https://api.codegen.com';
process.env.REACT_APP_DEFAULT_ORGANIZATION = 'test-org';
process.env.REACT_APP_USER_ID = 'test-user';

// Polyfills for JSDOM tests
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock XPathResult for JSDOM tests
if (typeof global.XPathResult === 'undefined') {
  global.XPathResult = {
    FIRST_ORDERED_NODE_TYPE: 9,
    ORDERED_NODE_SNAPSHOT_TYPE: 7,
    UNORDERED_NODE_SNAPSHOT_TYPE: 6,
    ANY_TYPE: 0,
    NUMBER_TYPE: 1,
    STRING_TYPE: 2,
    BOOLEAN_TYPE: 3,
    UNORDERED_NODE_ITERATOR_TYPE: 4,
    ORDERED_NODE_ITERATOR_TYPE: 5,
    ANY_UNORDERED_NODE_TYPE: 8
  };
}

// Extend Jest global types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
    }
  }
}
