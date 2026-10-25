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

_Last updated 2026-10-09._

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

- [x] **Apply the Nix change (JDK 21 through mise):** `nix-rebuild` done;
  `mise exec -- java -version` gives 21 in this repo.
- [x] **Untrack the stray worktree copy:** `.kilo` is untracked and ignored.
- [x] **Commit and push to `development`.** Done; both sites are deployed.

## 2. Lock the GitHub environments to their branches (done)

- [x] `development` secrets and variables are usable only from the
  `development` branch, and `production` only from `production` (custom
  deployment branch policies, set with `gh api`).
- [x] **Required reviewers** on `production`: you (`zxcvbnmmohd`). Every
  production deploy (Firestore, marketing, companion) now waits for your
  approval: the run's page → **Review deployments** → tick `production` →
  **Approve and deploy**, or `gh run view <id>` to find it. Checks and
  `development` deploys are not affected.

## 3. Business details for the legal pages (done)

From the Corporations Canada profile (kept local, git-ignored):

- [x] **Publisher:** Moh’d Inc., a federal (CBCA) corporation with its
  registered office in Ontario. The terms are governed by the laws of Ontario
  and the federal laws of Canada.
- [x] **Address:** city only (“Toronto, Ontario, Canada”), by choice. When you
  have a PO box or virtual mailbox, Claude puts it in `BUSINESS.address`
  (`apps/marketing/src/i18n/locales.ts`).
- [x] **Privacy contact:** `privacy@ihsaanly.app` for privacy requests and
  account deletion; `support@ihsaanly.app` stays for everything else.
  - [ ] **You:** create the `privacy@ihsaanly.app` mailbox or alias.
- [x] **Donations:** PayPal, at donate.ihsaanly.app, named in the privacy
  policy, the terms and the delete-account page.
- [x] **EU/UK:** offered everywhere. You live in the UK, so the UK Article 27
  representative rule likely does not apply; the EU one technically still
  does. Raise it in the lawyer review (step 10).
- [x] **LICENSE:** Moh’d Inc.

## 4. First real sign-in test on dev (You, 10 min, after step 1)

Checked 2026-10-09: `users/{uid}` (schema 2), a `2026-10` events document
with the Fajr mark, and the preferences document with the place rounded to
~1 km. After Delete account: the user, its sync documents and the Firebase
Auth user are all gone (404), and no user documents remain.


- [x] Open <https://dev.companion.ihsaanly.app> → More → Account → **Sign in
  with Google**.
- [x] Mark a prayer, wait about 5 s, then check Firebase console →
  `ihsaanly-development` → Firestore → `users/{uid}/sync/<this month>`.
- [x] Open dev.companion in a second browser and sign in with the same
  account. The mark should appear.
- [x] Try **Sign out → Remove from this device**, then sign back in. The data
  should come back from the cloud.
- [x] **Delete account.** `users/{uid}` should disappear from Firestore.
- Report anything odd, with a screenshot or console error, and Claude fixes
  it.

## 5. Apple Developer Program (You, then Both)

Sign in with Apple, the iOS release and iOS CI all need this.

1. [x] **Enrol** at <https://developer.apple.com/programs/> as an organisation
   (Mohd Inc.). Done: the Apple Developer account exists.
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
7. [ ] **Push (Announcements):** tick **Push Notifications** on both App IDs
   too. Then Keys → **+** → enable **Apple Push Notifications service
   (APNs)** (one key serves sandbox and production, and both App IDs). Upload
   that `.p8` to Firebase in **both** projects: Project settings → **Cloud
   Messaging** → Apple app configuration → **APNs Authentication Key** →
   Upload, with the Key ID and Team ID. Until this is done the iOS app still
   subscribes to the topics, but Firebase cannot deliver to it; Android works
   without it.

### Sending an announcement (once the app is out)

Announcements go to FCM **topics**, never to a person; the app never sends
its token anywhere. Topics: `announcements` (everyone who turned the switch
on) and `announcements-<lang>` (`en`, `ar`, `fr`, `it`, `ja`, `hi`, `ur`,
`so`, `zh`, `yue`: the app language).

1. Firebase console → the project (`ihsaanly-development` to test,
   `ihsaanly-production` for real) → **Messaging** → **New campaign** →
   **Notifications**.
2. Title and text, in the topic's language. Leave the image empty.
3. **Target** → **Topic** → `announcements-ar` (one campaign per language),
   or `announcements` for one message to everyone.
4. **Additional options → Custom data** (optional): `route` = an in-app path
   such as `/item/fasting-monday`, or `url` = an `https://` page. A tap opens
   the route, else the page, else Today. Anything else is ignored.
5. Android notification channel: leave empty (the app's default, Reminders,
   is used). Review → **Publish**.

To test on a dev build: turn on More → Reminders → Announcements, then send
to `announcements-en` in `ihsaanly-development`.

**Staging:** `APP_VARIANT=staging` uses the development Firebase config, but
that project has no app for `app.ihsaanly.companion.staging`, so the Android
staging build fails at `processStagingReleaseGoogleServices` until one exists.
Register it (and the iOS one), then re-download the files:
`bunx firebase-tools@15 -P ihsaanly-development apps:create ANDROID "Ihsaanly Staging" --package-name app.ihsaanly.companion.staging`
(and `apps:create IOS ... --bundle-id app.ihsaanly.companion.staging`), then
`apps:sdkconfig` into `apps/mobile/firebase/development/` (a
`google-services.json` holds every Android app of its project).

## 6. Android builds in GitHub Actions (Both)

Free on this public repo, and it replaces EAS.

1. [x] **Upload key and CI secrets.** The keystore lives only in 1Password:
   **Private** → "Ihsaanly Android upload keystore" (the `.jks` attached, alias
   `upload`, one password for the store and the key). The secrets
   `ANDROID_UPLOAD_KEYSTORE` (base64), `ANDROID_UPLOAD_KEYSTORE_PASSWORD` and
   `ANDROID_UPLOAD_KEY_PASSWORD`, and the variable `ANDROID_UPLOAD_KEY_ALIAS`,
   are set in **both** environments; dev CI builds use the same key.

   Current upload key SHA-1
   `2F:7B:80:AC:43:D7:9D:A5:D8:06:E4:BD:B7:C2:74:54:9F:8D:22:D7`, in both
   Firebase projects, both `google-services.json` files and the Android API key
   restrictions. History: the first key (`9C:7C:59:…`) was committed by mistake
   (`4227a8b`); its replacement (`D4:E6:…`) was lost with the old Mac. Both are
   removed everywhere, and neither reached Play. Keystores (`*.jks`,
   `*.keystore`) are git-ignored.
2. [x] **Mobile env as GitHub variables** (2026-10-10): the seven
   `EXPO_PUBLIC_*` values from `apps/mobile/.env.<branch>` are set in each
   environment. After changing an env file, re-run
   `gh variable set --env <branch> -f apps/mobile/.env.<branch>`.
3. [x] **`build-android.yml`:** runs on pushes to `development` or
   `production` that touch the app or what it is built from, and by hand.
   It prebuilds with the branch's variant, signs with the upload key, checks
   the output's SHA-1 against it, and attaches the result to the run:
   `development` an installable `.apk`, `production` an `.aab`. The run
   number is the `versionCode`, so every build counts up.
4. [ ] **You:** (the Play developer account exists) create the app in **Play Console**
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
- [x] **iOS key:** allow only the bundle IDs. **Android key:** allow only the
  package and SHA-1s. Done 2026-10-09 in both projects (dev: debug + upload
  SHA-1; prod: upload SHA-1), after GitHub secret scanning flagged the keys in
  `apps/mobile/firebase/*`; those alerts are resolved as "won't fix" (public
  client keys).
  - [ ] When Play App Signing gives its SHA-1 (step 6.5), add it to the
    production **Android key** too, or the Play-installed app's push and crash
    reports are rejected.
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
