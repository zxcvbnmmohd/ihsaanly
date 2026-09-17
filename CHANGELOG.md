# Changelog

All notable changes to Ihsaanly are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`package.json` carries the development version recorded here. `app.json` carries the
store-facing version, which stays at `1.0.0` until first submission.

## [Unreleased]

Work is tracked as issues on the repository. The product specification is issue #1;
`docs/PRD.md` and `docs/SPEC.md` hold the requirements and the decision log.

### Blocked on external dependencies

- No release is possible until a named, qualified reviewer signs off on the content.
  The build warns on every run while `reviewedBy` is unset.
- Audio, memorisation and in-car support depend on Arabic recitations that can be
  distributed with permission.
- iOS widgets and shared storage require an Apple Developer Program membership.

## [0.1.0] - 2026-09-17

First working skeleton. Nothing is user-ready; the app runs, navigates and renders
real content with its evidence attached.

### Added

- **Three-tab shell** — Today, Library and More, each a native stack with large titles.
- **Content schema** — a versioned, strongly typed document describing every religious
  item: ruling, Arabic, transliteration, translation, repetition count, evidence,
  trigger and scholarly note. Localised fields are keyed by language.
- **Build-time content validation** — `bun run validate:content`, part of `bun run check`.
  The document is validated once at build rather than at app startup.
- **The grading gate** — an item citing a collection that does not carry its own
  authentication must name a grader, or the build fails. Bukhari and Muslim are
  exempt because the collection carries the grading. Ungraded religious content
  cannot ship by accident.
- **Document integrity checks** — duplicate item ids and text in an undeclared
  language both fail the build.
- **Release warnings** — unreviewed content, unnamed translation sources and missing
  recitations are surfaced on every build without failing it.
- **Library** — browse items and open a detail view showing Arabic, transliteration,
  translation, repetition count, any scholarly note, and a citation panel giving
  collection, reference, grading and grader.
- **First content item** — the dua on leaving home. Pending verification by a reviewer.
- **Strings module** — every user-facing string resolves through one place.
- **Right-to-left safeguards** — a lint rule rejects `left`/`right` in style objects
  and directional Tailwind utilities in favour of logical directions, so adding Arabic
  and RTL later is additive rather than a rewrite. Arabic text is right-aligned via
  writing direction rather than a hardcoded side.
- **Test suite** — `bun test`, covering the grading gate, document integrity and
  release warnings.

### Changed

- Route groups renamed from Home/Settings to Today/Library/More.
- Shared stack header options moved into a hook, because Android Material colours
  only re-resolve when read during render with a colour-scheme subscription.
- Six `expo-*` packages brought to the patch versions the SDK expects. `expo-doctor`
  was already failing on this beforehand.
- `bun run check` now runs lint, typecheck, tests, content validation and doctor.

### Removed

- The delivery Live Activity and counter demo no longer run from a route. The widget
  examples remain in the tree as reference for the widget work in a later release.

[Unreleased]: https://github.com/zxcvbnmmohd/ihsaanly/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/zxcvbnmmohd/ihsaanly/releases/tag/v0.1.0
