# Wide layouts for the shared screens (web companion and iPad)

Status: approved in conversation 2026-09-29; implementation started the same day.

## Why

`companion.ihsaanly.app` renders the phone screens in a 720px column, so on a
laptop it reads as a large phone. The owner wants it to feel built for the
screen it is on while keeping the design system (tokens, colours, type, light
and dark) and the shared, presentational screens in `@ihsaanly/ui`. The phone
app declares `supportsTablet: true` with no tablet layout, so the same work
serves the iPad.

Decisions taken with the owner:

- Feel: **dashboard for Today, reader elsewhere.**
- Where: **shared in `@ihsaanly/ui`**, iPad included now.
- Today: **A** — prayer strip across the top, then a wide "moment" column and a narrow "week" column.
- Library: **B** — a grid of item cards with a reader panel that opens at the end side.
- More: **A** — a persistent settings list pane with the chosen page beside it.
- No SSR: the web app stays a static Vite SPA on GoDaddy (unchanged).

## The layout model

`@ihsaanly/ui` gains `useLayout(): Layout` where `Layout = 'compact' | 'regular' | 'wide'`:

| Layout  | Width           | Where                              |
| ------- | --------------- | ---------------------------------- |
| compact | < 768           | phones                             |
| regular | 768 – 1099      | iPad portrait, small windows       |
| wide    | ≥ 1100          | iPad landscape, laptops            |

Source: `useWindowDimensions()` (works on native and react-native-web).
`UiContextValue` gains an optional `layout?: Layout`; when set, `useLayout()`
returns it instead of measuring, so fixtures and tests render any size without
a window. Screens branch on the value with plain flexbox — no `md:` classes,
no CSS grid — so one implementation runs on the iPad and in the browser.
NativeWind stays for spacing and type.

## Shared components (new or changed)

- `components/screen.tsx`: `maxWidth?: number` prop (default 720). Today passes
  1200 at regular/wide. Wash gradient unchanged.
- `components/panel.tsx` — `Panel({ title, onClose, children })`: a scrollable
  end-side pane (420px regular, 480px wide, `border-s`, so it mirrors under
  RTL) with a title row and a close button. Hosts fill it with a screen.
- `today/` — `PrayerStrip`, `RightNowCard`, `UpNextCard`, `SuggestionCard`,
  `MakeUpRows`, `AgendaList` extracted from `screens/today.tsx` with the same
  props they take today; each exported and given a fixture.
- `components/library-card.tsx` — `LibraryCard({ entry, selected, href })`:
  title, ruling/status pills, one line of translation when present, selected
  state. At compact it renders as today's entry card so the phone is unchanged.
- `Row`, `Surface interactive`, `LibraryCard`: `hovered` style on web
  (react-native-web `Pressable` state; native ignores it), pointer cursor,
  visible focus ring.

## Screens

**TodayScreen** keeps its props; it composes the extracted sections.
- compact: today's column, same order.
- regular/wide: meta line; `PrayerStrip` full width; two columns — left
  (flex 2): Right now, Also now, Up next, Also today; right (flex 1): Try one
  more, Make up, Tomorrow, Later this week. "Nothing else" and "approximate"
  notes stay in place.

**LibraryScreen** gains `searchable?: { query, onQueryChange, placeholder }`
(when set, the screen renders the `TextField kind="search"`; the host stops
rendering its own) and `selectedId?: string`.
- compact: unchanged apart from the optional search field.
- regular/wide: toolbar (search field + filter chips), category headings
  spanning the grid, `LibraryCard`s two across at regular, three at wide.

**MoreScreen** gains the same `searchable` prop and `selectedHref?: string`;
it is the list pane at regular/wide (active row marked).

`ItemScreen`, `MemoriseScreen`, `GlossaryScreen` and the thirteen settings
screens do not change; they render inside `Panel` or beside the More list at
their existing 720px reading width.

Onboarding: unchanged (single centred column at every size).

## Hosts

**Web (`apps/companion`)** — URLs do not change.
- `routes/library/route.tsx` (layout): `LibraryScreen`; at regular/wide also
  `Panel` + `<Outlet/>`. Children: `library/index.tsx` (nothing selected →
  empty panel not rendered), `item/$id`, `item/memorise/$id`, `glossary`
  (moved under it; paths kept via explicit `path`). At compact the layout
  renders only the outlet, so children are full pages as now.
- `routes/more/route.tsx` (layout): `MoreScreen` list pane + `<Outlet/>` for
  the settings routes (moved under it, paths kept). `more/index.tsx` at
  regular/wide redirects to the last-used page (`local-storage` key
  `ihsaanly.more.last`) or the first row; at compact renders the list only.
- `PageHeader` is removed at regular/wide (titles live in their pane); kept at
  compact with Back. `__root.tsx` drops `SETTINGS_PATHS`; the active tab is
  the matched layout route. Escape inside a panel navigates to its parent.

**iPad (`apps/mobile`)** — `(library)/_layout.tsx` and `(more)/_layout.tsx`
read `useLayout()`; at regular/wide they render the list route beside a nested
`Stack` for the detail inside `Panel`. `NativeTabs` unchanged. Verified in the
iPad simulator only.

## State and edge cases

- No new stores. The selected item is the URL. Last-used settings page: one
  `local-storage` key (web) / one preference (iPad), optional.
- Resizing across a breakpoint keeps the URL: a panel becomes a page and back.
- RTL: panel pins to the end side; grid order follows writing direction.
- A panel route with no selection renders nothing (Library) or the first page
  (More); `EmptyState` covers a missing item as today.

## Verification

- `bun run check` green; both web apps build (CSP + headless-Chrome tests).
- Companion Chrome test screenshots at 390, 820, 1280 (en + ar) and the
  existing end-to-end flow still passing.
- Fixtures for every new component; screen fixtures rendered at all three
  layouts via the `layout` override.
- `expo export -p ios` bundles; iPad simulator smoke check of Library and More.

## Out of scope

New features; redesign of the item page; onboarding beyond centring; the
marketing site; the phone (compact) layouts, which must not change visually.
