/**
 * Build a 3D house from scratch using GestureCAD tools.
 * Run with: npx playwright test build-house --headed
 */
import { test } from "@playwright/test";

test.use({
  launchOptions: { slowMo: 150 },
  viewport: { width: 1400, height: 900 },
});

test("Design a 3D house", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  async function screenshot(name: string) {
    await page.screenshot({ path: `test-results/HOUSE-${name}.png` });
  }

  async function extrude(dragY: number) {
    await page.keyboard.press("x");
    await page.waitForTimeout(500);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + dragY, { steps: 12 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  async function orbit(dx: number, dy: number) {
    await page.mouse.move(cx + 200, cy + 100);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 200 + dx, cy + 100 + dy, { steps: 8 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(400);
  }

  async function clickApply() {
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }
  }

  async function useTool(name: string) {
    const searchBtn = page.locator("text=Search tools").first();
    if (await searchBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(200);
      await page.locator("input[placeholder*='Search']").fill(name);
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }
  }

  // ═══════════════════════════════════
  // STEP 1: Base/Floor — rectangle on XZ, extrude up
  // ═══════════════════════════════════
  await page.keyboard.press("n"); // top-down view
  await page.waitForTimeout(500);

  // Draw floor rectangle (wide house footprint)
  await page.keyboard.press("r");
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 100, cy - 60);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 100, cy + 60);
  await page.waitForTimeout(400);
  await screenshot("01-floor-plan");

  // Extrude walls up
  await extrude(-140);
  await orbit(-80, -50);
  await screenshot("02-walls");

  // ═══════════════════════════════════
  // STEP 2: Door — draw rect on front wall (XY plane), extrude remove
  // ═══════════════════════════════════
  await page.keyboard.press("2"); // Switch to XY (front) plane
  await page.waitForTimeout(300);

  // Draw door rectangle
  await page.keyboard.press("r");
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 20, cy + 10);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 20, cy + 60);
  await page.waitForTimeout(400);
  await screenshot("03-door-sketch");

  // Extrude the door (this will be a separate feature — like a door block)
  await extrude(-40);
  await screenshot("04-door-extruded");

  // ═══════════════════════════════════
  // STEP 3: Windows — circles on front wall
  // ═══════════════════════════════════
  await page.keyboard.press("2"); // Stay on XY
  await page.waitForTimeout(200);

  // Left window
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 60, cy - 10);
  await page.waitForTimeout(400);
  await page.mouse.click(cx - 45, cy - 10);
  await page.waitForTimeout(400);

  // Extrude window
  await extrude(-30);
  await screenshot("05-left-window");

  // Right window
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.mouse.click(cx + 60, cy - 10);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 75, cy - 10);
  await page.waitForTimeout(400);

  await extrude(-30);
  await screenshot("06-right-window");

  // ═══════════════════════════════════
  // STEP 4: Roof — polygon (triangle) on side (YZ), extrude across
  // ═══════════════════════════════════
  await page.keyboard.press("1"); // Back to XZ
  await page.waitForTimeout(200);
  await page.keyboard.press("n"); // Top down
  await page.waitForTimeout(400);

  // Draw a line for the roof ridge
  await page.keyboard.press("l");
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 110, cy);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 110, cy);
  await page.waitForTimeout(400);

  // Extrude the ridge line into a thin roof plane
  await extrude(-20);
  await screenshot("07-roof");

  // ═══════════════════════════════════
  // STEP 5: Chimney — small rect, extrude tall
  // ═══════════════════════════════════
  await page.keyboard.press("n");
  await page.waitForTimeout(400);
  await page.keyboard.press("r");
  await page.waitForTimeout(300);
  await page.mouse.click(cx + 60, cy - 30);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 75, cy - 15);
  await page.waitForTimeout(400);

  await extrude(-60);
  await screenshot("08-chimney");

  // ═══════════════════════════════════
  // STEP 6: Final views
  // ═══════════════════════════════════

  // Orbit to see the full house from an angle
  await orbit(-120, -70);
  await screenshot("09-house-angle-1");

  await orbit(80, -20);
  await screenshot("10-house-angle-2");

  // Front view
  const frontBtn = page.locator('[data-testid="viewcube-front"]');
  if (await frontBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await frontBtn.click();
    await page.waitForTimeout(500);
    await screenshot("11-house-front");
  }

  // Top view
  const topBtn = page.locator('[data-testid="viewcube-top"]');
  if (await topBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await topBtn.click();
    await page.waitForTimeout(500);
    await screenshot("12-house-top");
  }

  // ISO view
  const isoBtn = page.locator('[data-testid="viewcube-iso"]');
  if (await isoBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await isoBtn.click();
    await page.waitForTimeout(500);
    await screenshot("13-house-iso");
  }

  // Wireframe
  const viewOpts = page.locator('[data-testid="view-options-btn"]');
  if (await viewOpts.isVisible({ timeout: 500 }).catch(() => false)) {
    await viewOpts.click();
    await page.waitForTimeout(300);
    const wireBtn = page.locator('[data-testid="render-mode-wireframe"]');
    if (await wireBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await wireBtn.click();
      await page.waitForTimeout(500);
      await screenshot("14-house-wireframe");
    }
    await page.keyboard.press("Escape");
  }

  console.log("✅ House design complete!");
});
