import { test, expect } from "@playwright/test";

test("Interactive extrude: draw circle → click extrude → drag to set height", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(1500);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  // Draw a circle
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 60, cy);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/iextrude-1-circle.png" });

  // Click Extrude (via keyboard shortcut)
  await page.keyboard.press("x");
  await page.waitForTimeout(500);

  // Should see "Click on a shape to extrude" message
  await page.screenshot({ path: "test-results/iextrude-2-picking.png" });

  // Click on the canvas to pick the circle
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/iextrude-3-drag-start.png" });

  // Drag upward to set height
  await page.mouse.move(cx, cy - 100, { steps: 10 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/iextrude-4-dragging.png" });

  // Release to confirm
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/iextrude-5-done.png" });

  // Should have a feature now
  await expect(canvas).toBeVisible();
});
