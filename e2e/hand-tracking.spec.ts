import { test, expect } from "@playwright/test";

test.describe("Hand Tracking Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss tutorial overlay in tests
    await page.addInitScript(() => {
      localStorage.setItem("gesture-cad-tutorial-dismissed", "true");
    });
  });

  test("page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "networkidle" });
    const loadTime = Date.now() - start;
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);

    // Canvas renders
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 5000 });
  });

  test("mediapipe WASM files are served locally", async ({ page }) => {
    // Check that the WASM files are accessible from local public/
    const wasmRes = await page.request.get("/mediapipe/vision_wasm_internal.js");
    expect(wasmRes.ok()).toBeTruthy();

    const modelRes = await page.request.get("/mediapipe/hand_landmarker.task");
    expect(modelRes.ok()).toBeTruthy();
  });

  test("enable hand tracking button exists and is clickable", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 5000 });

    // The enable button should be visible before tracking starts
    const enableBtn = page.getByText("Enable Hand Tracking");
    await expect(enableBtn).toBeVisible();
  });

  test("clicking enable shows loading status then camera preview", async ({ page, context }) => {
    // Grant camera permission
    await context.grantPermissions(["camera"]);

    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 5000 });

    // Mock getUserMedia with a fake video stream since there's no real camera in CI
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d")!;
      // Draw a solid color frame so video.readyState becomes >= 2
      ctx.fillStyle = "#333";
      ctx.fillRect(0, 0, 640, 480);

      const stream = canvas.captureStream(30);
      // Override getUserMedia
      navigator.mediaDevices.getUserMedia = async () => stream;
    });

    const enableBtn = page.getByText("Enable Hand Tracking");
    await enableBtn.click();

    // Should show loading status
    const loadingText = page.getByText("Loading hand tracking model");
    await expect(loadingText).toBeVisible({ timeout: 3000 });

    // After model loads, loading text should disappear and PIP canvas should appear
    // The PIP canvas is the second canvas (first is Three.js)
    const allCanvases = page.locator("canvas");
    await expect(allCanvases).toHaveCount(2, { timeout: 15000 });

    // Status bar should show "Tracking"
    await expect(page.getByTestId("status-bar").getByText("Tracking")).toBeVisible();
  });

  test("no console errors on page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 5000 });

    // Filter out expected warnings (React dev mode, etc.)
    const realErrors = errors.filter(
      (e) => !e.includes("React") && !e.includes("Hydration") && !e.includes("Warning")
    );
    expect(realErrors).toHaveLength(0);
  });
});
