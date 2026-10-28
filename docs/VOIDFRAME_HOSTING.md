# Void Frame hosting isolation

Void Frame shares the production host with Loqme but has an independent release and runtime boundary.

- Source: the `voidframe-source` branch in this repository
- Automatic workflow: `.github/workflows/deploy-production.yml` on the `voidframe-source` branch
- Recovery workflow: `.github/workflows/deploy-voidframe.yml` on the default branch, manually dispatched
- Image: `ghcr.io/mobingholizadeh/voidframe`, pinned by digest
- Server directory: `/opt/voidframe`
- Container and volume: `voidframe-app` and `voidframe_data`
- Loopback upstream: `127.0.0.1:3100`
- Public names: `voidframe.space` and `www.voidframe.space`

Every push to `voidframe-source` runs type checking, an optimized build, and a clean-volume integration test covering owner authentication, uploads, checkout, transaction review, protected delivery, and archive. A passing commit is published as a digest-pinned image, deployed through the existing server SSH connection, and health checked. Failed health checks restore the previous image. The workflow uses dedicated `VOIDFRAME_ADMIN_PASSWORD_HASH` and `VOIDFRAME_ADMIN_SESSION_SECRET` secrets. It does not run Loqme migrations, restart Loqme services, access Loqme databases, or share application data.

The deployment installs canonical HTTP and HTTPS Nginx virtual hosts. HTTP redirects to `https://voidframe.space`; the TLS configuration uses the automatically renewed Let's Encrypt certificate and enables HSTS.

Automatic production [run 40788034737](https://github.com/MobinGholizadeh/loqme/actions/runs/40788034737) passed on 2026-10-29 for Void Frame source `32a4be3`. Public checks returned HTTPS 200 with successful certificate verification for both `voidframe.space` and `www.voidframe.space`; HTTP returned the canonical 301 redirect, the favicon returned 200, and Loqme readiness remained 200.

Do not delete the `voidframe_data` volume during image cleanup. It contains products, order records, previews, and customer downloads.
