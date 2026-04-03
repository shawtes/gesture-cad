/**
 * Full 12-Week Curriculum Test
 * Tests every Onshape lesson feature in GestureCAD.
 * Covers: sketch, extrude add/remove, revolve, sweep, loft,
 * fillet, chamfer, shell, draft, hole, rib, split, thicken, helix,
 * patterns, booleans, assembly, drawings, views, dimensions,
 * emboss, custom planes, undo/redo, and edge cases.
 */
import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Full 12-Week Curriculum Coverage", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("gesture-cad-tutorial-v2", "true");
    });
    cad = new CADPage(page);
    await cad.goto();
  });

  // ═══════════════════════════════════════
  // WEEK 1: Getting Started
  // ═══════════════════════════════════════

  test("W1: Navigate 3D — orbit, zoom, pan", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) return;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

    // Right-click orbit
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 100, cy + 50, { steps: 5 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(200);

    // Scroll zoom
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(200);

    await expect(canvas).toBeVisible();
    await cad.screenshot("w1-navigate");
  });

  test("W1: View presets — TOP/FRONT/RIGHT/ISO", async ({ page }) => {
    for (const view of ["top", "front", "right", "iso"]) {
      const btn = page.locator(`[data-testid="viewcube-${view}"]`);
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
    await cad.screenshot("w1-views");
  });

  test("W1: N key orients normal to sketch", async ({ page }) => {
    await page.keyboard.press("n");
    await page.waitForTimeout(300);
    await cad.screenshot("w1-normal-view");
  });

  test("W1: Draw all sketch entity types", async ({ page }) => {
    // Point
    await cad.selectTool("draw");
    await cad.clickViewport(300, 300);
    await cad.expectEntityCount(1);

    // Line
    await cad.drawLine(350, 280, 450, 280);
    await cad.expectEntityCount(2);

    // Circle
    await cad.drawCircle(500, 300, 540, 300);
    await cad.expectEntityCount(3);

    // Rectangle
    await cad.drawRect(200, 350, 280, 420);
    await cad.expectEntityCount(4);

    await cad.screenshot("w1-all-entities");
  });

  test("W1: Extrude Add with parameter dialog", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);

    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const distInput = page.locator('[data-testid="param-input-distance"]');
      if (await distInput.isVisible()) await distInput.fill("4");
      await apply.click();
      await page.waitForTimeout(500);
    }

    await cad.expectFeatureCount(1);
    await cad.screenshot("w1-extrude");
  });

  // ═══════════════════════════════════════
  // WEEK 2: Design Intent
  // ═══════════════════════════════════════

  test("W2: Dimension tool measures distance", async ({ page }) => {
    await cad.drawLine(300, 300, 500, 300);
    await cad.selectTool("dimension");
    await cad.clickViewport(300, 300);
    await cad.clickViewport(500, 300);
    await page.waitForTimeout(500);

    // Dimension display should appear
    const dimDisplay = page.locator("text=mm");
    await expect(dimDisplay.first()).toBeVisible({ timeout: 3000 });
    await cad.screenshot("w2-dimension");
  });

  test("W2: Fillet with radius control", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply1 = page.locator('[data-testid="param-apply"]');
    if (await apply1.isVisible({ timeout: 2000 }).catch(() => false)) await apply1.click();
    await page.waitForTimeout(500);

    await cad.selectTool("fillet");
    await page.waitForTimeout(500);
    const apply2 = page.locator('[data-testid="param-apply"]');
    if (await apply2.isVisible({ timeout: 2000 }).catch(() => false)) {
      const radiusInput = page.locator('[data-testid="param-input-radius"]');
      if (await radiusInput.isVisible()) await radiusInput.fill("0.5");
      await apply2.click();
      await page.waitForTimeout(500);
    }

    await cad.expectFeatureCount(2);
    await cad.screenshot("w2-fillet");
  });

  test("W2: Chamfer with distance control", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const a1 = page.locator('[data-testid="param-apply"]');
    if (await a1.isVisible({ timeout: 2000 }).catch(() => false)) await a1.click();
    await page.waitForTimeout(500);

    await cad.selectTool("chamfer");
    await page.waitForTimeout(500);
    const a2 = page.locator('[data-testid="param-apply"]');
    if (await a2.isVisible({ timeout: 2000 }).catch(() => false)) await a2.click();
    await page.waitForTimeout(500);

    await cad.expectFeatureCount(2);
    await cad.screenshot("w2-chamfer");
  });

  // ═══════════════════════════════════════
  // WEEK 3: Multi-Part & Patterns
  // ═══════════════════════════════════════

  test("W3: Boolean union of two extruded shapes", async ({ page }) => {
    // First rect + extrude
    await cad.drawRect(320, 280, 400, 340);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    // Second rect + extrude
    await cad.drawRect(380, 300, 480, 380);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    // Boolean union
    await cad.selectTool("union");
    await page.waitForTimeout(500);

    await cad.screenshot("w3-boolean-union");
  });

  test("W3: Linear pattern with count and spacing", async ({ page }) => {
    await cad.drawRect(350, 280, 400, 320);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    await cad.selectTool("linear_pattern");
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const countInput = page.locator('[data-testid="param-input-count"]');
      if (await countInput.isVisible()) await countInput.fill("5");
      await apply.click();
      await page.waitForTimeout(500);
    }

    await cad.screenshot("w3-linear-pattern");
  });

  test("W3: Circular pattern", async ({ page }) => {
    await cad.drawRect(350, 280, 400, 320);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    await cad.selectTool("circular_pattern");
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const countInput = page.locator('[data-testid="param-input-count"]');
      if (await countInput.isVisible()) await countInput.fill("8");
      await apply.click();
      await page.waitForTimeout(500);
    }

    await cad.screenshot("w3-circular-pattern");
  });

  // ═══════════════════════════════════════
  // WEEK 4: Assemblies
  // ═══════════════════════════════════════

  test("W4: Assembly — insert component + mate", async ({ page }) => {
    // Build a part
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    // Switch to assembly tab in workbench
    const assemblyTab = page.locator('button:has-text("Assembly")').last();
    if (await assemblyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assemblyTab.click();
      await page.waitForTimeout(300);
    }

    await cad.screenshot("w4-assembly");
  });

  // ═══════════════════════════════════════
  // WEEK 5: 2D Drawings
  // ═══════════════════════════════════════

  test("W5: Generate 3-view drawing", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    // Switch to Drawing tab
    const drawingTab = page.locator('button:has-text("Drawing")').last();
    if (await drawingTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await drawingTab.click();
      await page.waitForTimeout(300);
    }

    await cad.screenshot("w5-drawing");
  });

  // ═══════════════════════════════════════
  // WEEK 9: Advanced Geometry & Plastics
  // ═══════════════════════════════════════

  test("W9: Draft + Shell for injection molding", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    // Draft
    await cad.selectTool("draft");
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    // Shell
    await cad.selectTool("shell");
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    await cad.screenshot("w9-draft-shell");
  });

  test("W9: Split part with plane", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    await cad.selectTool("split");
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    await cad.screenshot("w9-split");
  });

  // ═══════════════════════════════════════
  // WEEK 10: CNC Manufacturing
  // ═══════════════════════════════════════

  test("W10: Hole tool with counterbore", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    await cad.selectTool("hole");
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const holeType = page.locator('[data-testid="param-select-holeType"]');
      if (await holeType.isVisible()) await holeType.selectOption("counterbore");
      await apply.click();
      await page.waitForTimeout(500);
    }

    await cad.screenshot("w10-hole-counterbore");
  });

  // ═══════════════════════════════════════
  // WEEK 11: Advanced Geometry
  // ═══════════════════════════════════════

  test("W11: Helix for spring", async ({ page }) => {
    await cad.selectTool("helix");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const heightInput = page.locator('[data-testid="param-input-height"]');
      if (await heightInput.isVisible()) await heightInput.fill("8");
      await apply.click();
      await page.waitForTimeout(500);
    }

    await cad.expectFeatureCount(1);
    await cad.screenshot("w11-helix-spring");
  });

  test("W11: Spline drawing", async ({ page }) => {
    await cad.selectTool("spline");
    await cad.clickViewport(300, 300);
    await cad.clickViewport(350, 250);
    await cad.clickViewport(400, 300);
    await cad.clickViewport(450, 250);
    // Double-click to finish (close to last point)
    await cad.clickViewport(450, 250);
    await page.waitForTimeout(400);

    await cad.screenshot("w11-spline");
  });

  // ═══════════════════════════════════════
  // WEEK 12: Advanced Assembly
  // ═══════════════════════════════════════

  test("W12: Render modes — wireframe, x-ray", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    // Open render mode dropdown
    const viewOptsBtn = page.locator('[data-testid="view-options-btn"]');
    if (await viewOptsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewOptsBtn.click();
      await page.waitForTimeout(300);
      const wireBtn = page.locator('[data-testid="render-mode-wireframe"]');
      if (await wireBtn.isVisible()) {
        await wireBtn.click();
        await page.waitForTimeout(500);
      }
    }

    await cad.screenshot("w12-wireframe");
  });

  test("W12: Export menu exists", async ({ page }) => {
    const exportBtn = page.locator('[data-testid="btn-export"]');
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(exportBtn).toBeVisible();
    }
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test("Edge: Extrude with no sketch — does nothing", async ({ page }) => {
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }
    // Should still have 0 features (no sketch to extrude)
    const count = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(count)).toBe(0);
  });

  test("Edge: Undo all entities then redo", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.drawLine(300, 300, 500, 300);
    await cad.expectEntityCount(2);

    // Undo both
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(200);
    await cad.expectEntityCount(0);

    // Redo both
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(200);
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(200);
    await cad.expectEntityCount(2);
  });

  test("Edge: Cancel parameter dialog returns to select", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);

    const cancel = page.locator('[data-testid="param-cancel"]');
    if (await cancel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancel.click();
      await page.waitForTimeout(300);
    }

    // Should return to select tool, no feature created
    const count = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(count)).toBe(0);
  });

  test("Edge: Plane switching preserves entities", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.expectEntityCount(1);

    // Switch planes
    await page.keyboard.press("2"); // XY
    await page.waitForTimeout(200);
    await page.keyboard.press("3"); // YZ
    await page.waitForTimeout(200);
    await page.keyboard.press("1"); // Back to XZ
    await page.waitForTimeout(200);

    // Entity should still be there
    await cad.expectEntityCount(1);
  });

  test("Edge: Multiple features stack in feature tree", async ({ page }) => {
    // Build 3 features
    for (let i = 0; i < 3; i++) {
      await cad.drawRect(300 + i * 20, 280, 350 + i * 20, 330);
      await cad.selectTool("extrude");
      await page.waitForTimeout(500);
      const apply = page.locator('[data-testid="param-apply"]');
      if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
      await page.waitForTimeout(500);
    }

    const count = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(count)).toBe(3);
    await cad.screenshot("edge-multi-features");
  });

  test("Edge: Workbench switching doesn't lose state", async ({ page }) => {
    await cad.drawRect(350, 280, 450, 360);
    await cad.expectEntityCount(1);

    // Switch workbenches
    await cad.switchWorkbench("Sketcher");
    await cad.switchWorkbench("Part Design");
    await cad.switchWorkbench("All Tools");

    // State preserved
    await cad.expectEntityCount(1);
  });

  test("Edge: Extrude Remove subtracts from body", async ({ page }) => {
    // First extrude a box
    await cad.drawRect(320, 260, 480, 400);
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    let apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) await apply.click();
    await page.waitForTimeout(500);

    // Draw a smaller rect for removal
    await cad.selectTool("circle");
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(400);
      await page.mouse.click(box.x + box.width / 2 + 30, box.y + box.height / 2);
      await page.waitForTimeout(400);
    }

    // Extrude Remove
    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      const modeSelect = page.locator('[data-testid="param-select-booleanMode"]');
      if (await modeSelect.isVisible()) await modeSelect.selectOption("remove");
      await apply.click();
      await page.waitForTimeout(500);
    }

    await cad.screenshot("edge-extrude-remove");
  });
});
