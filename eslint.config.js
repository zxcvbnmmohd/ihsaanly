const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const reactHooks = require('eslint-plugin-react-hooks')
const expo = require('eslint-plugin-expo')
const globals = require('globals')
const singleUseState = require('./eslint-rules/single-use-state')
const noDefaultExport = require('./eslint-rules/no-default-export')
const kebabCaseFilename = require('./eslint-rules/kebab-case-filename')

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
    plugins: {
      expo,
      local: {
        rules: {
          'single-use-state': singleUseState,
          'no-default-export': noDefaultExport,
          'kebab-case-filename': kebabCaseFilename,
        },
      },
    },
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
      // Explicit over implicit: every function and component declares what it
      // returns. Callbacks passed to an already-typed prop are exempt — the
      // type is stated once, at the prop.
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'local/single-use-state': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
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
  // Build tooling and the local lint rules are CommonJS by necessity, and the
  // TypeScript-only rules do not apply to them.
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  // Scaffold sample widgets, replaced wholesale in #16. Their render functions
  // return framework-specific shapes, not ReactElement.
  {
    files: ['src/widgets/**'],
    rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
  },
  // Our own source follows kebab-case; root config files follow ecosystem
  // naming conventions instead.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'local/kebab-case-filename': 'error' },
  },
  // Named exports everywhere except routes, which Expo Router requires to
  // default-export.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/**', 'src/widgets/**'],
    rules: { 'local/no-default-export': 'error' },
  },
  // The domain layer stays pure: no React, no React Native, no storage, no
  // native modules. This is what keeps the decision seam testable without a
  // device, and it has already been broken once.
  {
    files: [
      'src/content/**',
      'src/day/**',
      'src/hijri/calendar.ts',
      'src/prayer/{calculation,times,windows,qada}.ts',
      'src/location/{place,cities}.ts',
      'src/plan/{plan,day-match,signals,user-state,quiet-hours,notification-preferences,history}.ts',
      'src/data/bundle.ts',
      'src/memorise/reveal.ts',
      'src/i18n/locale.ts',
      'src/assert-never.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Domain modules stay free of React.' },
            { name: 'react-native', message: 'Domain modules stay free of React Native.' },
          ],
          patterns: [
            {
              group: ['expo-*', '@expo/*'],
              message: 'Domain modules stay free of native modules.',
            },
            { group: ['@/storage/*'], message: 'Domain modules do not read or write storage.' },
          ],
        },
      ],
    },
  },
  { ignores: ['dist/*', '.expo/*', 'expo-env.d.ts'] },
]
