package ir.loqme.app;

import android.net.Uri;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Restrict owned-site navigation without affecting external payment custom tabs. */
public class LoqmeLauncherActivity extends LauncherActivity {
    static Uri safeLaunchUri(Uri uri) {
        if (uri != null && "https".equals(uri.getScheme()) && "loqme.shop".equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null
                && (uri.getPath() == null || !uri.getPath().startsWith("/api/android/"))) return uri;
        return Uri.parse("https://loqme.shop/");
    }

    @Override protected Uri getLaunchingUrl() {
        return safeLaunchUri(getIntent().getData());
    }
}
