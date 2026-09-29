// Turns tokens.ts into the two stylesheets every app imports. Kept apart from
// generate.ts so the test can render in memory and compare with the files.
import { brand, fonts, system } from '../tokens'

type Scheme = 'light' | 'dark'

const HEADER =
  '/* Generated from tokens.ts by `bun run generate` in tooling/tailwind. Do not edit. */'

function block(selector: string, lines: string[], indent = ''): string {
  return `${indent}${selector} {\n${lines.map((line) => `${indent}  ${line}`).join('\n')}\n${indent}}`
}

function brandVars(scheme: Scheme): string[] {
  return Object.entries(brand).map(([name, value]) => `--color-${name}: ${value[scheme]};`)
}

function systemVars(scheme: Scheme): string[] {
  return Object.entries(system).map(([name, value]) => `--color-${name}: ${value.web[scheme]};`)
}

/** theme.css: the Tailwind theme for every app, native and web. */
export function renderTheme(): string {
  // Values sit on the --color-* and --font-* names themselves, overridden below
  // for dark mode and each platform. A variable defined once would be inlined
  // by NativeWind's compiler, freezing its light value.
  const theme = [
    ...brandVars('light'),
    ...systemVars('light'),
    ...Object.entries(fonts).map(([name, value]) => `--font-${name}: ${value.web};`),
  ]
  return `${HEADER}

${block('@theme', theme)}

@media (prefers-color-scheme: dark) {
${block(':root', [...brandVars('dark'), ...systemVars('dark')], '  ')}
}

/* For the web. Native apps take colours and fonts from tokens.ts in JavaScript
   (style props), because NativeWind 5 RC does not apply stylesheet colour
   variables on native. */
`
}

/** web.css: what only a browser needs on top of theme.css. */
export function renderWeb(): string {
  const dark = [...brandVars('dark'), ...systemVars('dark')]
  const light = [...brandVars('light'), ...systemVars('light')]
  return `${HEADER}

${block('@font-face', [
  "font-family: 'Amiri';",
  "src: url('./fonts/Amiri-Regular.woff2') format('woff2'), url('./fonts/Amiri-Regular.ttf') format('truetype');",
  'font-display: swap;',
])}

${block(':root', ['color-scheme: light dark;'])}

/* A page may force a theme with data-theme on <html>, over the system's. */
${block(":root[data-theme='dark']", [...dark, 'color-scheme: dark;'])}

@media (prefers-color-scheme: dark) {
${block(":root[data-theme='light']", [...light, 'color-scheme: light;'], '  ')}
}

/* Dark when data-theme="dark", or when the system prefers dark and the page
   has not forced light. */
@custom-variant dark {
  &:where([data-theme='dark'], [data-theme='dark'] *) {
    @slot;
  }
  @media (prefers-color-scheme: dark) {
    &:where(:not([data-theme='light'], [data-theme='light'] *)) {
      @slot;
    }
  }
}
`
}
