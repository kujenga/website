module.exports = {
  // Stop ESLint from cascading to configs above the project root, which
  // otherwise double-loads plugins when working from a nested git worktree
  // (e.g. .claude/worktrees/*).
  root: true,
  plugins: ['jest'],
  env: {
    browser: true,
    es2021: true,
    'jest/globals': true,
  },
  extends: ['eslint:recommended', 'preact', 'plugin:jsdoc/recommended'],
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
  rules: {
    'jsdoc/tag-lines': ['warn', 'never', { startLines: 1 }],
  },
};
