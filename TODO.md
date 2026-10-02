# Launch to-do

What's left before sign-in, sync and the stores are live. Each item says who
does it:

- **You:** needs your accounts, a browser or a decision.
- **Claude:** ask and it's done from the repo.
- **Both:** you do a step, then Claude finishes it.

Store-listing detail for the mobile app stays in
[`apps/mobile/TODO.md`](apps/mobile/TODO.md). The privacy-form answers are in
[`docs/store-privacy-forms.md`](docs/store-privacy-forms.md), and how it all
fits together is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

_Last updated 2026-10-01._

## Already done

- Firebase projects `ihsaanly-development` and `ihsaanly-production`:
  - Firestore (nam5) with the rules deployed;
  - Google sign-in enabled, with the authorized domains set;
  - web, iOS and Android apps registered.
- OAuth clients:
  - web (both projects);
  - iOS (`…companion.development` and `…companion`);
  - Android with debug and upload-key SHA-1/SHA-256 in development, and the
    upload key in production.
- GitHub `development` / `production` environments: FTP secrets, the Firebase
  variables, and a least-privilege `FIREBASE_SERVICE_ACCOUNT`. The old Admin
  SDK keys are deleted. The marketing, companion and Firestore deploys pass.
- Env files for companion, extension and mobile (dev and prod), all
  gitignored.
- Compliance pass: the privacy policy, terms and delete-account page, the
  sign-in consent notice, data minimisation, accessibility and licences.
- JDK 21 through mise (declared in `~/.dotfiles/.config/nix/home/mise.nix`
  and the repo `mise.toml`), plus `bun run dev:cloud` for the local
  emulators.

---

## 1. Housekeeping (You, 5 min)

- [ ] **Apply the Nix change:** `nix-switch`, or
  `sudo darwin-rebuild switch --flake ~/.config/nix#my-macbook`.
- [ ] **Untrack the stray worktree copy:** `git rm -r --cached .kilo`. It's
  already in `.gitignore`.
- [ ] **Commit and push to `development`.** That deploys the new legal pages
  and the sign-in UI to dev.ihsaanly.app and dev.companion.ihsaanly.app.

## 2. Lock the GitHub environments to their branches (Claude, or you in 2 min)

Right now any branch's workflow can use the `development` and `production`
secrets.

- [ ] Settings → Environments → `development` → Deployment branches and tags
  → **Selected branches and tags** → add `development`.
- [ ] Do the same for `production`, with `production`. Optionally add
  **Required reviewers** → yourself, so every prod deploy waits for your
  approval.
- Claude can do both with `gh api`. Just say so.

## 3. Business details for the legal pages (You decide, Claude applies)

Send Claude:

- [ ] the province or territory where Mohd Inc. is incorporated;
- [ ] a mailing address for privacy notices (registered office, PO box or
  virtual mailbox);
- [ ] the privacy contact (`support@ihsaanly.app`, or a separate
  `privacy@…`);
- [ ] the donation processor (Stripe? LaunchGood?), and whether
  `donate.ihsaanly.app` has its own privacy notice;
- [ ] EU/UK plans: an Art. 27 representative, or launch outside the EU/UK
  first;
- [ ] the `LICENSE` holder (currently "MugenCraft"; change to "Mohd Inc."?).

Claude then sets `BUSINESS` in `apps/marketing/src/i18n/locales.ts`, updates
the terms' governing-law clause and the donation wording, and updates
`LICENSE`.

## 4. First real sign-in test on dev (You, 10 min, after step 1)

- [ ] Open <https://dev.companion.ihsaanly.app> → More → Account → **Sign in
  with Google**.
- [ ] Mark a prayer, wait about 5 s, then check Firebase console →
  `ihsaanly-development` → Firestore → `users/{uid}/eventMonths/<this month>`.
- [ ] Open dev.companion in a second browser and sign in with the same
  account. The mark should appear.
- [ ] Try **Sign out → Remove from this device**, then sign back in. The data
  should come back from the cloud.
- [ ] **Delete account.** `users/{uid}` should disappear from Firestore.
- Report anything odd, with a screenshot or console error, and Claude fixes
  it.

## 5. Apple Developer Program (You, then Both)

Sign in with Apple, the iOS release and iOS CI all need this.

1. [ ] **Enrol** at <https://developer.apple.com/programs/> as an organisation
   (Mohd Inc.). You'll need a D-U-N-S number, and it costs US$99/yr.
2. [ ] **App IDs:** Certificates, IDs & Profiles → Identifiers → **+** → App
   IDs. Create `app.ihsaanly.companion` and
   `app.ihsaanly.companion.development`, and tick **Sign in with Apple** on
   both. Widgets also need the App Group capability; see
   `apps/mobile/TODO.md`.
3. [ ] **Services ID** (for web sign-in on companion): Identifiers → **+** →
   Services IDs, e.g. `app.ihsaanly.companion.web`. Enable Sign in with Apple
   → Configure, then:
   - **Domains:** `ihsaanly-production.firebaseapp.com`,
     `ihsaanly-development.firebaseapp.com`, `companion.ihsaanly.app`,
     `dev.companion.ihsaanly.app`.
   - **Return URLs:**
     `https://ihsaanly-production.firebaseapp.com/__/auth/handler` and
     `https://ihsaanly-development.firebaseapp.com/__/auth/handler`.
4. [ ] **Key:** Keys → **+** → enable Sign in with Apple, linked to the
   primary App ID. Download the `.p8`, which can't be downloaded again. Note
   the **Key ID** and your **Team ID**.
5. [ ] **Firebase,** in both projects: Authentication → Sign-in method →
   **Apple** → Enable. Fill in the Services ID, the Apple team ID, the key ID
   and the private key (the `.p8` contents).
6. [ ] Tell Claude, who then tests account linking (Apple ↔ Google) and the
   iOS build path.

## 6. Android builds in GitHub Actions (Both)

Free on this public repo, and it replaces EAS.

1. [ ] **You:** add these secrets to **both** environments (`development` and
   `production`). Dev CI builds use the same upload key, whose SHA-1 is
   already in both Firebase projects.
   - `ANDROID_UPLOAD_KEYSTORE`: `base64 -i ihsaanly-upload.jks | pbcopy`
   - `ANDROID_UPLOAD_KEYSTORE_PASSWORD`
   - `ANDROID_UPLOAD_KEY_ALIAS` (e.g. `upload`)
   - `ANDROID_UPLOAD_KEY_PASSWORD`

   Keep the `.jks` file and the passwords in your password manager.
2. [ ] **You:** add the mobile env as GitHub **variables** in each
   environment, copying the values from `apps/mobile/.env.<branch>`:
   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

   Claude can do this with `gh`, since none of these are secrets.
3. [ ] **Claude:** write `build-android.yml`.
   - **Triggers:** push to `development` or `production` touching
     `apps/mobile/**` or `packages/**`, plus manual runs.
   - **Steps:** `expo prebuild -p android` with the branch's variant, write
     the env file from the variables, decode the keystore, then build. The
     `development` branch produces an installable `.apk` as a workflow
     artifact; the `production` branch produces an `.aab`.
4. [ ] **You:** create the app in **Play Console**
   (<https://play.google.com/console>) and upload the first `.aab` to
   **Internal testing** by hand. Play needs a manual first upload before it
   accepts automated ones.
5. [ ] **You → Claude:** go to Play Console → Test and release → **App
   integrity** → App signing key certificate, and send Claude the **SHA-1 and
   SHA-256**. Claude adds them to the `ihsaanly-production` Android app. Users
   who install from Play are signed with this key, so Google sign-in fails for
   them without it.
6. [ ] **You:** set up the **Play upload service account** for automated
   uploads:
   1. In Google Cloud (any project, e.g. `ihsaanly-production`), go to IAM →
      Service accounts → create `play-upload`, and create a JSON key.
   2. In Play Console → **Users and permissions** → Invite new users → paste
      the service account's email, and give it the app's **Release** rights
      only.
   3. Add the JSON as the GitHub `production` secret `PLAY_SERVICE_ACCOUNT`.

   Claude can do steps 1 and 3 with `gcloud`/`gh`; step 2 needs you in Play
   Console.
7. [ ] **Claude:** add the Play upload (internal track) to
   `build-android.yml`.
8. [ ] **You:** the Play forms: Data safety (answers in
   `docs/store-privacy-forms.md`), the background location declaration,
   content rating, target audience 18+, and the store listing (text is in
   `apps/mobile/store/google-play/`).

## 7. iOS builds in GitHub Actions (Both, after step 5)

macOS runners are free on public repos.

1. [ ] **You:**
   1. Create an **App Store Connect API key**: App Store Connect → Users and
      Access → Integrations → **App Store Connect API** → **+**, role **App
      Manager**. Note the Issuer ID and Key ID, and download the `.p8`.
   2. Add the `production` secrets `ASC_KEY_ID`, `ASC_ISSUER_ID` and
      `ASC_KEY_P8`.
2. [ ] **You:** create the app in App Store Connect with bundle
   `app.ihsaanly.companion`.
3. [ ] **Claude:** write `build-ios.yml`. It runs `expo prebuild -p ios`, then
   fastlane `match` or automatic signing through the API key, then
   `xcodebuild archive`, then uploads to **TestFlight**. Signing approach
   (Claude will ask): fastlane match with a private certs repo, or
   API-key-based cloud signing.
4. [ ] **You:** the App Privacy label (answers in
   `docs/store-privacy-forms.md`), the age rating questionnaire, and the
   listing (`apps/mobile/store.config.json`).

## 8. Chrome Web Store (Both)

1. [ ] **You:** finish your final extension changes. Then run
   `bun run build:extension:both`, which writes
   `apps/extension/ihsaanly-extension.zip` (prod) and
   `ihsaanly-extension-beta.zip` (beta).
2. [ ] **You:** Developer Dashboard → **New item**, twice:
   - "Ihsaanly Beta", with the beta zip. Distribution → Visibility:
     **Unlisted**.
   - "Ihsaanly", with the prod zip. Visibility: **Public**, when ready.
3. [ ] **You → Claude:** for each item, send Claude:
   - the **item ID**, from the URL;
   - the **public key**: Package → View public key (`-----BEGIN PUBLIC
     KEY-----…`).

   Claude then stamps the right `key` and the name "Ihsaanly Beta" into each
   build, so the unpacked dev build gets the same ID and Google sign-in works
   locally too.
4. [ ] **You:** in Google Cloud → APIs & Services → **Credentials** → "Web
   client (auto created by Google Service)":
   - in `ihsaanly-development`, add the redirect URI
     `https://<beta-item-id>.chromiumapp.org/`;
   - in `ihsaanly-production`, add `https://<prod-item-id>.chromiumapp.org/`.

   Google has no API for editing OAuth clients, so this one has to be done by
   hand.
5. [ ] **You:** in Firebase, in each project, go to Authentication → Settings
   → Authorized domains and add `chrome-extension://<item-id>`.
6. [ ] **You:** the Privacy tab (single purpose, permission justifications,
   no remote code, data use, certifications: all in
   `docs/store-privacy-forms.md`). Then the listing: 1–5 screenshots at
   1280×800, a **440×280 small promo tile**, the description, category
   Lifestyle, and the privacy URL `https://ihsaanly.app/legal/privacy/`.
7. [ ] **Both:** a Chrome Web Store API service account for CI uploads.
   1. **Claude:** create the service account and enable the Chrome Web Store
      API with `gcloud`.
   2. **You:** add its email under Developer Dashboard → **Account** →
      Service account. Only one is allowed per publisher.
   3. **Claude:** store the key as the `CHROME_WEBSTORE_SERVICE_ACCOUNT`
      secret.
8. [ ] **Claude:** write `deploy-extension.yml`.
   - **Triggers:** push to `development` publishes Beta, and push to
     `production` publishes Ihsaanly.
   - **Steps:** stamp the version, name and key, zip, then upload and publish
     through the Chrome Web Store API v2. Every upload still goes through
     Google's review.

## 9. Lock down the API keys (Claude, 5 min)

The Firebase API keys are public by design, but restricting them stops anyone
else using your quota.

- [ ] **Browser key:** allow only the HTTP referrers `companion.ihsaanly.app`,
  `dev.companion.ihsaanly.app`, `localhost` and `chrome-extension://<ids>`,
  and only the Identity Toolkit, Token Service and Firestore APIs.
- [ ] **iOS key:** allow only the bundle IDs. **Android key:** allow only the
  package and SHA-1s.
- Claude can do this with `gcloud services api-keys update`. Best done after
  step 8 gives the extension IDs.

## 10. Reviews (You, external)

- [ ] **Lawyer:** see the files and questions under "What to review" in the
  last audit message. In short:
  - `en.json` → `privacy.*`, `terms.*` and `deleteAccount.*`;
  - the sign-in notice (`account.notice` / `account.agreement`);
  - `docs/store-privacy-forms.md`.

  Questions to put to them:
  - Does ~1 km rounding count as precise geolocation under CPRA?
  - Is the tracking-pause switch health data?
  - Is the sign-in notice enough as explicit consent for religious data?
  - Is the SCC/Data Privacy Framework transfer wording adequate?
  - Is a 30-day deletion window acceptable?
  - Is an EU/UK representative needed?
- [ ] **Native-speaker translators** (Somali first, then the Hindi and Urdu
  "link" wording):
  - `apps/marketing/src/i18n/messages/<lang>.json` (legal pages,
    `home.private.*`);
  - `packages/core/src/strings/<lang>.ts` (account, about, data, onboarding,
    location);
  - the store listings.

## 11. Code Claude will do on request

- [ ] `build-android.yml`, `build-ios.yml`, `deploy-extension.yml` (steps 6–8).
- [ ] **Synced theme and language on mobile:** re-apply the native colour
  scheme, content language and RTL direction when another device's change
  arrives. Today it waits for a relaunch.
- [ ] **Missed-prayer race:** run the daily missed-prayer rollover after the
  first sync of the day when signed in, so a prayer marked on another device
  isn't counted as missed.
- [ ] **Dark-mode input border:** it's 2.73:1 on the darkest part of the
  background gradient; raise it to 3:1.
- [ ] **Companion bundle:** about 2.9 MB of JavaScript. Split the content by
  locale so first load downloads less.
- [ ] **knip:** clean up the unused-export warnings.
- [ ] **Staging variant:** register `app.ihsaanly.companion.staging` in
  whichever Firebase project staging should use (tell Claude which).
- [ ] **Test-account cleanup:** check Firestore for accounts that synced before
  the home-coordinates fix, and delete them.
