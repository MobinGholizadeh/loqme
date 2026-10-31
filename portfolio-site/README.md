# Mobin portfolio deployment snapshot

This directory contains the static production snapshot for `mobingholizadeh.ir`

Every pushed commit on `codex/portfolio-deploy` runs the production workflow  The workflow validates and publishes this snapshot to the same VPS as Loqme, configures an isolated Nginx virtual host, attempts HTTPS activation immediately, and retains a timer that retries until the apex and `www` DNS records resolve to the VPS

Local commits must be pushed to `origin/codex/portfolio-deploy` before GitHub Actions can deploy them

It does not change or restart the Loqme application, database, Redis, Docker services, or Loqme virtual host
