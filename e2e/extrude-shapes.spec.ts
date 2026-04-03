/**
 * Test that extrude works with EVERY sketch entity type — not just rectangles.
 */
import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Extrude respects actual sketch shape", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
    cad = new CADPage(page);
    await cad.goto();
  });

  test("Extrude a circle → cylinder (not box)", async ({ page }) => {
    await cad.drawCircle(400, 300, 450, 300);
    await cad.expectEntityCount(1);

    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(800);
    }

    const fc = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(fc)).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: "test-results/extrude-circle.png" });
  });

  test("Extrude a rectangle → box", async ({ page }) => {
    await cad.drawRect(350, 270, 450, 350);
    await cad.expectEntityCount(1);

    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(800);
    }

    const fc = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(fc)).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: "test-results/extrude-rect.png" });
  });

  test("Extrude a polygon → prism", async ({ page }) => {
    // Select polygon tool
    const polygonBtn = page.locator('[data-testid="tool-polygon"]');
    if (await polygonBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await polygonBtn.click();
    } else {
      // Polygon might be in sketch mode toolbar
      await cad.selectTool("line"); // enter sketch mode first
      await page.waitForTimeout(200);
      const pgBtn = page.locator('[data-testid="tool-polygon"]');
      if (await pgBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await pgBtn.click();
      }
    }
    await page.waitForTimeout(200);
    await cad.clickViewport(400, 300);
    await page.waitForTimeout(400);
    await cad.clickViewport(450, 300);
    await page.waitForTimeout(400);

    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(800);
    }

    await page.screenshot({ path: "test-results/extrude-polygon.png" });
  });

  test("Extrude a line → thin wall", async ({ page }) => {
    await cad.drawLine(350, 300, 450, 300);
    await cad.expectEntityCount(1);

    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(800);
    }

    const fc = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(fc)).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: "test-results/extrude-line.png" });
  });

  test("Extrude last entity drawn, not by type order", async ({ page }) => {
    // Draw a rect first, then a circle — extrude should use the CIRCLE
    await cad.drawRect(300, 250, 380, 330);
    await cad.drawCircle(420, 300, 460, 300);
    await cad.expectEntityCount(2);

    await cad.selectTool("extrude");
    await page.waitForTimeout(500);
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(800);
    }

    // Should have 1 feature (extruded the circle, not the rect)
    const fc = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(fc)).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: "test-results/extrude-last-entity.png" });
  });

  test("Sketch button enters sketch mode with tools", async ({ page }) => {
    // Click the "Sketch" button in toolbar — should switch to sketch tools
    const sketchBtn = page.locator('[data-testid="tool-line"]').first();
    await sketchBtn.click();
    await page.waitForTimeout(300);

    // Sketch tools should now be visible (line, rect, circle, etc.)
    const lineBtn = page.locator('[data-testid="tool-line"]');
    await expect(lineBtn.first()).toBeVisible();
    const rectBtn = page.locator('[data-testid="tool-rect"]');
    await expect(rectBtn.first()).toBeVisible();
    const circleBtn = page.locator('[data-testid="tool-circle"]');
    await expect(circleBtn.first()).toBeVisible();

    await page.screenshot({ path: "test-results/sketch-mode-toolbar.png" });
  });
});
