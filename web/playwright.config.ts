import { defineConfig, devices } from "@playwright/test";

// Browser tests run on the Google Chrome installed on this Mac (channel "chrome"):
// Playwright's own browser download times out on this network. WebKit (Safari's engine)
// is therefore not tested; iPhone sizes are emulated through Chrome.
const chrome = { browserName: "chromium" as const, channel: "chrome" };

// Exact sizes from REQUIREMENTS section 7a (Playwright's own presets differ slightly, e.g. 320x568).
const mobile = (name: string, width: number, height: number, base: keyof typeof devices) => ({
  name,
  use: { ...devices[base], ...chrome, viewport: { width, height } },
});

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/e2e",
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  fullyParallel: true,
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  // BASE_URL points the tests at an already running server (for example a production build on another port)
  webServer: process.env.BASE_URL ? undefined : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    mobile("phone-360x640", 360, 640, "Galaxy S9+"),
    mobile("phone-375x667", 375, 667, "iPhone SE"),
    mobile("phone-390x844", 390, 844, "iPhone 14"),
    mobile("phone-412x915", 412, 915, "Pixel 7"),
    mobile("phone-landscape-667x375", 667, 375, "iPhone SE landscape"),
    mobile("tablet-768x1024", 768, 1024, "iPad Mini"),
    { name: "desktop-1280x720", use: { ...chrome, viewport: { width: 1280, height: 720 } } },
    { name: "desktop-1440x900", use: { ...chrome, viewport: { width: 1440, height: 900 } } },
  ],
});
