# Deploy Void Frame on inexpensive PHP hosting

## What the plan needs

- PHP 8.2 or newer, with Fileinfo (normally enabled).
- Apache or LiteSpeed with `.htaccess` support, and HTTPS for your domain.
- A writable private directory **outside** the public document root. The host must allow PHP to access this directory (including its `open_basedir` rules).
- Enough disk space and transfer allowance for your downloadable products and previews. The app supports 50 MB per file, but a lower host limit still applies.
- For automatic updates: FTPS access. Manual control-panel uploads also work.

No Node.js hosting, SQL database, Composer, queue worker, scheduled task, or blockchain API subscription is required. A static-only plan without PHP cannot run the creator studio or securely deliver paid files. Hosting prices depend on the provider; check renewal prices and storage/traffic limits.

## 1. Get the built files

Download `void-frame-php-hosting` from a successful GitHub Actions run, or run `npm ci` and `npm run build` on your computer. Build tooling runs locally or in GitHub, never on the shared host.

The downloadable package contains `public_html/`, this guide, and a configuration example. Upload the **contents** of `public_html/` (or local `dist/`) to the document root for your domain, including hidden `.htaccess` and `.user.ini`. The site is designed for a domain root, such as `https://voidframe.space/`, rather than a subfolder.

## 2. Configure the owner privately

Use this directory layout (replace the account name/path as needed):

```text
/home/your-account/
  voidframe-config.php      PRIVATE: generated credentials and storage path
  voidframe-data/           PRIVATE: created automatically by PHP
    store.json
    preview/
    download/
  public_html/             PUBLIC: uploaded dist contents
    index.html
    .htaccess
    .user.ini
    assets/
    order.html
    api/store.php
    api/health.php
    api/_lib/
```

Generate `voidframe-config.php` with `scripts/setup-php.php`. It reads a new password from standard input, generates a bcrypt hash and a random session secret, and refuses to overwrite an existing config. Passwords must be 12–72 bytes. Neither plaintext password nor generated secrets are printed.

On PowerShell with PHP installed:

```powershell
$ownerLogin = Get-Credential -UserName owner -Message 'Choose your Void Frame owner password'
$ownerLogin.GetNetworkCredential().Password | php scripts/setup-php.php
```

If you use Docker for development instead of a local PHP installation:

```powershell
$ownerLogin = Get-Credential -UserName owner -Message 'Choose your Void Frame owner password'
$ownerLogin.GetNetworkCredential().Password | docker run --rm -i --mount "type=bind,source=$($PWD.Path),target=/work" -w /work php:8.3-apache php scripts/setup-php.php
```

On Bash with PHP installed:

```sh
read -r -s -p 'Owner password: ' OWNER_PASSWORD; printf '\n'
printf '%s' "$OWNER_PASSWORD" | php scripts/setup-php.php
unset OWNER_PASSWORD
```

Upload the resulting config **next to** `public_html`, not into it. For a host with a different directory layout, adjust `data_dir` and place the file one level above the actual document root, or set the server's `VOIDFRAME_CONFIG` environment variable to its absolute private path. The PHP process must be able to read the config and write the data folder. Prefer permissions 600 for the config/files and 700 for private directories when PHP runs as your hosting account.

Leave `secure_cookies` enabled in production and enable HTTPS before logging into the studio. There is no public first-visitor setup page. Never use an online password-hash generator or upload passwords into the public folder.

## 3. Move existing work and orders

Back up the current private data. Pause owner changes and order creation during the final copy, then copy the complete `store.json`, `preview/`, and `download/` from the existing `voidframe_data` volume into `voidframe-data/`. Preserve IDs, tokens, filenames, and JSON content. If the new directory already contains an empty store created by a health check, replace it with the backed-up store while requests are paused.

The PHP API understands the existing data format; there is no SQL migration. Previously issued `/order?id=...&token=...` links continue working on the same domain. Old `/api/store` download links are supported by `.htaccess`. Keep the same `session_secret` if preserving existing owner cookies is desired, but replace the scrypt password hash with a newly generated bcrypt hash; PHP does not use the old hash.

Do not put private files under `public_html` or rebuild a store from sample listings. Back up the config and the complete data directory regularly.

## 4. Verify before switching hosting

Open the home page, `/api/health.php`, and `/order/`. Sign into Creator studio, upload a preview and downloadable file, create a free listing, and check its download. Confirm wallet settings and existing purchases after copying data. Payment review is manual: review a transaction on Arbitrum before approving it. Do not approve an unpaid order just to test a production download.

`.user.ini` requests 50 MB uploads and a 55 MB POST limit. On hosts that use another PHP handler, use the control panel's PHP settings to set `upload_max_filesize=50M` and `post_max_size=55M`. A provider may impose a smaller hard limit. Changes to `.user.ini` may take several minutes to apply.

The API streams files without loading them entirely into memory, but previews and downloads still count toward your host's storage and bandwidth allowance.

## 5. Automatic deployments to shared hosting

After private configuration and data are in place, configure these GitHub repository **secrets**:

| Secret | Value |
| --- | --- |
| `VOIDFRAME_FTPS_SERVER` | FTPS server hostname |
| `VOIDFRAME_FTPS_USERNAME` | Hosting FTP username |
| `VOIDFRAME_FTPS_PASSWORD` | Hosting FTP password |

Configure these repository **variables**:

| Variable | Value |
| --- | --- |
| `VOIDFRAME_DEPLOY_TARGET` | `shared-hosting` |
| `VOIDFRAME_FTPS_DIRECTORY` | The account-relative directory for this site's public root, ending in `/`, such as `public_html/` |
| `VOIDFRAME_SITE_URL` | Your HTTPS origin, for example `https://voidframe.space` |

The pipeline then tests the complete PHP application, uploads the build using certificate-verified FTPS, and checks the public health endpoint. Use an FTP account restricted to this site's directory. No private config or store data is included in the deployed build. The provider must support explicit FTPS on port 21; a provider offering only SFTP needs a different transfer configuration.

Before changing the target variable, the existing VPS deployment remains the default. Its PHP image uses the same `voidframe_data` volume and uid 1001. Set `VOIDFRAME_PHP_ADMIN_PASSWORD_HASH` once with the bcrypt hash; leave the previous `VOIDFRAME_ADMIN_PASSWORD_HASH` secret available for rollback to the old application. Existing sessions use `VOIDFRAME_ADMIN_SESSION_SECRET`.

Changing the deployment target does not change DNS, cancel the old server, or migrate data. Do those only after checking the new hosting with the real domain and data.
