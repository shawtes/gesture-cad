/**
 * XR App E2E Tests
 * Tests the desktop view of the XR app (WebXR not testable in Playwright).
 */
import { test, expect } from "@playwright/test";

const URL = process.env.XR_URL || "https://xr-iota.vercel.app";

test.describe("XR App", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
    // Dismiss tutorial if showing
    const closeBtn = page.locator("button:has-text('✕')").first();
    if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeBtn.click();
    }
    // Click Launch 3D Viewer if on landing page
    const launchBtn = page.locator("text=Launch 3D Viewer");
    if (await launchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await launchBtn.click();
      await page.waitForTimeout(8000); // Wait for Three.js
    }
  });

  test("landing page loads with tutorial", async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(2000);
    // Should show tutorial or launch button
    const hasLaunch = await page.locator("text=Launch 3D Viewer").isVisible().catch(() => false);
    const hasTutorial = await page.locator("text=Welcome to GestureCAD").isVisible().catch(() => false);
    expect(hasLaunch || hasTutorial).toBeTruthy();
  });

  test("launch.html loads", async ({ page }) => {
    await page.goto(`${URL}/launch.html`, { waitUntil: "networkidle" });
    await expect(page.locator("text=GestureCAD XR")).toBeVisible();
    await expect(page.locator("text=Launch 3D Viewer")).toBeVisible();
  });

  test("AR and VR buttons are visible", async ({ page }) => {
    await expect(page.locator("button:has-text('AR')").first()).toBeVisible();
    await expect(page.locator("button:has-text('VR')").first()).toBeVisible();
  });

  test("menu opens and shows sections", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    await expect(page.locator("text=ADD SHAPES")).toBeVisible();
    await expect(page.locator("text=GENERATE HOUSE")).toBeVisible();
    await expect(page.locator("text=MATERIAL")).toBeVisible();
    await expect(page.locator("text=ACTIONS")).toBeVisible();
  });

  test("add box primitive via menu", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    // Count before
    const countBefore = await page.locator("text=/\\d+ obj/").first().textContent();
    // Click box button
    await page.locator("button:has-text('Box')").first().click();
    await page.waitForTimeout(1000);
    // Count should increase
    const countAfter = await page.locator("text=/\\d+ obj/").first().textContent();
    expect(countAfter).not.toBe(countBefore);
  });

  test("add all primitives", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    for (const prim of ["Box", "Cyl", "Sph", "Cone", "Tor"]) {
      const btn = page.locator(`button:has-text('${prim}')`).first();
      if (await btn.isVisible()) await btn.click();
      await page.waitForTimeout(300);
    }
    // Should have 5 objects
    await expect(page.locator("text=5 obj")).toBeVisible({ timeout: 3000 });
  });

  test("generate house", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    await page.locator("button:has-text('2-Bed')").click();
    await page.waitForTimeout(1000);
    // Should have multiple objects
    const text = await page.locator("text=/\\d+ obj/").first().textContent();
    const count = parseInt(text?.match(/(\d+)/)?.[1] || "0");
    expect(count).toBeGreaterThan(3);
  });

  test("material mode changes", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    // Find material buttons
    const solidBtn = page.locator("button:has-text('Solid')").first();
    if (await solidBtn.isVisible()) {
      await solidBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator("text=solid")).toBeVisible({ timeout: 3000 });
    }
  });

  test("undo and redo", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    // Add a box
    await page.locator("button:has-text('Box')").first().click();
    await page.waitForTimeout(500);
    // Undo
    await page.locator("button:has-text('Undo')").first().click();
    await page.waitForTimeout(500);
    // Object count should decrease
    await expect(page.locator("text=0 obj")).toBeVisible({ timeout: 3000 });
    // Redo
    await page.locator("button:has-text('Redo')").first().click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=1 obj")).toBeVisible({ timeout: 3000 });
  });

  test("clear all objects", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    await page.locator("button:has-text('Box')").first().click();
    await page.waitForTimeout(300);
    await page.locator("button:has-text('Clear All')").click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=0 obj")).toBeVisible({ timeout: 3000 });
  });

  test("sketch tools sub-menu opens", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    await page.locator("button:has-text('Sketch Tools')").click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=Line")).toBeVisible();
    await expect(page.locator("text=Rectangle")).toBeVisible();
    await expect(page.locator("text=Freehand")).toBeVisible();
    // Back
    await page.locator("button:has-text('← Back')").click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=ADD SHAPES")).toBeVisible();
  });

  test("color presets change", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    // Color dots should be visible
    const colorBtns = page.locator("[style*='border-radius: 15px']");
    const count = await colorBtns.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("table height and scale sliders exist", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    // Scroll down to TABLE section
    await expect(page.locator("text=TABLE")).toBeVisible();
    const sliders = page.locator("input[type='range']");
    const count = await sliders.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("help button reopens tutorial", async ({ page }) => {
    const helpBtn = page.locator("button:has-text('?')").first();
    await helpBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=Welcome to GestureCAD")).toBeVisible();
  });

  test("takes screenshot of workbench", async ({ page }) => {
    await page.click("button:has-text('Menu')");
    await page.waitForTimeout(500);
    // Add some objects
    await page.locator("button:has-text('Box')").first().click();
    await page.waitForTimeout(300);
    await page.locator("button:has-text('Sph')").first().click();
    await page.waitForTimeout(300);
    await page.locator("button:has-text('Cyl')").first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "e2e/screenshots/xr-workbench.png" });
  });
});
