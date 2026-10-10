# SYNQ — Google Play release checklist

## Blocking before upload

- [ ] Replace `YOUR_SUPPORT_EMAIL` in `docs/privacy-policy.html` and `docs/delete-account.html`.
- [ ] Publish `/docs` at a stable public HTTPS URL (GitHub Pages is suitable), then add the privacy-policy URL and deletion URL in Play Console.
- [ ] Deploy `firestore.rules`.
- [ ] Create a signed production AAB with `npx eas-cli build --platform android --profile production`.
- [ ] Enable Play App Signing and keep the EAS upload credentials protected.
- [ ] Complete Data Safety using `DATA_SAFETY.md`, then re-check it against the final SDK list.
- [ ] Confirm in App content that SYNQ does not use the Advertising ID.

## Play Console content

- [ ] App category: Productivity.
- [ ] Ads: No, unless ads are added later.
- [ ] Target audience: adults/general productivity; do not select children unless the product is redesigned for Families policy.
- [ ] Content rating questionnaire.
- [ ] App access: provide reviewer test credentials if sign-in is mandatory.
- [ ] Add support email, privacy URL, deletion URL, short description, full description, icon, feature graphic, phone screenshots.

## Testing tracks

- [ ] Upload to Internal testing first and test install/update from Google Play.
- [ ] Test account creation, password reset, sign-in/out, account deletion, notifications denied/allowed, background timer, custom sound, manual time, PDF/Excel share, RTL/LTR, offline/reconnect.
- [ ] For a personal developer account created after November 13, 2023: run a closed test with at least 12 opted-in testers continuously for 14 days before applying for production access.
- [ ] Review Android vitals, pre-launch report, accessibility, crashes, and ANRs before production rollout.

## Every update

- [ ] Increment version/versionCode (EAS production profile uses remote auto-increment).
- [ ] `npm ci && npm run validate`
- [ ] Check `npm audit` without using `--force` blindly.
- [ ] Update privacy/Data Safety if SDKs or data collection change.
