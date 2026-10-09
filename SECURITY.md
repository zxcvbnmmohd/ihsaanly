# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue.

- **Preferred:** GitHub's private reporting. Open the repository's
  **Security** tab → **Report a vulnerability**.
- **Or email** <privacy@ihsaanly.app> with "Security" in the subject.

Include what you found, how to reproduce it, and what an attacker could do
with it. If you have a proof of concept, include it, but don't access, change
or delete anyone else's data to build one; test with your own accounts.

We'll acknowledge your report within 5 days, keep you updated while we fix
it, and credit you when the fix is public unless you'd rather we didn't.

## Scope

In scope:

- the apps: iOS, Android, the web app at companion.ihsaanly.app and the
  Chrome extension;
- the website, ihsaanly.app (including dev.ihsaanly.app and
  dev.companion.ihsaanly.app);
- the Firestore security rules (`packages/cloud/firestore.rules`) and how the
  apps use Firebase;
- the content updates the apps download from ihsaanly.app;
- this repository's workflows and anything committed by mistake.

Out of scope:

- Firebase client API keys in the repository and app bundles. They are public
  by design; they're restricted to Firebase APIs and, for the mobile keys, to
  our apps. Report them only if you can use one to read or write data you
  shouldn't.
- The donation page's payment processing, which PayPal runs.
- Denial of service, spam, social engineering, and findings that need a
  rooted or jailbroken device or physical access.
- Missing best-practice headers with no demonstrated impact.

## Supported versions

Only the latest release of each app, and the current `production` branch, get
security fixes.
