# Store privacy forms

Answers for the App Store, Google Play and Chrome Web Store privacy forms.
They match `ihsaanly.app/legal/privacy`, the sign-in notice and
`apps/mobile/app.config.ts` (`ios.privacyManifests`). Any change to what the
app collects means updating all four together. See "Privacy invariants" in
[ARCHITECTURE.md](ARCHITECTURE.md).

The ground truth behind every answer:

- **Without an account:** nothing is collected. Everything stays on the device.
- **With the optional account** (Sign in with Apple or Google), Firebase in
  `nam5` (US) stores:
  - the email and name the provider shares;
  - the Firebase user ID;
  - the practice record (prayers marked, optional acts, make-up counts,
    fasting, items known);
  - synced settings, including location rounded to about 1 km with city and
    time zone, and the Brother/Sister/prefer-not-to-say setup choice.
- **Never collected:**
  - the exact or home location;
  - analytics, crash logs or diagnostics;
  - device, advertising or installation IDs;
  - push tokens, contacts or payment data.
- **Diagnostic reports** are sent by the user through the share sheet to a
  destination they choose. That isn't collection by the app.
- **Encryption and deletion:** data is encrypted in transit (TLS) and at rest
  (Google). It can be deleted in-app, and from
  `https://ihsaanly.app/legal/delete-account/`.

---

## Apple: App Store Connect → App Privacy

**Data collection:** "Yes, we collect data from this app."

| Data type (Apple's name) | Collected | Linked to the user | Used for tracking | Purposes |
| --- | --- | --- | --- | --- |
| Contact Info → **Email Address** | Yes | Yes | No | App Functionality |
| Contact Info → **Name** | Yes | Yes | No | App Functionality |
| Identifiers → **User ID** | Yes | Yes | No | App Functionality |
| Location → **Coarse Location** | Yes | Yes | No | App Functionality |
| Sensitive Info (religious or philosophical beliefs) | Yes | Yes | No | App Functionality |
| User Content → **Other User Content** | Yes | Yes | No | App Functionality |

Answer **not collected** for everything else, in particular:
- Precise Location
- Health & Fitness
- Financial Info
- Contacts
- Browsing and Search History
- Usage Data
- Diagnostics
- Device ID
- Purchases
- Advertising Data

**Tracking:** "No, we do not use data for tracking."

The labels apply to everyone, but the data is collected only when someone
chooses to sign in. App Store Connect has no "optional" toggle; say so in the
review notes.

**Also check:**
- The privacy manifest's `NSPrivacyCollectedDataTypes` (in
  `apps/mobile/app.config.ts`) lists EmailAddress, Name, UserID,
  CoarseLocation, OtherUserContent and SensitiveInfo, matching the label above.
- Privacy Policy URL: `https://ihsaanly.app/legal/privacy/`.
- User Privacy Choices URL (optional field):
  `https://ihsaanly.app/legal/delete-account/`.

---

## Google Play: App content → Data safety

**Overview**
- Does your app collect or share any of the required user data types? **Yes**
- Is all of the user data collected by your app encrypted in transit? **Yes**
- Which of the following methods of account creation does your app support?
  **OAuth** (Sign in with Apple or Google)
- Delete account URL: `https://ihsaanly.app/legal/delete-account/`
- Do you provide a way for users to request that some or all of their data is
  deleted, without requiring them to delete their account? **No**. Removing
  data from one device is local and isn't a request to us; account deletion is
  the route.

**Data types.** For each one, answer:
- Collected **Yes**, Shared **No**: Google stores it as our service provider,
  which Play does not count as sharing.
- Processed ephemerally **No**.
- **Optional:** users can choose whether it's collected, since it only happens
  if they sign in.

| Category → type | Purposes |
| --- | --- |
| Personal info → **Name** | App functionality, Account management |
| Personal info → **Email address** | App functionality, Account management |
| Personal info → **User IDs** | App functionality, Account management |
| Personal info → **Political or religious beliefs** | App functionality |
| Personal info → **Other info** (Brother/Sister setup choice) | App functionality |
| Location → **Approximate location** | App functionality |
| App activity → **Other user-generated content** (practice record and settings) | App functionality |

**Not collected:**
- Precise location
- Financial info
- Health and fitness
- Messages
- Photos and videos
- Audio
- Files and docs
- Calendar
- Contacts
- Web browsing
- App info and performance (crash logs, diagnostics)
- Device or other IDs
- App interactions, In-app search history, Installed apps

**Related Play forms**
- **Target audience:** 18 and over (16–17 is also fine). No group under 13.
- **Ads:** none.
- **Background location:** the app requests it for the optional leaving-home
  dua.
  - Play needs the **Location permissions declaration**: the feature
    description, why foreground location isn't enough, and a short video of
    turning the feature on.
  - If it's going to hold up the release, ship without background location
    first.
- **Financial features:** none. The donation link opens a website.

---

## Chrome Web Store: Developer Dashboard → item → Privacy

**Single purpose**

> Ihsaanly shows what a Muslim can do today from the Sunnah — the prayer
> windows for your location, the day's optional acts and duas — and reminds you
> of them with notifications.

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `alarms` | Schedules the reminders for prayer windows and the day's optional acts while the popup is closed. |
| `notifications` | Shows those reminders as system notifications. They're local only, with no push service. |
| `storage` | Keeps the reminder schedule and the toolbar badge state for the background service worker. |
| `geolocation` | Works out prayer times for where you are, if you allow it. You can pick a city instead. The location is used in the browser; when signed in, only a version rounded to about 1 km syncs. |
| `identity` | Signs you in with Google, optionally, to sync your record with your other devices. It isn't needed to use the extension. |

**Host permissions:** none requested.

**Remote code:** "No, I am not using remote code." All JavaScript ships in the
package; Firebase is bundled.

**Data usage.** Tick only these:

| Type | Tick | Why |
| --- | --- | --- |
| Personally identifiable information | ✅ | Name and email from Google, only when signed in |
| Authentication information | ✅ | The Google sign-in token, kept for the session |
| Location | ✅ | Approximate (about 1 km), only when signed in |
| User activity | ⬜ | No clicks, keystrokes or network monitoring |
| Health, Financial and payment, Personal communications, Web history, Website content | ⬜ | None |

**Certifications.** Tick all three:
- I do not sell or transfer user data to third parties, outside of the
  approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my
  item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for
  lending purposes.

**Privacy policy URL:** `https://ihsaanly.app/legal/privacy/`

---

## Left to do

- **Lawyer check:** whether the tracking-pause setting counts as health
  information. It's a synced on/off switch with no reason stored. These
  answers treat it as user content, not health.
