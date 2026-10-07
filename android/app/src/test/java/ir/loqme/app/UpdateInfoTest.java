package ir.loqme.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class UpdateInfoTest {
    private String metadata(int code, int sdk, String url) {
        return "{\"versionCode\":" + code + ",\"versionName\":\"1.1.200\",\"minSdk\":" + sdk
            + ",\"apkUrl\":\"" + url + "\",\"sha256\":\"" + new String(new char[64]).replace('\0', 'a')
            + "\",\"sourceCommit\":\"" + new String(new char[40]).replace('\0', 'b') + "\"}";
    }

    @Test public void promptsOnlyForNewCompatibleVersion() throws Exception {
        UpdateInfo update = UpdateInfo.parse(metadata(200, 24, "https://loqme.shop/api/android/downloads/loqme-v200.apk"));
        assertTrue(update.availableFor(199, 24));
        assertFalse(update.availableFor(200, 24));
        assertFalse(update.availableFor(201, 24));
        assertFalse(update.availableFor(199, 23));
    }

    @Test public void checksAtMostDailyAndRecoversFromClockChanges() {
        long now = 5 * UpdateInfo.DAY_MS;
        assertTrue(UpdateInfo.shouldCheck(now, 0));
        assertFalse(UpdateInfo.shouldCheck(now, now));
        assertFalse(UpdateInfo.shouldCheck(now, now - UpdateInfo.DAY_MS + 1));
        assertTrue(UpdateInfo.shouldCheck(now, now - UpdateInfo.DAY_MS));
        assertTrue(UpdateInfo.shouldCheck(now, now + 1));
    }

    @Test public void rejectsUntrustedOrMismatchedDownloads() {
        String[] urls = {"http://loqme.shop/api/android/downloads/loqme-v200.apk",
            "https://loqme.ir/api/android/downloads/loqme-v200.apk",
            "https://evil.example/api/android/downloads/loqme-v200.apk",
            "https://loqme.shop@evil.example/api/android/downloads/loqme-v200.apk",
            "https://loqme.shop/api/android/downloads/loqme-v199.apk",
            "https://loqme.shop/api/android/downloads/loqme-v200.apk?redirect=evil",
            "https://loqme.shop:443/api/android/downloads/loqme-v200.apk"};
        for (String url : urls) {
            assertThrows(Exception.class, () -> UpdateInfo.parse(metadata(200, 21, url)));
        }
    }

    @Test public void malformedFeedDoesNotProduceAnUpdate() {
        for (String json : new String[]{"", "{}", "[]", "null", "<html>offline</html>"}) {
            assertThrows(Exception.class, () -> UpdateInfo.parse(json));
        }
        assertThrows(Exception.class, () -> UpdateInfo.parse(metadata(200, 21,
            "https://loqme.shop/api/android/downloads/loqme-v200.apk").replace("\"sha256\"", "\"missing\"")));
    }
}
