/**
 * Demo every dropdown in the toolbar — click each ▾ arrow to reveal hidden tools.
 * Run with: npx playwright test demo-dropdowns --headed
 */
import { test } from "@playwright/test";

test.use({ launchOptions: { slowMo: 400 } });

test("Open every dropdown and screenshot each one", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  // First screenshot — main toolbar
  await page.screenshot({ path: "test-results/DD-00-toolbar.png" });

  // Find ALL dropdown arrow buttons in the toolbar
  // These are the small ▾ buttons next to grouped tools
  const arrows = await page.locator("button").filter({ hasText: "▾" }).all();
  console.log(`Found ${arrows.length} dropdown arrows`);

  for (let i = 0; i < arrows.length; i++) {
    const arrow = arrows[i];
    const isVisible = await arrow.isVisible().catch(() => false);
    if (!isVisible) continue;

    try {
      // Get the tool name next to this arrow for labeling
      const parent = arrow.locator("..");
      const siblingText = await parent.locator("span").first().textContent().catch(() => `group-${i}`);
      const label = (siblingText || `group-${i}`).trim().replace(/[^a-zA-Z0-9]/g, "-").substring(0, 20);

      console.log(`\nDropdown ${i}: ${label}`);

      // Click the dropdown arrow
      await arrow.click({ timeout: 2000 });
      await page.waitForTimeout(500);

      // Screenshot the open dropdown
      await page.screenshot({ path: `test-results/DD-${String(i + 1).padStart(2, "0")}-${label}.png` });

      // Log what tools are inside
      const dropdownItems = await page.locator("[style*='position: absolute'] button, [style*='z-index: 100'] button").all();
      for (const item of dropdownItems) {
        const text = await item.textContent().catch(() => "");
        const title = await item.getAttribute("title").catch(() => "");
        if (text && text.trim().length > 0 && text.trim().length < 50) {
          console.log(`  → ${text.trim()} ${title ? `(${title})` : ""}`);
        }
      }

      // Close the dropdown
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    } catch (e) {
      console.log(`  Dropdown ${i}: couldn't open — ${e}`);
    }
  }

  // Now enter sketch mode and show those tools
  console.log("\n=== SKETCH MODE TOOLS ===");
  await page.keyboard.press("l");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/DD-sketch-mode.png" });

  // List all visible sketch tools
  const sketchBtns = await page.locator("[data-testid^='tool-']").all();
  console.log(`\nSketch tools visible: ${sketchBtns.length}`);
  for (const btn of sketchBtns) {
    const id = await btn.getAttribute("data-testid").catch(() => "");
    const title = await btn.getAttribute("title").catch(() => "");
    const isVis = await btn.isVisible().catch(() => false);
    if (isVis && id) {
      console.log(`  ${id}: ${title || ""}`);
    }
  }

  await page.screenshot({ path: "test-results/DD-sketch-all-tools.png" });

  // Exit sketch mode
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // Show the search
  console.log("\n=== SEARCH ===");
  const searchBtn = page.locator("text=Search tools").first();
  if (await searchBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await searchBtn.click();
    await page.waitForTimeout(300);

    // Search for different categories
    for (const query of ["fillet", "hole", "face", "pattern", "thread", "frame", "plane", "mate", "draft"]) {
      await page.locator("input[placeholder*='Search']").fill(query);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/DD-search-${query}.png` });
    }
    await page.keyboard.press("Escape");
  }

  console.log("\n✅ All dropdowns demoed");
});
