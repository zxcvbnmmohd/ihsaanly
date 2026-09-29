# Google Play — listing and questionnaires

The folders beside this file are in fastlane `supply` layout, one per Play locale:
`title.txt` (≤30), `short_description.txt` (≤80), `full_description.txt` (≤4000),
`changelogs/1.txt` (≤500, named after the `versionCode` it describes). Files have no
trailing newline on purpose, so what you paste is exactly what was counted.

| Our language | Play locale      | Notes                                                                                                           |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| English      | `en-US`, `en-GB` | Identical text; the default listing is `en-US`                                                                  |
| Arabic       | `ar`             |                                                                                                                 |
| French       | `fr-FR`          | Add `fr-CA` by copying the folder if wanted                                                                     |
| Italian      | `it-IT`          |                                                                                                                 |
| Japanese     | `ja-JP`          |                                                                                                                 |
| Hindi        | `hi-IN`          |                                                                                                                 |
| Urdu         | `ur`             |                                                                                                                 |
| Mandarin     | `zh-CN`          | Simplified                                                                                                      |
| Cantonese    | `zh-HK`          | Standard written Chinese in Traditional characters, not colloquial Cantonese; copy to `zh-TW` if wanted         |
| Somali       | —                | **Not offered by Play Console.** Somali speakers see the default (English) listing; the app itself is in Somali |

## Store settings

- **App category:** Lifestyle. (Books & Reference is the alternative. Lifestyle matches
  a thing used through the day, and it is where the category's users look.)
- **Tags** (up to five, chosen from Play's own list in Store settings, so check each
  exists when you get there): Religion / spirituality, Prayer, Reference, Lifestyle,
  Calendar. Do not pick tags for features the app lacks (audio, Quran recitation).
- **Contact email:** support@ihsaanly.app
- **Website:** https://zxcvbnmmohd.github.io/ihsaanly/
- **Privacy policy:** https://zxcvbnmmohd.github.io/ihsaanly/legal/privacy-policy
- **Price:** Free. **Contains ads:** No. **In-app purchases:** No.

## Content rating (IARC questionnaire)

- **Category:** Reference, News, or Educational.
- Violence, blood, fear/horror: **No**
- Sexuality, nudity: **No**
- Language (profanity, crude humour): **No**
- Controlled substances (drugs, alcohol, tobacco): **No**
- Gambling, simulated gambling: **No**
- Miscellaneous — users can interact or exchange content: **No**. There is no account,
  no chat, no user-generated content. Sharing an item uses the system share sheet and
  is not interaction inside the app.
- Shares the user's current physical location with other users: **No**. Location is
  used on the device only.
- Allows purchase of digital goods: **No**. The optional donation opens
  `donate.ihsaanly.app` in the browser and unlocks nothing.
- Unrestricted internet access / web browser: **No**. The app opens only specific links
  (the privacy policy, the donation page) in the system browser.
- Religious content is not a rating question.

**Expected result:** Everyone / PEGI 3 / USK 0 / ESRB Everyone / ClassInd L.

## Target audience and content

- **Target age groups:** 18 and over (16–17 is also reasonable). Do **not** select any
  group under 13: the app is not designed for children, and ticking one brings it under
  the Families policy.
- **Could the store listing unintentionally appeal to children?** No.
- **Ads declaration:** No ads.
- **Data safety, background location and financial features** are separate forms,
  tracked in `TODO.md` §2.

## Pushing

`fastlane supply --skip_upload_apk --skip_upload_aab --skip_upload_images --skip_upload_screenshots --metadata_path store/google-play --package_name app.ihsaanly.companion`
(needs a Play service-account JSON key; there is no fastlane setup in this repo), or
paste each file into Play Console → Grow → Store presence → Main store listing, one
language at a time.
