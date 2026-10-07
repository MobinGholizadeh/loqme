package ir.loqme.app;

import org.json.JSONObject;
import java.net.URI;

/** The update feed is public, but never an arbitrary URL launcher. */
final class UpdateInfo {
    static final long DAY_MS = 24 * 60 * 60 * 1000L;
    final int versionCode;
    final int minSdk;
    final String versionName;
    final String apkUrl;

    private UpdateInfo(int code, int sdk, String name, String url) {
        versionCode = code; minSdk = sdk; versionName = name; apkUrl = url;
    }

    static boolean shouldCheck(long now, long lastChecked) {
        return lastChecked == 0 || now < lastChecked || now - lastChecked >= DAY_MS;
    }

    static UpdateInfo parse(String json) throws Exception {
        JSONObject value = new JSONObject(json);
        int code = value.getInt("versionCode");
        int sdk = value.getInt("minSdk");
        String name = value.getString("versionName");
        String url = value.getString("apkUrl");
        URI uri = new URI(url);
        if (code <= 0 || sdk < 21 || !name.matches("[0-9]+\\.[0-9]+\\.[0-9]+")
                || !"https".equals(uri.getScheme()) || !"loqme.shop".equals(uri.getHost())
                || uri.getPort() != -1 || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || !uri.getPath().equals("/api/android/downloads/loqme-v" + code + ".apk")
                || !value.getString("sha256").matches("[a-f0-9]{64}")
                || !value.getString("sourceCommit").matches("[a-f0-9]{40}")) {
            throw new IllegalArgumentException("Invalid update metadata");
        }
        return new UpdateInfo(code, sdk, name, url);
    }

    boolean availableFor(int installedCode, int deviceSdk) {
        return versionCode > installedCode && minSdk <= deviceSdk;
    }
}
