import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 3: 3D Operations Foundation", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test.describe("Extrude Tool", () => {
    test("extrude button exists in toolbar", async ({ page }) => {
      const extrudeBtn = page.getByTestId("tool-extrude");
      await expect(extrudeBtn).toBeVisible();
    });

    test("clicking extrude with a rect creates a feature", async ({ page }) => {
      // First draw a rectangle
      await cad.selectTool("rect");
      await cad.clickViewport(350, 280);
      await cad.clickViewport(450, 350);
      await cad.expectEntityCount(1);

      // Now click extrude
      await cad.selectTool("extrude");
      await page.waitForTimeout(300);

      // Feature should be created
      const featureCount = await page.getByTestId("status-feature-count").textContent();
      expect(Number(featureCount)).toBe(1);
    });

    test("extrude auto-switches back to select tool", async ({ page }) => {
      await cad.selectTool("rect");
      await cad.clickViewport(350, 280);
      await cad.clickViewport(450, 350);

      await cad.selectTool("extrude");
      await page.waitForTimeout(300);

      // Should switch back to select
      await cad.expectActiveTool("Select");
    });

    test("extrude without rect does nothing", async ({ page }) => {
      // No entities drawn
      await cad.selectTool("extrude");
      await page.waitForTimeout(300);

      const featureCount = await page.getByTestId("status-feature-count").textContent();
      expect(Number(featureCount)).toBe(0);
    });
  });

  test.describe("Feature Tree Panel", () => {
    test("feature tree panel is visible", async ({ page }) => {
      const tree = page.getByTestId("feature-tree");
      await expect(tree).toBeVisible();
    });

    test("feature tree shows sketch node when entities exist", async ({ page }) => {
      await cad.selectTool("draw");
      await cad.clickViewport(400, 300);

      // Should show "Sketch 1" in feature tree
      await expect(page.getByText("Sketch 1")).toBeVisible();
    });

    test("feature tree shows extrude node after extrude", async ({ page }) => {
      await cad.selectTool("rect");
      await cad.clickViewport(350, 280);
      await cad.clickViewport(450, 350);

      await cad.selectTool("extrude");
      await page.waitForTimeout(300);

      // Feature tree should show the extrude feature
      const featureCount = await page.getByTestId("status-feature-count").textContent();
      expect(Number(featureCount)).toBe(1);

      // The feature tree panel should contain "Extrude" text
      const tree = page.getByTestId("feature-tree");
      await expect(tree.getByText(/Extrude/)).toBeVisible();
    });
  });

  test.describe("Status Bar Features", () => {
    test("status bar shows feature count", async ({ page }) => {
      const el = page.getByTestId("status-feature-count");
      await expect(el).toBeVisible();
      await expect(el).toHaveText("0");
    });

    test("feature count updates after extrude", async ({ page }) => {
      await cad.selectTool("rect");
      await cad.clickViewport(350, 280);
      await cad.clickViewport(450, 350);

      await cad.selectTool("extrude");
      await page.waitForTimeout(300);

      const count = await page.getByTestId("status-feature-count").textContent();
      expect(Number(count)).toBe(1);
    });
  });

  test.describe("Undo/Redo with Features", () => {
    test("undo removes feature", async ({ page }) => {
      await cad.selectTool("rect");
      await cad.clickViewport(350, 280);
      await cad.clickViewport(450, 350);

      await cad.selectTool("extrude");
      await page.waitForTimeout(300);

      const before = await page.getByTestId("status-feature-count").textContent();
      expect(Number(before)).toBe(1);

      await cad.undo();
      await page.waitForTimeout(100);

      const after = await page.getByTestId("status-feature-count").textContent();
      expect(Number(after)).toBe(0);
    });
  });
});
