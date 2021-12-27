// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  verbose: true,
  preset: 'jest-puppeteer',
  // Run just the e2e tests.
  testMatch: ['<rootDir>/e2e/**/*.test.js'],
  // Collect code coverage statistics by default.
  collectCoverage: true,
  coverageDirectory: 'coverage/e2e',
  // Collect junit report information for test runs:
  // https://www.npmjs.com/package/jest-junit
  reporters: [
    'default',
    [
      'jest-junit',
      { outputDirectory: 'reports/e2e', addFileAttribute: 'true' },
    ],
  ],
  transform: {
    // Configure so use esbuild, matching Hugo.
    // https://www.npmjs.com/package/esbuild-jest
    '^.+\\.[tj]sx?$': [
      'esbuild-jest',
      {
        sourcemap: true,
      },
    ],
  },
};

module.exports = config;
