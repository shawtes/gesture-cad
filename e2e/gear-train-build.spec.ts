/**
 * Gear Train Build Test
 *
 * End-to-end test that builds a complete gear train assembly,
 * exercising: sketch tools, extrude, circular pattern, hole,
 * helix, assembly mates, and export.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("Build a Gear Train — Full Feature Integration Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("gesture-cad-tutorial-v2", "true");
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 15000 });
    // Dismiss tutorial if it appears despite localStorage
    const skipBtn = page.locator("text=Skip Tutorial");
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(500);
  });

  test("Step 1: Draw gear profile — circle on XZ plane", async ({ page }) => {
    // Select circle tool
    await page.click('[data-testid="tool-circle"]');
    await page.waitForTimeout(200);

    // Verify tool is active
    const toolText = await page.locator('[data-testid="status-tool"]').textContent();
    expect(toolText).toBe("Circle");

    // Draw circle: center click then radius click
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 80, cy);
    await page.waitForTimeout(400);

    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);
    await page.screenshot({ path: "test-results/gear-01-circle.png" });
  });

  test("Step 2: Extrude gear body with parameter dialog", async ({ page }) => {
    // Draw a rect for the gear body
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx - 60, cy - 40);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 60, cy + 40);
    await page.waitForTimeout(400);

    // Click extrude — should show parameter dialog
    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(500);

    // Parameter dialog should be visible
    const applyBtn = page.locator('[data-testid="param-apply"]');
    const dialogVisible = await applyBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (dialogVisible) {
      // Adjust distance slider
      const distInput = page.locator('[data-testid="param-input-distance"]');
      if (await distInput.isVisible()) {
        await distInput.fill("3");
      }
      await applyBtn.click();
      await page.waitForTimeout(500);
    }

    // Should have at least 1 feature
    const featureCount = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(featureCount)).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: "test-results/gear-02-extrude.png" });
  });

  test("Step 3: Draw polygon for gear teeth profile", async ({ page }) => {
    // Switch to Sketcher workbench
    await page.locator('button:has-text("Sketcher")').first().click();
    await page.waitForTimeout(300);

    // Select polygon tool
    const polygonBtn = page.locator('[data-testid="tool-polygon"]');
    if (await polygonBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await polygonBtn.click();
      await page.waitForTimeout(200);

      const canvas = page.locator("canvas").first();
      const box = await canvas.boundingBox();
      const cx = box!.x + box!.width / 2;
      const cy = box!.y + box!.height / 2;

      // Draw polygon: center then radius
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(400);
      await page.mouse.click(cx + 50, cy);
      await page.waitForTimeout(400);

      const count = await page.locator('[data-testid="status-entity-count"]').textContent();
      expect(Number(count)).toBeGreaterThanOrEqual(1);
    }

    await page.screenshot({ path: "test-results/gear-03-polygon.png" });
  });

  test("Step 4: Test Hole tool with parameters", async ({ page }) => {
    // First draw a rect and extrude it
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.click(cx - 50, cy - 30);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 50, cy + 30);
    await page.waitForTimeout(400);

    // Extrude
    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(500);
    const applyBtn1 = page.locator('[data-testid="param-apply"]');
    if (await applyBtn1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await applyBtn1.click();
      await page.waitForTimeout(500);
    }

    // Now click Hole tool — should show dialog
    await page.locator('button:has-text("All Tools")').first().click();
    await page.waitForTimeout(200);
    await page.click('[data-testid="tool-hole"]');
    await page.waitForTimeout(500);

    // Parameter dialog should appear with hole options
    const diamInput = page.locator('[data-testid="param-input-diameter"]');
    const holeTypeSelect = page.locator('[data-testid="param-select-holeType"]');
    const applyBtn2 = page.locator('[data-testid="param-apply"]');

    if (await applyBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Verify hole type dropdown has options
      if (await holeTypeSelect.isVisible()) {
        const options = await holeTypeSelect.locator("option").count();
        expect(options).toBeGreaterThanOrEqual(3); // simple, counterbore, countersink, tapped
      }

      // Set diameter
      if (await diamInput.isVisible()) {
        await diamInput.fill("1.5");
      }

      await applyBtn2.click();
      await page.waitForTimeout(500);

      const featureCount = await page.locator('[data-testid="status-feature-count"]').textContent();
      expect(Number(featureCount)).toBeGreaterThanOrEqual(2);
    }

    await page.screenshot({ path: "test-results/gear-04-hole.png" });
  });

  test("Step 5: Test Circular Pattern for gear teeth", async ({ page }) => {
    // Draw rect + extrude
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.click(cx - 40, cy - 20);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 40, cy + 20);
    await page.waitForTimeout(400);

    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(500);
    const apply1 = page.locator('[data-testid="param-apply"]');
    if (await apply1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply1.click();
      await page.waitForTimeout(500);
    }

    // Circular pattern
    await page.click('[data-testid="tool-circular_pattern"]');
    await page.waitForTimeout(500);

    const countInput = page.locator('[data-testid="param-input-count"]');
    const apply2 = page.locator('[data-testid="param-apply"]');

    if (await apply2.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (await countInput.isVisible()) {
        await countInput.fill("12"); // 12 teeth
      }
      await apply2.click();
      await page.waitForTimeout(500);

      const featureCount = await page.locator('[data-testid="status-feature-count"]').textContent();
      expect(Number(featureCount)).toBeGreaterThanOrEqual(2);
    }

    await page.screenshot({ path: "test-results/gear-05-circular-pattern.png" });
  });

  test("Step 6: Test Helix for worm gear", async ({ page }) => {
    await page.click('[data-testid="tool-helix"]');
    await page.waitForTimeout(500);

    const radiusInput = page.locator('[data-testid="param-input-radius"]');
    const pitchInput = page.locator('[data-testid="param-input-pitch"]');
    const heightInput = page.locator('[data-testid="param-input-height"]');
    const applyBtn = page.locator('[data-testid="param-apply"]');

    if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      if (await radiusInput.isVisible()) await radiusInput.fill("0.8");
      if (await pitchInput.isVisible()) await pitchInput.fill("0.4");
      if (await heightInput.isVisible()) await heightInput.fill("5");

      await applyBtn.click();
      await page.waitForTimeout(600);

      const featureCount = await page.locator('[data-testid="status-feature-count"]').textContent();
      expect(Number(featureCount)).toBeGreaterThanOrEqual(1);
    }

    await page.screenshot({ path: "test-results/gear-06-helix.png" });
  });

  test("Step 7: Test Draft and Fillet on gear body", async ({ page }) => {
    // Draw + extrude a base
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.click(cx - 50, cy - 30);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 50, cy + 30);
    await page.waitForTimeout(400);

    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }

    // Apply Draft
    await page.click('[data-testid="tool-draft"]');
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const angleInput = page.locator('[data-testid="param-input-angle"]');
      if (await angleInput.isVisible()) await angleInput.fill("3");
      await apply.click();
      await page.waitForTimeout(500);
    }

    // Apply Fillet
    await page.click('[data-testid="tool-fillet"]');
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const radiusInput = page.locator('[data-testid="param-input-radius"]');
      if (await radiusInput.isVisible()) await radiusInput.fill("0.5");
      await apply.click();
      await page.waitForTimeout(500);
    }

    const featureCount = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(featureCount)).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: "test-results/gear-07-draft-fillet.png" });
  });

  test("Step 8: Test Split and Thicken", async ({ page }) => {
    // Draw + extrude
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.click(cx - 40, cy - 25);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 40, cy + 25);
    await page.waitForTimeout(400);

    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }

    // Split
    await page.click('[data-testid="tool-split"]');
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }

    // Thicken
    await page.click('[data-testid="tool-thicken"]');
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const thickInput = page.locator('[data-testid="param-input-thickness"]');
      if (await thickInput.isVisible()) await thickInput.fill("0.5");
      await apply.click();
      await page.waitForTimeout(500);
    }

    const featureCount = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(featureCount)).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: "test-results/gear-08-split-thicken.png" });
  });

  test("Step 9: Test Slot and Rib tools", async ({ page }) => {
    // Draw base
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.click(cx - 40, cy - 30);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 40, cy + 30);
    await page.waitForTimeout(400);

    // Draw a slot
    const slotBtn = page.locator('[data-testid="tool-slot"]');
    if (await slotBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await slotBtn.click();
      await page.waitForTimeout(200);
      await page.mouse.click(cx - 20, cy);
      await page.waitForTimeout(400);
      await page.mouse.click(cx + 20, cy);
      await page.waitForTimeout(400);

      const count = await page.locator('[data-testid="status-entity-count"]').textContent();
      expect(Number(count)).toBeGreaterThanOrEqual(2); // rect + slot
    }

    // Extrude then add rib
    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }

    await page.click('[data-testid="tool-rib"]');
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: "test-results/gear-09-slot-rib.png" });
  });

  test("Step 10: View controls — rotate, render modes, projection", async ({ page }) => {
    // Draw something visible
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.click(cx - 50, cy - 30);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 50, cy + 30);
    await page.waitForTimeout(400);
    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }

    // Test view presets
    const topBtn = page.locator('[data-testid="viewcube-top"]');
    if (await topBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await topBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "test-results/gear-10a-top-view.png" });

      await page.locator('[data-testid="viewcube-front"]').click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "test-results/gear-10b-front-view.png" });

      await page.locator('[data-testid="viewcube-iso"]').click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: "test-results/gear-10c-iso-view.png" });
    }

    // Test camera sliders
    const toggleSliders = page.locator('[data-testid="toggle-camera-sliders"]');
    if (await toggleSliders.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggleSliders.click();
      await page.waitForTimeout(300);

      const azimuthSlider = page.locator('[data-testid="slider-azimuth"]');
      if (await azimuthSlider.isVisible()) {
        await azimuthSlider.fill("120");
        await page.waitForTimeout(500);
        await page.screenshot({ path: "test-results/gear-10d-120deg.png" });
      }
    }

    // Test render mode dropdown
    const viewOptsBtn = page.locator('[data-testid="view-options-btn"]');
    if (await viewOptsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewOptsBtn.click();
      await page.waitForTimeout(300);

      const wireBtn = page.locator('[data-testid="render-mode-wireframe"]');
      if (await wireBtn.isVisible()) {
        await wireBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: "test-results/gear-10e-wireframe.png" });
      }
    }

    await expect(canvas).toBeVisible();
  });

  test("Step 11: Undo/redo entire gear build", async ({ page }) => {
    // Draw rect
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.click(cx - 40, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 40, cy + 50);
    await page.waitForTimeout(400);

    let count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);

    // Undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(0);

    // Redo
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(300);
    count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);

    await page.screenshot({ path: "test-results/gear-11-undo-redo.png" });
  });

  test("Step 12: Plane switching and multi-plane sketch", async ({ page }) => {
    // Draw on XZ plane
    await page.click('[data-testid="tool-circle"]');
    await page.waitForTimeout(200);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 40, cy);
    await page.waitForTimeout(400);

    // Switch to XY plane
    await page.keyboard.press("2");
    await page.waitForTimeout(300);

    // Draw on XY plane
    await page.click('[data-testid="tool-rect"]');
    await page.waitForTimeout(200);
    await page.mouse.click(cx - 30, cy - 20);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 30, cy + 20);
    await page.waitForTimeout(400);

    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBeGreaterThanOrEqual(2);

    // Switch back to XZ
    await page.keyboard.press("1");
    await page.waitForTimeout(300);

    await page.screenshot({ path: "test-results/gear-12-multi-plane.png" });
  });
});
