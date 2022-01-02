module.exports = {
  env: {
    browser: true,
    es2021: true,
    'jest/globals': true,
  },
  extends: ['eslint:recommended', 'preact'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 13,
    sourceType: 'module',
  },
  ignorePatterns: [
    // Template files that will be processed by Hugo.
    '**/*.tpl.*',
    // THird party files we cannot modify directly.
    'assets/embed-like-gist/**/*',
  ],
  rules: {},
};
