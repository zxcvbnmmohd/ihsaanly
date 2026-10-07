# Store listings

Everything the two stores ask for in text. Screenshots and graphics are not here yet.

## Which file is which

| File                     | What it is                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `../store.config.json`   | App Store listing in EAS Metadata format (`configVersion: 0`): every locale's title, subtitle, description, keywords, promotional text, URLs, plus categories and the age-rating questionnaire |
| `app-store/ur.json`      | The Urdu App Store listing, same fields, for pasting by hand (see below)                                                                                                                       |
| `google-play/<locale>/…` | Play listing in fastlane `supply` layout                                                                                                                                                       |
| `google-play/README.md`  | Play category, tags, IARC answers, target audience, contact                                                                                                                                    |

### Locales

| Language  | App Store                   | Google Play       |
| --------- | --------------------------- | ----------------- |
| English   | `en-US`, `en-GB`, `en-CA`   | `en-US`, `en-GB`  |
| Arabic    | `ar-SA`                     | `ar`              |
| French    | `fr-FR`, `fr-CA`            | `fr-FR`           |
| Italian   | `it`                        | `it-IT`           |
| Japanese  | `ja`                        | `ja-JP`           |
| Hindi     | `hi`                        | `hi-IN`           |
| Urdu      | manual: `app-store/ur.json` | `ur`              |
| Mandarin  | `zh-Hans`                   | `zh-CN`           |
| Cantonese | `zh-Hant`                   | `zh-HK`           |
| Somali    | **not supported**           | **not supported** |

- **Somali** is offered by neither store. Somali speakers see the English listing; the
  app itself is in Somali.
- **Urdu on the App Store:** Apple added `ur` in March 2026, but the EAS Metadata schema
  does not list it yet (the config would fail validation), and App Store Connect was
  reported in July 2026 to reject it with "The language specified is not listed for
  localization". Try adding it by hand in App Store Connect; if accepted, paste from
  `app-store/ur.json`. Once `eas-cli` accepts `ur`, move it into `store.config.json`.
- **Cantonese** listings are standard written Chinese in Traditional characters, the
  norm for Hong Kong and Taiwan store pages, not colloquial Cantonese. The app's own
  Cantonese labels (such as 「啱啱開始」) are quoted as they appear.

## Limits and where each field stands

Counted in characters (UTF-16 units) by a script, all within limits:

| Field                       |      Limit | Longest     |
| --------------------------- | ---------: | ----------- |
| App Store name              |         30 | 26 (fr)     |
| App Store subtitle          |         30 | 26 (it)     |
| App Store keywords (joined) |        100 | 98 (it)     |
| App Store promotional text  |        170 | 163 (it)    |
| App Store description       |       4000 | 3444 (fr)   |
| What's New / Play changelog | 4000 / 500 | 241 (fr)    |
| Play title                  |         30 | 26 (fr, hi) |
| Play short description      |         80 | 78 (en, hi) |
| Play full description       |       4000 | 3422 (fr)   |

Keywords are comma-separated with no spaces, never repeat a word from the name or
subtitle (Apple indexes those already), and name no other app.

Release notes for 1.0 are included, but App Store Connect has no "What's New" on a
first version and `eas-cli` skips the field then; they will apply from the next version
unless replaced.

## Decisions

- **Categories:** Lifestyle, then **Reference** as the secondary. The library, search
  and glossary are a sourced reference work: Apple defines Reference as "accessing or
  retrieving information", which is what someone does looking up the dua for a journey.
  Education implies lessons and courses; the learning screen is one feature, not the app.
- **Age rating:** every content question `NONE`, every yes/no `false`, no Kids band, no
  override, which calculates to **4+**. Religious content is not a rating category.
  Unrestricted web access is `false`: the app opens only specific links in the system
  browser. `healthOrWellnessTopics` is `false`.
- **Privacy wording** follows the policy at https://ihsaanly.app/legal/privacy/: "No
  account needed. Without signing in, nothing leaves your device. Optional sign-in syncs
  your record across your devices." Never "nothing leaves your phone" on its own: the
  optional account keeps a cloud copy.
- **URLs:** marketing `https://ihsaanly.app/`, support `https://ihsaanly.app/#questions`,
  privacy `https://ihsaanly.app/legal/privacy/`, each under the listing's language
  prefix (`/fr/`, `/ar/`, `/yue/` for zh-Hant…). Account deletion (Play asks for it):
  `https://ihsaanly.app/legal/delete-account/`.
- **Honesty lines in every description:** the content awaits a named scholar's review
  (matching the About screen), and every language but English is a draft. Nothing
  claims review, recitations, or donations. The iOS text does not mention donating.
- **Widgets** are described per platform (Home Screen and Lock Screen on iOS, home screen
  on Android). If any of the ten ships later than the listing, cut that sentence.

## Pushing

**App Store:** after the app record exists in App Store Connect,

```sh
bunx eas-cli metadata:push
```

It reads `store.config.json` from the repo root. Add `submit.production.ios.ascAppId`
to `eas.json` to skip the prompt. `bunx eas-cli metadata:pull` first if you have edited
anything in App Store Connect, or it will be overwritten.

**Google Play:** `fastlane supply` with `--metadata_path store/google-play` (full command
in `google-play/README.md`), or paste by hand in Play Console.

## Still needs you

- [ ] **Review contact.** `store.config.json` has no `review` block, because every field
      in it must be real (the schema checks the email format). Add this under `apple`
      with your details:

  ```json
  "review": {
    "firstName": "TODO",
    "lastName": "TODO",
    "email": "TODO",
    "phone": "+TODO",
    "demoRequired": false,
    "notes": "No sign-in is needed: every feature works without an account. Sign-in (Sign in with Apple or Google, More > Account) is optional and only syncs the user's record across devices; it can be deleted in the app (More > Account > Delete account). Everything works with no permissions granted: decline location and pick a city. Background location is used only by the optional, off-by-default leaving-home reminder (More > Where you are), which monitors one region with the system geofence; the home location never leaves the device. Without sign-in nothing is sent to any server; the only outbound data is a diagnostic report or export the user sends through the share sheet."
  }
  ```

- [x] **Copyright holder.** `"copyright": "2026 Moh’d Inc."`, the company that publishes
      the app on both stores.
- [ ] **Screenshots:** 6.9"/6.7" and 6.5" iPhone, 13" iPad, Android phone. Per locale if
      you want localised shots; otherwise the English ones are used everywhere.
- [ ] **Play feature graphic,** 1024×500, and a 512×512 Play icon.
- [x] **Landing page:** https://ihsaanly.app/ (the marketing URL), with the privacy
      policy, terms and account-deletion page under `/legal/`. The old github.io policy
      now only points there.
- [ ] **Native-speaker check of every non-English listing** (ar, fr, it, ja, hi, ur,
      zh-Hans, zh-Hant), ideally by the same reviewers as the app's strings. Pay
      attention to the keyword lists, which are guesses at what people search, and to
      the Chinese renderings of dua (祈祷/祈禱) and the preset names.
