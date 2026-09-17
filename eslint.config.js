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
      // RTL is free if logical directions are used from the first screen, and a
      // sweep across every file if they aren't. Banned here rather than fixed
      // later (see #19).
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Property[key.name=/^(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderLeftColor|borderRightColor|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)$/]',
          message:
            'Use logical directions (start/end, marginStart, paddingEnd, borderStartStartRadius) so RTL works without a rewrite.',
        },
        {
          selector:
            'JSXAttribute[name.name=/[cC]lassName$/] Literal[value=/(^|\\s)-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|text-left|text-right)(-[^\\s]*)?(\\s|$)/]',
          message:
            'Use logical Tailwind utilities (ms/me, ps/pe, start/end, rounded-s/rounded-e, text-start/text-end) so RTL works without a rewrite.',
        },
        {
          selector: 'MemberExpression[property.name=/^(toLocaleTimeString|toTimeString)$/]',
          message:
            'Prayer times are never rendered as clock times. A window three minutes out is invisible; a clock three minutes out is a bug report.',
        },
      ],
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
