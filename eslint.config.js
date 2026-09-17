const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');
const expo = require('eslint-plugin-expo');
const globals = require('globals');

/**
 * Hand-rolled instead of `eslint-config-expo` because that config depends on
 * eslint-plugin-react and eslint-plugin-import, neither of which supports
 * ESLint 10 (both cap their peer range at ^9). Everything below does.
 */
module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    plugins: { expo },
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, __DEV__: 'readonly' },
    },
    rules: {
      'expo/no-dynamic-env-var': 'error',
      'expo/no-env-var-destructuring': 'error',
      'expo/prefer-box-shadow': 'error',
      'expo/use-dom-exports': 'error',
      // Metro resolves assets through require(), and _-prefixed args are
      // deliberately unused (widget render callbacks take a fixed signature).
      '@typescript-eslint/no-require-imports': [
        'error',
        { allow: ['\\.(png|jpe?g|gif|svg|xml)$'] },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Build tooling is CommonJS by necessity.
  {
    files: ['*.config.js', 'eslint.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  { ignores: ['dist/*', '.expo/*', 'expo-env.d.ts'] },
];
