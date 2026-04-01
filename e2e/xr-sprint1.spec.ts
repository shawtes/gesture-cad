import { test, expect } from "@playwright/test";

test.describe("XR Sprint 1: WebXR Session + GLB Viewer", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("gesture-cad-tutorial-dismissed", "true");
    });
  });

  test.describe("XR App Loads", () => {
    test("XR page loads successfully", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      await expect(page.locator("canvas").first()).toBeVisible({ timeout: 10000 });
    });

    test("GestureCAD XR brand is visible", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      await expect(page.getByText("GestureCAD XR")).toBeVisible();
    });

    test("Enter AR button exists", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      await expect(page.getByTestId("enter-ar-btn")).toBeVisible();
    });

    test("Enter VR button exists", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      await expect(page.getByTestId("enter-vr-btn")).toBeVisible();
    });

    test("Load Model button exists", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      await expect(page.getByTestId("load-model-btn")).toBeVisible();
    });
  });

  test.describe("Mode Switching", () => {
    test("View, Draw, Measure mode buttons exist", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      await expect(page.getByTestId("mode-view")).toBeVisible();
      await expect(page.getByTestId("mode-draw")).toBeVisible();
      await expect(page.getByTestId("mode-measure")).toBeVisible();
    });

    test("clicking Draw mode activates it", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      const drawBtn = page.getByTestId("mode-draw");
      await drawBtn.click();
      // Should have active styling
      const borderColor = await drawBtn.evaluate((el) => getComputedStyle(el).borderColor);
      expect(borderColor).toContain("59, 130, 246"); // #3b82f6
    });
  });

  test.describe("Drop Zone", () => {
    test("drop hint is visible when no model loaded", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      await expect(page.getByTestId("drop-hint")).toBeVisible();
      await expect(page.getByText("Drop a .glb model here")).toBeVisible();
    });
  });

  test.describe("3D Canvas", () => {
    test("WebGL canvas renders", async ({ page }) => {
      await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
      const canvas = page.locator("canvas").first();
      await canvas.waitFor({ state: "visible", timeout: 10000 });
      const hasWebGL = await page.evaluate(() => {
        const c = document.querySelector("canvas");
        return c ? !!(c.getContext("webgl2") || c.getContext("webgl")) : false;
      });
      expect(hasWebGL).toBe(true);
    });
  });
});
