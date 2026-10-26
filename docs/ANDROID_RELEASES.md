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

Production run [37665504690](https://github.com/MobinGholizadeh/loqme/actions/runs/37665504690) passed 958 web tests, eight Linux Android release/publication tests, image build, deployment and the deployment-triggered Android release. Four native update-policy tests and compiled APK checks pass. Emulator evidence confirms clean installation, upgrade from signed version code 122 to 123, deep-link dispatch and bounded offline entry. Local build, lint, workspace typechecks and three optimized-build guest/About browser scenarios pass, including axe and 360/390/768/1440px layouts after the font repair.

Published release: [Android 1.1.123](https://github.com/MobinGholizadeh/loqme/releases/tag/android-v123), code **123**, minimum Android API **21**, source `1f2095a03039ca0a2d9194ddffdddbbfefef7864`, production run number **46**.

- Public APK: https://loqme.shop/api/android/downloads/loqme-v123.apk
- Metadata: https://loqme.shop/api/android/latest
- APK SHA-256: `bb28be101795c4f179a486479741d7b860ccd17b26b75113feea26a585ef745b` (2,665,447 bytes).
- Signer SHA-256: `E3:8A:58:F8:4B:FB:0C:21:87:06:9A:D2:BB:4E:A9:6D:50:C0:DD:9D:57:5B:32:85:99:42:40:14:DD:4E:37:8A`, matching deployed Digital Asset Links and the prior release.
- Independently downloaded GitHub asset and anonymous website APK are byte-identical. Public HEAD returns 200 with exact length; byte-range download returns 206 with the requested 100 bytes.
- Failed production run 37664646182 excluded Android publication. Release verification failure in run 37662923348 left the previous GitHub release unchanged. Stale promotion, immutable collision, checksum failure and stage-before-latest behavior pass Linux tests.

Manual run [37726051748](https://github.com/MobinGholizadeh/loqme/actions/runs/37726051748) exercised the real public metadata from a lower-version debug build: the Persian update dialog appeared, Later returned to browsing, a same-day relaunch did not prompt again, and offline launch passed. [Dialog screenshot](evidence/android-v123/update-prompt.png). The debug package correctly uses browser fallback because its signer is not trusted by production.

Follow-up [run 37726159735](https://github.com/MobinGholizadeh/loqme/actions/runs/37726159735) completed Chrome onboarding and downloaded/installed the public signed APK independently. Its screenshot confirms a full-screen TWA without the browser address bar, whereas the debug signer uses browser controls. The older API-29 browser image leaves the web loading screen visible. [Run 37726572658](https://github.com/MobinGholizadeh/loqme/actions/runs/37726572658) passes on Android API 35 with Chrome 124.0.6367.219; the signed discovery page renders without an address bar ([screenshot](evidence/android-v123/fullscreen-discovery.png)). Chrome's first-launch Running in Chrome disclosure and translation suggestion remain legitimate browser UI. The first cold-launch capture was taken before page paint; the subsequent discovery capture confirms rendering. The API-35 cold-network check took the allowed non-blocking fallback rather than displaying an update; the live prompt/dismissal evidence comes from run 37726051748. Physical-device icon, installed-package diagnosis, real login and payment return remain open; no physical device is attached. Existing M11 gates remain open.

Release acceptance exposed two build issues before publication: optimized APKs shorten resource paths (the verifier now resolves the compiled resource table), and Google's Vazirmatn CSS response caused Next's Google font loader to crash. Official OFL-licensed Vazirmatn v33.003 is now bundled locally through `next/font/local`; builds no longer fetch fonts from Google. The font license and source attribution are included with the asset.

## CP-10.21 emulator UI-dump repair (2026-10-26)

A production acceptance traceback showed `uiautomator dump` returning without the expected XML, followed immediately by a failing `cat /sdcard/loqme-window.xml`. `scripts/android_device_ui.py` now removes the previous temporary dump, captures to `/data/local/tmp/loqme-window.xml`, validates an actual hierarchy containing nodes, and retries transient command, timeout and malformed/missing-file failures up to five times with bounded backoff. Every ADB capture command has a timeout; failure output is retained in the existing evidence artifact. Persistent failure still blocks Android publication. Existing browser onboarding, clean installation, signed upgrade, launch, deep link and offline checks remain intact.

Five mocked regression tests exercise fresh capture, missing-file recovery and evidence, malformed/empty XML, timeout/command recovery and bounded permanent failure. The production validation job runs them before building. Local tests and Python compilation pass; actual hosted-emulator verification must run on GitHub. Four Linux-only publication tests skip on Windows. The reported web deployment job succeeded before the Android job failed, so a red aggregate workflow alone does not demonstrate that the web commit failed to deploy. Live anonymous checks on 2026-10-26 found ready/database connected and public Android 1.1.130 from `6f16eb9`; authenticated run/deployed-source verification remains pending. GitHub authentication was unavailable during local repair; do not claim the patch is published until a push and successful hosted run are recorded.
