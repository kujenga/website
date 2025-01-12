// Configuration for the jest unit test execution.

const config = {
  verbose: true,
  // Test against everything but e2e tests.
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/node_modules/'],
  // Collect code coverage statistics by default.
  collectCoverage: true,
  coverageDirectory: 'coverage/js',
  // Collect junit report information for test runs:
  // https://www.npmjs.com/package/jest-junit
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports/js', addFileAttribute: 'true' }],
  ],
  // Configure for web app testing:
  // https://jestjs.io/docs/configuration#testenvironment-string
  testEnvironment: 'jsdom',
  transform: {
    // Configure so use esbuild, matching Hugo, with extra configuration for
    // Preact usage in the jsx files.
    // https://www.npmjs.com/package/esbuild-jest2
    '^.+\\.[tj]sx?$': [
      'esbuild-jest2',
      {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        sourcemap: true,
      },
    ],
  },
  transformIgnorePatterns: [
    // Resolve jest parsing issue:
    // https://github.com/react-dnd/react-dnd/issues/3443#issuecomment-1121131998
    '/node_modules/(?!preact)',
  ],
  moduleNameMapper: {
    // https://preactjs.com/guide/v10/getting-started#aliasing-in-jest
    '^react$': 'preact/compat',
    '^react-dom/test-utils$': 'preact/test-utils',
    '^react-dom$': 'preact/compat',
    '^react/jsx-runtime$': 'preact/jsx-runtime',
  },
};

module.exports = config;
