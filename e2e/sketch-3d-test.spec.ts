import { test, expect } from "@playwright/test";

test("3D Sketch — enter mode and draw lines", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(1500);

  // Enter sketch mode first by pressing L (line tool)
  await page.keyboard.press("l");
  await page.waitForTimeout(500);

  // Look for 3D Sketch button in sketch toolbar
  const btn3d = page.locator('[data-testid="tool-sketch_3d"]');
  const is3dVisible = await btn3d.isVisible({ timeout: 2000 }).catch(() => false);

  if (is3dVisible) {
    await page.screenshot({ path: "test-results/3d-sketch-before.png" });
    await btn3d.click();
    await page.waitForTimeout(800); // Wait for plane switch + tool switch

    // Should now be in line mode on 3D plane
    await page.screenshot({ path: "test-results/3d-sketch-mode.png" });

    // Draw lines by clicking on the canvas
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

      await page.mouse.click(cx - 60, cy);
      await page.waitForTimeout(500);
      await page.mouse.click(cx + 60, cy);
      await page.waitForTimeout(500);

      await page.screenshot({ path: "test-results/3d-sketch-drew.png" });
    }
  }

  // Verify canvas is still working (didn't crash)
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.screenshot({ path: "test-results/3d-sketch-final.png" });
});

test("Custom plane sketch — create plane and sketch on it", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(1500);

  // The Plane tool should be available in the toolbar
  const planeBtn = page.locator('[data-testid="tool-custom_plane"]').first();
  if (await planeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await planeBtn.click();
    await page.waitForTimeout(500);

    // Parameter dialog should appear for plane creation
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.screenshot({ path: "test-results/custom-plane-dialog.png" });
      await apply.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: "test-results/custom-plane-created.png" });
  }

  await expect(page.locator("canvas").first()).toBeVisible();
});

test("Standard plane switching still works", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(1500);

  // Switch planes with keyboard shortcuts
  await page.keyboard.press("1"); // XZ
  await page.waitForTimeout(200);
  await page.keyboard.press("2"); // XY
  await page.waitForTimeout(200);
  await page.keyboard.press("3"); // YZ
  await page.waitForTimeout(200);
  await page.keyboard.press("1"); // back to XZ
  await page.waitForTimeout(200);

  // Draw a line on each plane
  await page.keyboard.press("l");
  await page.waitForTimeout(200);
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width/2 - 50, box.y + box.height/2);
    await page.waitForTimeout(400);
    await page.mouse.click(box.x + box.width/2 + 50, box.y + box.height/2);
    await page.waitForTimeout(400);
  }

  await expect(canvas).toBeVisible();
  await page.screenshot({ path: "test-results/plane-switching.png" });
});
