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
  // Type-aware rules for src/ only, where the cost of a project-wide parse buys
  // something: no-floating-promises alone would have caught a fire-and-forget
  // share that swallowed its own failure. Config and scripts stay untyped, so
  // `eslint .` does not pay for a type-check of files tsconfig does not include.
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        // A void-returning prop given an async handler is the ordinary React
        // shape, not a bug; an `if (somePromise)` is.
        { checksVoidReturn: false },
      ],
      // `require-await` is deliberately absent. Two native APIs demand a
      // Promise-returning function and neither body has anything to await:
      // TaskManagerTaskExecutor for the geofence task, and expo-notifications'
      // `handleNotification`. The rule would fire on every future one, and the
      // fix it asks for does not typecheck.
    },
  },
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
      // Pinned because a nested git worktree puts a second tsconfig.json inside
      // the repo, and without this the parser cannot tell which root is meant.
      parserOptions: { tsconfigRootDir: __dirname },
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
  // Widget render functions return framework-specific shapes (SwiftUI trees for
  // expo-widgets, RemoteViews trees for react-native-android-widget), not
  // ReactElement, and iOS widget bodies cannot reference a shared type alias.
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
      'src/plan/{plan,day-match,day-context,signals,user-state,quiet-hours,notification-preferences,history,presets,suggest,jumuah}.ts',
      'src/data/bundle.ts',
      'src/memorise/reveal.ts',
      'src/i18n/locale.ts',
      'src/assert-never.ts',
      'src/fasting/ledger.ts',
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
  // site/dist is generated by `bun run build:site`, not source.
  { ignores: ['dist/*', '.expo/*', 'expo-env.d.ts', '.kilo/**', 'site/dist/**'] },
]
