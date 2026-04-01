import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 4: Advanced Sketch Tools", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test.describe("Arc Tool", () => {
    test("arc button exists in toolbar", async ({ page }) => {
      await expect(page.getByTestId("tool-arc")).toBeVisible();
    });

    test("arc tool activates from toolbar", async () => {
      await cad.selectTool("arc");
      await cad.expectActiveTool("Arc");
    });

    test("three clicks with arc tool creates an arc entity", async () => {
      await cad.selectTool("arc");
      // Click 1: start
      await cad.clickViewport(350, 300);
      // Click 2: midpoint
      await cad.clickViewport(450, 250);
      // Click 3: end
      await cad.clickViewport(550, 300);
      await cad.expectEntityCount(1);
    });
  });

  test.describe("Spline Tool", () => {
    test("spline button exists in toolbar", async ({ page }) => {
      await expect(page.getByTestId("tool-spline")).toBeVisible();
    });

    test("spline tool activates from toolbar", async () => {
      await cad.selectTool("spline");
      await cad.expectActiveTool("Spline");
    });

    test("clicking multiple points then double-click creates spline", async ({ page }) => {
      await cad.selectTool("spline");
      // Place control points
      await cad.clickViewport(350, 300);
      await page.waitForTimeout(100);
      await cad.clickViewport(400, 250);
      await page.waitForTimeout(100);
      await cad.clickViewport(450, 350);
      await page.waitForTimeout(100);
      await cad.clickViewport(500, 280);
      await page.waitForTimeout(100);
      // Double-click (close to last point) to finish
      await cad.clickViewport(500, 280);
      await page.waitForTimeout(200);

      await cad.expectEntityCount(1);
    });
  });

  test.describe("Tool Switching", () => {
    test("can switch between all sketch tools", async () => {
      await cad.selectTool("draw");
      await cad.expectActiveTool("Point");

      await cad.selectTool("line");
      await cad.expectActiveTool("Line");

      await cad.selectTool("circle");
      await cad.expectActiveTool("Circle");

      await cad.selectTool("rect");
      await cad.expectActiveTool("Rectangle");

      await cad.selectTool("arc");
      await cad.expectActiveTool("Arc");

      await cad.selectTool("spline");
      await cad.expectActiveTool("Spline");
    });

    test("escape from any tool returns to select", async ({ page }) => {
      await cad.selectTool("arc");
      await page.keyboard.press("Escape");
      await cad.expectActiveTool("Select");

      await cad.selectTool("spline");
      await page.keyboard.press("Escape");
      await cad.expectActiveTool("Select");
    });
  });

  test.describe("Mixed Entity Types", () => {
    test("draw line, arc, and point — all count correctly", async () => {
      await cad.selectTool("draw");
      await cad.clickViewport(350, 300);
      await cad.expectEntityCount(1);

      await cad.selectTool("line");
      await cad.clickViewport(400, 300);
      await cad.clickViewport(500, 300);
      await cad.expectEntityCount(2);

      await cad.selectTool("arc");
      await cad.clickViewport(350, 250);
      await cad.clickViewport(400, 200);
      await cad.clickViewport(450, 250);
      await cad.expectEntityCount(3);
    });
  });
});
