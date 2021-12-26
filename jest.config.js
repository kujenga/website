// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  verbose: true,
  // Collect code coverage statistics by default.
  collectCoverage: true,
  // Configure for web app testing:
  // https://jestjs.io/docs/configuration#testenvironment-string
  testEnvironment: 'jsdom',
  transform: {
    // https://www.npmjs.com/package/esbuild-jest
    '^.+\\.[tj]sx?$': ['esbuild-jest', { sourcemap: true }],
  },
  moduleNameMapper: {
    // https://preactjs.com/guide/v10/getting-started#aliasing-in-jest
    '^react$': 'preact/compat',
    '^react-dom/test-utils$': 'preact/test-utils',
    '^react-dom$': 'preact/compat',
    '^react/jsx-runtime$': 'preact/jsx-runtime',
  },
};

module.exports = config;
