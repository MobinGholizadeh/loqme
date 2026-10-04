# CP-10.19 — Android launch, account login and security repairs

User explicitly requested repair and push on 2026-10-03. This checkpoint repairs the existing GitHub-release TWA; it does not implement the planned native React Native/Expo client.

## Confirmed faults and repairs

- Android launched `loqme.ir` rather than official `loqme.shop`. Its app-side trust statement incorrectly targeted an Android package instead of a website; the website contained a placeholder certificate and did not trust the randomly signed `.debug` package shipped by CI.
- Android now launches HTTPS `loqme.shop`, with matching web/app Digital Asset Links. CI builds a non-debuggable release, uses a persistent signing key and verifies the actual APK certificate against both committed and live assetlinks before publishing. Debug builds are manual artifacts only. Backup and cleartext traffic are disabled. Manifest explicitly scopes the installed web application to `/`.
- Signing credentials were created and stored as GitHub repository secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`. Recovery material is outside the repository in the operator's private Codex credentials directory. Never commit or print it. Public certificate: `E3:8A:58:F8:4B:FB:0C:21:87:06:9A:D2:BB:4E:A9:6D:50:C0:DD:9D:57:5B:32:85:99:42:40:14:DD:4E:37:8A`.
- A previous debug installation must be removed when installing the new `ir.loqme.app` release. Do not trust arbitrary debug certificates to hide browser controls. External payment/other origins can legitimately show browser controls. On-device Chrome verification remains a separate acceptance gate.
- OTP requests now default to login even when `mode` is omitted or `checkExists` is false. Missing and inactive accounts cannot reach code persistence/SMS dispatch. Registration must explicitly use `mode: register`; business onboarding passes that intent and offers a login switch for existing customers.
- Existence checks run after phone throttling (3 attempts/10 minutes). Requests additionally have an IP bucket (10 attempts/10 minutes), same-origin browser checks, a 4 KiB streamed body limit and no-store responses. Maps expire old entries and cap key count. `X-Real-IP` is trusted only behind the configured proxy which overwrites it; the Compose app port remains loopback-only. Missing IPs share a restrictive bucket. These limits remain per-process and restart with the application; shared/distributed throttling is still a production scaling requirement.
- The unused `/api/auth/check-account` GET/POST endpoint now returns a uniform 410 without database access. It formerly exposed phone existence, role and active status publicly. User-requested login errors intentionally reveal limited account existence, now behind throttling; do not claim complete enumeration resistance.
- Production JWT signing refuses a missing, short or known default development key. OTP error logs omit raw exception/provider data. Registration is excluded from worker caching, and the cache version is bumped.
- Account header uses the same wordmark typography and 38px icon dimensions as discovery; logo hover scaling was removed. Unknown-account UI announces a Persian error and offers registration with the number preserved, without sending another code until submission.

## Verification

- 84 focused cases across 9 suites passed, followed by the expanded account/security suites (15 cases), bringing the focused covered set to 86 cases.
- 9 optimized-production browser cases pass, including account-not-found recovery, axe checks, mobile/desktop header dimensions, PWA offline/private-route behavior, resend, review/complaint and refund regressions. Login and 390px account screenshots inspected.
- Production build, lint and all workspace typechecks pass. Android trust validator accepts the intended certificate and rejects a different signer or debug package.
- Local PostgreSQL/Docker was unavailable. Database integration and APK compilation must be verified by GitHub CI after push. No live OTP SMS was sent for testing.
- `npm audit --omit=dev` reports zero vulnerabilities. Full audit reports seven high findings in the development dependency chain rooted in `braces <=3.0.3` ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)), with no patched upstream version available at review time. Build/lint patterns are repository-owned, not request input. A forced Tailwind major migration was not performed; track upstream remediation separately.

## Release checks

### Delivered 2026-10-04

Implementation/release revision `69fb507` is deployed. [Production run 37169339205](https://github.com/MobinGholizadeh/loqme/actions/runs/37169339205) passed **936/936 cases across 75 suites**, three retention tests, image build and deployment. Cleanup reduced root disk usage from 100% to 25% (36 GB available); the production database readiness check passed. [Android run 37169339257](https://github.com/MobinGholizadeh/loqme/actions/runs/37169339257) compiled and signed the release, checked the APK certificate against the committed and live association, and published `loqme-app.apk` (2,712,095 bytes) in [Latest](https://github.com/MobinGholizadeh/loqme/releases/tag/latest).

Public post-release checks: readiness HTTP 200/database connected; assetlinks HTTP 200/application-json with the expected package/certificate; retired account lookup HTTP 410/private-no-store; cross-origin OTP request HTTP 403. No SMS was dispatched by live checks. Physical Android launch/Chrome verification remains an owner device check; install the new signed APK rather than the old debug build. The unpatched development dependency advisory and existing M11 gates remain open.

Follow-up release investigation: production disk was 100% full (48 GB), with approximately 44.85 GB of Docker images, 2.667 GB build cache and only 2.7 MB of database backups. The deployment now removes only obsolete Loqme image references, preserving all images referenced by any container plus the two newest rollback images, and prunes build cache older than seven days. Database volumes, uploaded files and backups are untouched. Three retention safety tests cover these boundaries. A manual read-only diagnostics workflow records disk/image inventory. CI also caught the outdated service-worker v4 test fixture; it now asserts v1/v4 eviction and v5 preservation. Android certificate parsing supports SDK-specific signer prefixes while requiring one certificate.

After push, inspect both workflows. Production must serve the new assetlinks without redirects. APK publication is gated on matching live trust and can wait 15 minutes for deployment. A failed trust gate must never be bypassed: complete the web deployment, then rerun Android build. Confirm missing-account response in the real login UI and launch the new signed release on Android to verify absence of the URL bar on Loqme pages.

Reference: [Chrome TWA integration](https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide).
