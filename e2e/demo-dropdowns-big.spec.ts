import { test } from "@playwright/test";

test.use({
  launchOptions: { slowMo: 500 },
  viewport: { width: 1920, height: 1080 },
});

test("Show each dropdown at full size", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "test-results/BIG-00-toolbar.png" });

  // Get all ▾ dropdown buttons
  const arrows = await page.locator("button").filter({ hasText: "▾" }).all();
  const names = ["extrude", "hole-shell", "pattern", "boolean", "modify", "helix", "plane", "frame"];

  for (let i = 0; i < Math.min(arrows.length, names.length); i++) {
    const isVis = await arrows[i].isVisible().catch(() => false);
    if (!isVis) continue;

    await arrows[i].click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/BIG-${i + 1}-${names[i]}-dropdown.png` });

    // Close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // Sketch mode
  await page.keyboard.press("l");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/BIG-sketch-toolbar.png" });

  // Search
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const search = page.locator("text=Search tools").first();
  if (await search.isVisible({ timeout: 500 }).catch(() => false)) {
    await search.click();
    await page.waitForTimeout(300);
    await page.locator("input[placeholder*='Search']").fill("face");
    await page.waitForTimeout(400);
    await page.screenshot({ path: "test-results/BIG-search-face.png" });
    await page.keyboard.press("Escape");
  }
});
