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
  global.XPathResult = class XPathResult {
    static readonly FIRST_ORDERED_NODE_TYPE = 9;
    static readonly ORDERED_NODE_SNAPSHOT_TYPE = 7;
    static readonly UNORDERED_NODE_SNAPSHOT_TYPE = 6;
    static readonly ANY_TYPE = 0;
    static readonly NUMBER_TYPE = 1;
    static readonly STRING_TYPE = 2;
    static readonly BOOLEAN_TYPE = 3;
    static readonly UNORDERED_NODE_ITERATOR_TYPE = 4;
    static readonly ORDERED_NODE_ITERATOR_TYPE = 5;
    static readonly ANY_UNORDERED_NODE_TYPE = 8;
  } as any;
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
