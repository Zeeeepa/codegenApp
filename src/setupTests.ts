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

