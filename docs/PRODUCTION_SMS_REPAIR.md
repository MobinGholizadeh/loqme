# Production SMS repair — 2026-09-27

The production container omitted SMS.ir credentials even though Doppler `loqme/prd` held a valid key. Logs reported `SMS.ir API key is missing; delivery is unavailable`; an OTP request returned HTTP 503. Deployment refreshed secrets and the app image but reused an outdated server Compose manifest.

The running app was repaired without changing its image or database in [run 36332785711](https://github.com/MobinGholizadeh/loqme/actions/runs/36332785711). The container now has the configured provider/key and readiness passes. A subsequent real production OTP request to the owner's supplied number returned HTTP 200 / success. SMS.ir acceptance does not prove handset delivery; owner confirmation remains pending.

The permanent workflow installs the versioned Compose manifest, verifies production SMS credentials in a one-off container before migrations/replacement, and restores the previous manifest and environment on failure. Existing backup verification, migration ordering and image rollback remain intact. Seven shell-harness scenarios pass: environment download failure, missing SMS credentials, backup failure, backup verification failure, migration failure, readiness failure and success. No credentials or OTPs are recorded in source, and no production data was reseeded.
