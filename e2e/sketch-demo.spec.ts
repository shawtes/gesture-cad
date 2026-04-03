/**
 * Show sketch drawing clearly — 2D sketch then 3D sketch.
 * Run with: npx playwright test sketch-demo --headed
 */
import { test } from "@playwright/test";

test.use({
  launchOptions: { slowMo: 300 },
  viewport: { width: 1400, height: 900 },
});

test("2D sketch on XZ plane then extrude", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  // Press N to look straight down at XZ plane
  await page.keyboard.press("n");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/SK-01-topdown-empty.png" });

  // Draw a rectangle
  await page.keyboard.press("r");
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 80, cy - 50);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 80, cy + 50);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/SK-02-rect-drawn.png" });

  // Draw a circle inside
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 30, cy);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/SK-03-circle-inside.png" });

  // Draw lines
  await page.keyboard.press("l");
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 80, cy - 50);
  await page.waitForTimeout(300);
  await page.mouse.click(cx + 80, cy + 50);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/SK-04-line-diagonal.png" });

  // Draw polygon
  await page.keyboard.press("g");
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 50, cy + 30);
  await page.waitForTimeout(400);
  await page.mouse.click(cx - 30, cy + 30);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/SK-05-polygon.png" });

  // Show all sketch entities from top
  await page.screenshot({ path: "test-results/SK-06-full-sketch-topdown.png" });

  // Orbit to see sketch from an angle
  await page.mouse.move(cx + 200, cy);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(cx + 100, cy - 80, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/SK-07-sketch-3d-angle.png" });

  // Now extrude — click and drag
  await page.keyboard.press("x");
  await page.waitForTimeout(500);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 100, { steps: 15 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/SK-08-extruding.png" });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/SK-09-extruded.png" });
});

test("2D sketch on XY (front) plane then extrude forward", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  // Switch to XY (front) plane
  await page.keyboard.press("2");
  await page.waitForTimeout(300);
  await page.keyboard.press("n"); // look at front plane
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/SK-10-front-plane.png" });

  // Draw circle on front plane
  await page.keyboard.press("c");
  await page.waitForTimeout(300);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 50, cy);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/SK-11-circle-front.png" });

  // Extrude — should go forward (along Z)
  await page.keyboard.press("x");
  await page.waitForTimeout(500);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 80, { steps: 15 });
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Orbit to see the extruded cylinder going forward
  await page.mouse.move(cx + 200, cy);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(cx + 100, cy - 60, { steps: 10 });
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/SK-12-extruded-forward.png" });
});

test("3D sketch mode — draw in space", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  await page.screenshot({ path: "test-results/SK-13-before-3d-sketch.png" });

  // Enter sketch mode then click 3D Sketch
  await page.keyboard.press("l");
  await page.waitForTimeout(300);

  const btn3d = page.locator('[data-testid="tool-sketch_3d"]');
  if (await btn3d.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn3d.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "test-results/SK-14-3d-sketch-mode.png" });

    // Draw lines in 3D — from different camera angles
    await page.mouse.click(cx - 60, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 60, cy);
    await page.waitForTimeout(400);
    await page.screenshot({ path: "test-results/SK-15-3d-line-1.png" });

    // Orbit camera
    await page.mouse.move(cx + 200, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 100, cy - 50, { steps: 8 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(500);

    // Draw another line from this new angle
    await page.keyboard.press("l");
    await page.waitForTimeout(300);
    await page.mouse.click(cx - 40, cy + 30);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 40, cy - 30);
    await page.waitForTimeout(400);
    await page.screenshot({ path: "test-results/SK-16-3d-line-2.png" });

    // Orbit again
    await page.mouse.move(cx + 200, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 150, cy - 70, { steps: 8 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(500);

    // Draw third line
    await page.mouse.click(cx, cy - 40);
    await page.waitForTimeout(400);
    await page.mouse.click(cx, cy + 40);
    await page.waitForTimeout(400);
    await page.screenshot({ path: "test-results/SK-17-3d-lines-orbited.png" });
  }
});
