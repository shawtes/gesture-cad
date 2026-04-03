import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["html", { outputFolder: "./report" }], ["list"]],
  timeout: 600000, // 10 minutes for the single mega-test
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    trace: "on",
    screenshot: "on",
    video: "on",
  },
  projects: [
    {
      name: "onshape-research",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
