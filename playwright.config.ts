import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: process.env.LOQME_TEST_URL
    ? undefined
    : {
        command: "npm run dev --workspace=@loqme/web -- --port 3002",
        url: "http://localhost:3002",
        reuseExistingServer: true,
        timeout: 120000,
        env: { LOQME_BUILD_DIR: ".next-stitch" },
      },
  use: {
    baseURL: process.env.LOQME_TEST_URL || "http://localhost:3002",
    browserName: "chromium",
    channel: "msedge",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
  },
});
