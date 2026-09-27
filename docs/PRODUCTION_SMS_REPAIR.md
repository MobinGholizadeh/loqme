# Production SMS repair — 2026-09-27

The production container omitted SMS.ir credentials even though Doppler `loqme/prd` held a valid key. Logs reported `SMS.ir API key is missing; delivery is unavailable`; an OTP request returned HTTP 503. Deployment refreshed secrets and the app image but reused an outdated server Compose manifest.

The running app was repaired without changing its image or database in [run 36332785711](https://github.com/MobinGholizadeh/loqme/actions/runs/36332785711). The container now has the configured provider/key and readiness passes. A subsequent real production OTP request to the owner's supplied number returned HTTP 200 / success. SMS.ir acceptance does not prove handset delivery; owner confirmation remains pending.

The permanent workflow installs the versioned Compose manifest, verifies production SMS credentials in a one-off container before migrations/replacement, and restores the previous manifest and environment on failure. Existing backup verification, migration ordering and image rollback remain intact. Seven shell-harness scenarios pass: environment download failure, missing SMS credentials, backup failure, backup verification failure, migration failure, readiness failure and success. No credentials or OTPs are recorded in source, and no production data was reseeded.

Permanent fix `afcd0fe` passed disposable-database CI, Docker build and production deployment in [run 36333252694](https://github.com/MobinGholizadeh/loqme/actions/runs/36333252694). Deployment logs confirm credentials are wired and readiness succeeds. Public readiness was rechecked successfully on 2026-09-28.

## Provider delivery follow-up — 2026-09-28

The accepted bulk diagnostic message later reported `deliveryState: 7` (blacklist), with no delivery timestamp. The mapping was verified against the provider's own public panel bundle (`https://app.sms.ir/main.d47a5886a17ad99e.js`: `BlackList=7`, Persian label «لیست سیاه»). API acceptance alone was therefore not sufficient.

Production had no verification template configured. The existing development configuration used template `242470` / parameter `Code` with the same SMS.ir account. A bounded test through `/v1/send/verify` was accepted; the report contains Loqme branding and no unresolved code placeholder. Doppler `loqme/prd` now uses that existing template and parameter. No API key was rotated or stored in source. Final handset delivery remains unconfirmed; the template report initially had no delivery state. Release `64937cf` reloaded these settings successfully in run 36349502841. A final real production OTP request returned HTTP 200/success. The provider report confirms that request used verification line `10000015`, while the earlier bulk messages on `30002108039036` report blacklist status. The verification message has no delivery state/timestamp yet; handset receipt remains unconfirmed.
