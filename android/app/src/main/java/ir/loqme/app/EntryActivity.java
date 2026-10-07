package ir.loqme.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Optional bounded update check; networking must never trap users on launch. */
public class EntryActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private boolean completed;
    private final Runnable timeout = this::openApp;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        // Deep-link returns (including payment) should enter immediately.
        if (getIntent().getData() != null) { openApp(); return; }
        SharedPreferences prefs = getSharedPreferences("updates", MODE_PRIVATE);
        long now = System.currentTimeMillis();
        if (!UpdateInfo.shouldCheck(now, prefs.getLong("checkedAt", 0))) { openApp(); return; }
        prefs.edit().putLong("checkedAt", now).apply();
        showLaunchScreen();
        handler.postDelayed(timeout, 2500);
        worker.execute(() -> {
            UpdateInfo update = fetchUpdate();
            handler.post(() -> {
                if (completed || isFinishing() || isDestroyed()) return;
                handler.removeCallbacks(timeout);
                if (update == null || !update.availableFor(BuildConfig.VERSION_CODE, Build.VERSION.SDK_INT)) {
                    openApp(); return;
                }
                new AlertDialog.Builder(this)
                    .setTitle("نسخه تازه لقمه آماده است")
                    .setMessage("نسخه " + update.versionName + " آماده دریافت است. نصب به‌روزرسانی با تأیید شما انجام می‌شود.")
                    .setPositiveButton("به‌روزرسانی", (dialog, which) -> openDownload(update.apkUrl))
                    .setNegativeButton("بعداً", (dialog, which) -> openApp())
                    .setOnCancelListener(dialog -> openApp()).show();
            });
        });
    }

    private void showLaunchScreen() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(32, 32, 32, 32);
        layout.setBackgroundColor(0xFFFFFFFF);
        layout.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        icon.setContentDescription("لقمه");
        int size = (int) (96 * getResources().getDisplayMetrics().density);
        layout.addView(icon, new LinearLayout.LayoutParams(size, size));
        TextView text = new TextView(this);
        text.setText("لقمه · " + BuildConfig.VERSION_NAME);
        text.setTextColor(0xFF135E66);
        text.setTextSize(20);
        text.setPadding(0, 24, 0, 24);
        layout.addView(text);
        Button continueButton = new Button(this);
        continueButton.setText("ورود به لقمه");
        continueButton.setTextColor(0xFFFFFFFF);
        continueButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF135E66));
        continueButton.setOnClickListener(view -> openApp());
        layout.addView(continueButton);
        setContentView(layout);
    }

    private UpdateInfo fetchUpdate() {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL("https://loqme.shop/api/android/latest").openConnection();
            connection.setConnectTimeout(1500);
            connection.setReadTimeout(1500);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Cache-Control", "no-cache");
            if (connection.getResponseCode() != 200) return null;
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                byte[] chunk = new byte[1024]; int count;
                while ((count = input.read(chunk)) != -1) {
                    if (buffer.size() + count > 8192) return null;
                    buffer.write(chunk, 0, count);
                }
                return UpdateInfo.parse(new String(buffer.toByteArray(), StandardCharsets.UTF_8));
            }
        } catch (Exception ignored) { return null; }
        finally { if (connection != null) connection.disconnect(); }
    }

    private void openDownload(String url) {
        if (completed) return;
        try {
            String browser = CustomTabsClient.getPackageName(this, null);
            if (browser == null) { openApp(); return; }
            completed = true;
            CustomTabsIntent tab = new CustomTabsIntent.Builder().build();
            tab.intent.setPackage(browser);
            tab.launchUrl(this, Uri.parse(url));
            finish();
        } catch (Exception ignored) { completed = false; openApp(); }
    }

    private void openApp() {
        if (completed || isFinishing() || isDestroyed()) return;
        completed = true;
        handler.removeCallbacks(timeout);
        Intent intent = new Intent(this, LoqmeLauncherActivity.class);
        intent.setData(LoqmeLauncherActivity.safeLaunchUri(getIntent().getData()));
        startActivity(intent);
        finish();
    }

    @Override protected void onDestroy() {
        completed = true;
        handler.removeCallbacksAndMessages(null);
        worker.shutdownNow();
        super.onDestroy();
    }
}
