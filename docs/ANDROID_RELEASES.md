# CP-10.21 — Android branding, launch and update delivery

The user selected repair of the existing TWA so web feature updates continue to reach Android automatically. Native React Native screens remain deferred. Package `ir.loqme.app` and the persistent release signer are retained.

## Changes

- Official Loqme artwork supplies adaptive, round and legacy icons through `scripts/generate-android-icons.cjs`. Android and production URLs use HTTPS `loqme.shop`; obsolete `.ir` origin fallbacks are removed. The package identifier is intentionally unchanged.
- Native `EntryActivity` checks public update metadata on cold launcher entry at most once per day. A 2.5-second deadline and direct continue button prevent network failure from blocking launch. Deep links bypass the check. Compatible updates offer Persian Update/Later actions; downloads use an external browser, with installation approved by Android's user. No session or GitHub credentials enter the APK.
- Public `/api/android/latest` returns version code/name, minimum SDK, APK URL, SHA-256 and commit. Immutable `/api/android/downloads/loqme-v<code>.apk` supports HEAD and single-range resume. Missing/invalid metadata returns uncached 503; missing APKs return 404.
- Android's reusable workflow runs only after a verified production deployment, checking out the exact deployed SHA. Manual Android runs produce debug artifacts only. Publication is serialized; version allocation exceeds all historical release tags and legacy compiled APK codes. Visible versions are `1.1.<code>`.
- Releases have immutable `android-v<code>` tags, versioned APK names, release metadata, checksums and signer evidence. Compiled manifest, signer, trust, legacy icon pixels and adaptive vector are checked before publication. SDK emulator smoke covers clean install, prior signed-release upgrade, launcher and app links.
- Validated APKs are copied over existing SSH credentials into `/opt/loqme/android-releases`, mounted read-only into the web container. Staging first verifies checksum and the exact deployed commit/run marker; public download bytes must match before atomic replacement of `latest.json`. GitHub Latest is updated after live metadata verification. Older deployments and version collisions fail closed. No database changes.

## Operation and recovery

The first repaired APK requires manual installation to introduce the update checker. A correctly signed existing `ir.loqme.app` upgrades in place. An old `.debug` installation is a separate app; identify its package/version before advising removal. Neither the new app nor CI deletes users' old installations.

For a publication failure, the prior latest metadata stays available. Immutable release artifacts are retained. Rerun the failed production workflow/job to build the same source with a new monotonically increasing Android version. An intentional rollback of web source must be launched as a new production run; replaying an older run cannot overwrite a newer deployment marker.

Browser controls are expected for external payment origins and browsers that do not support verified TWA. No trust checks are disabled. Physical-device fullscreen, payment return and actual installed-version diagnosis remain explicit device acceptance gates.

## Validation

Local web/API tests and release-policy tests pass; production build/lint/types and Android CI/emulator acceptance are being completed. The Windows host has Java 8 but no Android SDK; compilation/device evidence will come from the isolated CI runner. Linux file-locking publication tests run in CI (skipped locally on Windows). Release URLs and final evidence will be recorded after publication.

Release acceptance exposed two build issues before publication: optimized APKs shorten resource paths (the verifier now resolves the compiled resource table), and Google's Vazirmatn CSS response caused Next's Google font loader to crash. Official OFL-licensed Vazirmatn v33.003 is now bundled locally through `next/font/local`; builds no longer fetch fonts from Google. The font license and source attribution are included with the asset.
