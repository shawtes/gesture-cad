import { test } from "@playwright/test";
test("screenshot", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "test-results/WHITE-1-empty.png" });

  // Draw circle + extrude
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width/2, cy = box.y + box.height/2;
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 60, cy);
  await page.waitForTimeout(400);

  await page.keyboard.press("x");
  await page.waitForTimeout(800);
  const apply = page.locator('[data-testid="param-apply"]');
  if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: "test-results/WHITE-2-extruded.png" });
});
