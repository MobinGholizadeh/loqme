# Void Frame hosting isolation

Void Frame shares the production host with Loqme but has an independent release and runtime boundary.

- Source: the `voidframe-source` branch in this repository
- Workflow: `.github/workflows/deploy-voidframe.yml`, manually dispatched
- Image: `ghcr.io/mobingholizadeh/voidframe`, pinned by digest
- Server directory: `/opt/voidframe`
- Container and volume: `voidframe-app` and `voidframe_data`
- Loopback upstream: `127.0.0.1:3100`
- Public names: `voidframe.space` and `www.voidframe.space`

The workflow uses the existing server SSH secrets plus dedicated `VOIDFRAME_ADMIN_PASSWORD_HASH` and `VOIDFRAME_ADMIN_SESSION_SECRET` secrets. It does not run Loqme migrations, restart Loqme services, access Loqme databases, or share application data.

The first deployment installs an HTTP Nginx virtual host and verifies it with the `Host` header. If both public names resolve to the configured server, it obtains and verifies a Let's Encrypt certificate. If DNS is absent or points elsewhere, TLS is deferred; rerun the workflow after creating the DNS records.

Do not delete the `voidframe_data` volume during image cleanup. It contains products, order records, previews, and customer downloads.
