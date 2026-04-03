import { test } from "@playwright/test";

test("Capture current app state", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "test-results/NOW-1-empty.png" });

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  // Draw rect
  await page.click('[data-testid="tool-rect"]');
  await page.waitForTimeout(200);
  await page.mouse.click(cx - 80, cy - 40);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 80, cy + 40);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/NOW-2-rect-drawn.png" });

  // Extrude dialog
  await page.click('[data-testid="tool-extrude"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/NOW-3-extrude-dialog.png" });

  const apply = page.locator('[data-testid="param-apply"]');
  if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: "test-results/NOW-4-extruded.png" });

  // Fillet dialog
  await page.click('[data-testid="tool-fillet"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/NOW-5-fillet-dialog.png" });
  if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(600);
  }

  // Hole dialog
  await page.click('[data-testid="tool-hole"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/NOW-6-hole-dialog.png" });
  if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: "test-results/NOW-7-with-hole.png" });

  // Helix
  await page.click('[data-testid="tool-helix"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/NOW-8-helix-dialog.png" });
  if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: "test-results/NOW-9-final.png" });
});
