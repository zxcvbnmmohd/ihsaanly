# Ihsaanly

An offline-first Sunnah companion. It tells you which sunnah, dua or adhkar the
moment calls for, with the source on every item, and it keeps everything on the
device.

There is no account, no server and no analytics. It works with no permissions
granted at all: decline location and pick a city instead.

## Getting started

```bash
bun install
git config core.hooksPath .githooks   # once per clone: enables the pre-commit hook
bun run android                       # or: bun run ios
```

`expo-notifications`, `expo-sqlite`, `expo-location` and `expo-widgets` are not
in Expo Go, so `bun run start` alone will not run this app. Use a development
build.

## Scripts

|                            |                                                                |
| -------------------------- | -------------------------------------------------------------- |
| `bun run ios` / `android`  | Build and launch a development build                           |
| `bun run start`            | Dev server only, for an existing development build             |
| `bun run check`            | Lint, typecheck, tests, content validation, `expo-doctor`      |
| `bun run lint`             | ESLint (not `expo lint` — see AGENTS.md)                       |
| `bun run test`             | Unit tests                                                     |
| `bun run validate:content` | Checks `content/items.json` and lists what still awaits review |
| `bun run format`           | Prettier, including Tailwind class sorting                     |
| `bun run clean`            | Clear Metro and Expo caches, then restart                      |

## Layout

```
src/
  app/            Expo Router routes only. A route gathers data, owns hooks and
                  navigation, and renders one screen component
    (home)/       Today
    (library)/    Library, item detail, memorisation, glossary
    (more)/       Settings, history, qada, data, about
  screens/        Pure presentational screens. Every prop type is exported, and
                  fixtures.ts holds sample props for each one
  components/     Reusable UI
  content/        Item and glossary loading, search, validation
  plan/           The decision function: what is relevant, and when
  prayer/         Windows, calculation, marks, qada
  hijri/ day/     The two day boundaries — Maghrib for the Hijri date, midnight
                  for the prayer log
  notifications/  Scheduling, payloads, responses
  storage/        SQLite, preferences, the append-only event log
  strings/        English and Arabic interface copy
content/          The items and glossary, as data
scripts/          Asset and content tooling, run by hand
```

## The content is data

`content/items.json` holds every item with its evidence: collection, reference,
grading, and the grader where the collection does not carry its own. The build
refuses content it cannot grade, and `bun run validate:content` lists everything
still awaiting review. No release ships while `reviewedBy` is null.

## Before changing anything

Read [AGENTS.md](./AGENTS.md). It records the decisions that look wrong until you
know why: two styling systems, the native tab bar, the Maghrib boundary, why
`expo-system-ui` and `expo-localization` are deliberately absent, and what a
theme change does to the Android activity.

[audit.md](./audit.md) tracks what remains before this can be released.
