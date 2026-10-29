# Mobin portfolio deployment snapshot

This directory contains the static production snapshot for `mobingholizadeh.ir`

The branch-specific deployment workflow publishes it to the same VPS as Loqme, configures an isolated Nginx virtual host, and installs a timer that requests and enables HTTPS after the apex and `www` DNS records resolve to the VPS

It does not change or restart the Loqme application, database, Redis, Docker services, or Loqme virtual host

