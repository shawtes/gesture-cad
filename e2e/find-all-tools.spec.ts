import { test } from "@playwright/test";

test("Show every tool location", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  // Screenshot 1: Main toolbar (Part Design mode)
  await page.screenshot({ path: "test-results/TOOLS-1-main-toolbar.png" });

  // Screenshot 2: Click each dropdown to reveal hidden tools
  const dropdowns = await page.locator(".dropdown-arrow").all();
  for (let i = 0; i < dropdowns.length; i++) {
    try {
      await dropdowns[i].click({ timeout: 1000 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/TOOLS-2-dropdown-${i}.png` });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    } catch {}
  }

  // Screenshot 3: Enter sketch mode to see sketch tools
  await page.keyboard.press("l"); // Line tool enters sketch mode
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/TOOLS-3-sketch-toolbar.png" });

  // Screenshot 4: Search tools (Alt+C)
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  const searchBtn = page.locator("text=Search tools");
  if (await searchBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await searchBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/TOOLS-4-search-empty.png" });

    // Type "thread" to find External Thread
    await page.keyboard.type("thread");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/TOOLS-4b-search-thread.png" });

    // Clear and search "face"
    await page.keyboard.press("Control+a");
    await page.keyboard.type("face");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/TOOLS-4c-search-face.png" });

    // Clear and search "circle"
    await page.keyboard.press("Control+a");
    await page.keyboard.type("circle");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/TOOLS-4d-search-circle.png" });

    await page.keyboard.press("Escape");
  }

  // Screenshot 5: Right sidebar tabs
  const tabs = ["Assembly", "Drawing", "Simulate", "CAM", "History"];
  for (const tab of tabs) {
    const btn = page.locator(`button:has-text("${tab}")`).last();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `test-results/TOOLS-5-tab-${tab.toLowerCase()}.png` });
    }
  }

  // Screenshot 6: Try using a new tool - draw circle then use External Thread
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (box) {
    const cx = box.x + box.width/2, cy = box.y + box.height/2;
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 50, cy);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: "test-results/TOOLS-6a-drew-circle.png" });

  // Extrude it interactively
  await page.keyboard.press("x");
  await page.waitForTimeout(500);
  if (box) {
    const cx = box.x + box.width/2, cy = box.y + box.height/2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 80, { steps: 10 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: "test-results/TOOLS-6b-extruding.png" });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: "test-results/TOOLS-6c-extruded.png" });

  // Now try hole tool
  const holeBtn = page.locator('[data-testid="tool-hole"]').first();
  if (await holeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await holeBtn.click();
  } else {
    // Find hole via search
    const search = page.locator("text=Search tools");
    if (await search.isVisible({ timeout: 500 }).catch(() => false)) {
      await search.click();
      await page.waitForTimeout(200);
      await page.keyboard.type("hole");
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
    }
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/TOOLS-6d-hole-dialog.png" });

  const apply = page.locator('[data-testid="param-apply"]');
  if (await apply.isVisible({ timeout: 1000 }).catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: "test-results/TOOLS-6e-with-hole.png" });
});
