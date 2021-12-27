// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  verbose: true,
  // Collect code coverage statistics by default.
  collectCoverage: true,
  // Collect junit report information for test runs:
  // https://www.npmjs.com/package/jest-junit
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', addFileAttribute: 'true' }],
  ],
  // Configure for web app testing:
  // https://jestjs.io/docs/configuration#testenvironment-string
  testEnvironment: 'jsdom',
  transform: {
    // Configure so use esbuild, matching Hugo, with extra configuration for
    // Preact usage in the jsx files.
    // https://www.npmjs.com/package/esbuild-jest
    '^.+\\.[tj]sx?$': [
      'esbuild-jest',
      {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        sourcemap: true,
      },
    ],
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
