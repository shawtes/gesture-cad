/**
 * REAL 3D design demo — draws on all 3 planes, extrudes different shapes,
 * rotates camera to show results, uses multiple tools.
 *
 * Run with: npx playwright test real-3d-design --headed
 */
import { test } from "@playwright/test";

test.use({
  launchOptions: { slowMo: 200 },
  viewport: { width: 1400, height: 900 },
});

test("Build a real 3D object using all planes", async ({ page }) => {
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
    await page.screenshot({ path: `test-results/3D-${name}.png` });
    console.log(`📸 ${name}`);
  }

  async function clickApply() {
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }
  }

  async function interactiveExtrude(dragY: number) {
    await page.keyboard.press("x");
    await page.waitForTimeout(500);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy + dragY, { steps: 15 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  async function rotateView(dx: number, dy: number) {
    await page.mouse.move(cx + 200, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 200 + dx, cy + dy, { steps: 10 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(500);
  }

  // ═══════════════════════════════════
  // STEP 1: Draw on XZ plane (Top view) — base rectangle
  // ═══════════════════════════════════
  console.log("\n=== STEP 1: Draw on XZ plane ===");
  await page.keyboard.press("1"); // XZ plane
  await page.waitForTimeout(300);
  await page.keyboard.press("n"); // Normal to plane (top-down view)
  await page.waitForTimeout(500);
  await screenshot("01-xz-plane-topdown");

  // Draw a rectangle on XZ
  await page.keyboard.press("r");
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 60, cy - 40);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 60, cy + 40);
  await page.waitForTimeout(400);
  await screenshot("02-rect-on-xz");

  // Extrude it upward (drag up)
  await interactiveExtrude(-120);
  await screenshot("03-extruded-rect");

  // Orbit to see 3D result
  await rotateView(-100, -60);
  await screenshot("04-rotated-view");

  // ═══════════════════════════════════
  // STEP 2: Draw on XY plane (Front view) — circle
  // ═══════════════════════════════════
  console.log("\n=== STEP 2: Draw on XY plane ===");
  await page.keyboard.press("2"); // XY plane
  await page.waitForTimeout(300);
  await page.keyboard.press("n"); // Normal to front
  await page.waitForTimeout(500);
  await screenshot("05-xy-plane-front");

  // Draw a circle on XY
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 30, cy);
  await page.waitForTimeout(400);
  await screenshot("06-circle-on-xy");

  // Extrude it
  await interactiveExtrude(-80);
  await screenshot("07-extruded-circle-xy");

  // Orbit to see both shapes
  await rotateView(80, -40);
  await screenshot("08-both-shapes");

  // ═══════════════════════════════════
  // STEP 3: Draw on YZ plane (Side view) — polygon
  // ═══════════════════════════════════
  console.log("\n=== STEP 3: Draw on YZ plane ===");
  await page.keyboard.press("3"); // YZ plane
  await page.waitForTimeout(300);
  await page.keyboard.press("n"); // Normal to side
  await page.waitForTimeout(500);
  await screenshot("09-yz-plane-side");

  // Draw a polygon (hexagon) on YZ
  await page.keyboard.press("g");
  await page.waitForTimeout(300);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 25, cy);
  await page.waitForTimeout(400);
  await screenshot("10-polygon-on-yz");

  // Extrude the polygon
  await interactiveExtrude(-80);
  await screenshot("11-extruded-polygon-yz");

  // Orbit to see all 3 shapes from different planes
  await rotateView(-60, -30);
  await screenshot("12-all-three-planes");

  // ═══════════════════════════════════
  // STEP 4: Add features — hole, fillet, helix
  // ═══════════════════════════════════
  console.log("\n=== STEP 4: Add features ===");

  // Hole
  await page.keyboard.press("h");
  await page.waitForTimeout(500);
  await clickApply();
  await screenshot("13-hole");

  // Fillet — use search
  const searchBtn = page.locator("text=Search tools").first();
  if (await searchBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await searchBtn.click();
    await page.waitForTimeout(200);
    await page.locator("input[placeholder*='Search']").fill("fillet");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
  }
  await clickApply();
  await screenshot("14-fillet");

  // Helix
  if (await searchBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await searchBtn.click();
    await page.waitForTimeout(200);
    await page.locator("input[placeholder*='Search']").fill("helix");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
  }
  await clickApply();
  await screenshot("15-helix");

  // ═══════════════════════════════════
  // STEP 5: Camera views
  // ═══════════════════════════════════
  console.log("\n=== STEP 5: Camera views ===");

  // Top view
  const topBtn = page.locator('[data-testid="viewcube-top"]');
  if (await topBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await topBtn.click();
    await page.waitForTimeout(500);
    await screenshot("16-top-view");
  }

  // Front view
  const frontBtn = page.locator('[data-testid="viewcube-front"]');
  if (await frontBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await frontBtn.click();
    await page.waitForTimeout(500);
    await screenshot("17-front-view");
  }

  // ISO view
  const isoBtn = page.locator('[data-testid="viewcube-iso"]');
  if (await isoBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await isoBtn.click();
    await page.waitForTimeout(500);
    await screenshot("18-iso-view");
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
      await screenshot("19-wireframe");
    }
    await page.keyboard.press("Escape");
  }

  // Back to shaded
  if (await viewOpts.isVisible({ timeout: 500 }).catch(() => false)) {
    await viewOpts.click();
    await page.waitForTimeout(300);
    const shadedBtn = page.locator('[data-testid="render-mode-shaded"]');
    if (await shadedBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await shadedBtn.click();
      await page.waitForTimeout(500);
    }
    await page.keyboard.press("Escape");
  }

  // ═══════════════════════════════════
  // STEP 6: Sidebar tabs
  // ═══════════════════════════════════
  console.log("\n=== STEP 6: Sidebar tabs ===");

  for (const tab of ["Assembly", "Drawing", "Simulate", "CAM", "History"]) {
    const btn = page.locator(`button:has-text("${tab}")`).last();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(400);
      await screenshot(`20-tab-${tab.toLowerCase()}`);
    }
  }

  // Back to model
  const modelBtn = page.locator('button:has-text("Model")').last();
  if (await modelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await modelBtn.click();
    await page.waitForTimeout(300);
  }

  // Final orbit to show the full 3D design
  await rotateView(-80, -50);
  await screenshot("FINAL");

  console.log("\n✅ Real 3D design demo complete");
});
