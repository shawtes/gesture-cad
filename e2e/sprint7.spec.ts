import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 7: Boolean Operations", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("union button exists in toolbar", async ({ page }) => {
    await expect(page.getByTestId("tool-union")).toBeVisible();
  });

  test("subtract (cut) button exists in toolbar", async ({ page }) => {
    await expect(page.getByTestId("tool-subtract")).toBeVisible();
  });

  test("union with two features creates a third", async ({ page }) => {
    // Create two rects and extrude both
    await cad.selectTool("rect");
    await cad.clickViewport(350, 280);
    await cad.clickViewport(400, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);

    await cad.selectTool("rect");
    await cad.clickViewport(420, 280);
    await cad.clickViewport(470, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);

    const beforeCount = await page.getByTestId("status-feature-count").textContent();
    expect(Number(beforeCount)).toBe(2);

    // Union
    await cad.selectTool("union");
    await page.waitForTimeout(300);

    const afterCount = await page.getByTestId("status-feature-count").textContent();
    expect(Number(afterCount)).toBe(3);
  });

  test("union without two features does nothing", async ({ page }) => {
    // Only one feature
    await cad.selectTool("rect");
    await cad.clickViewport(350, 280);
    await cad.clickViewport(400, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);

    await cad.selectTool("union");
    await page.waitForTimeout(300);

    const count = await page.getByTestId("status-feature-count").textContent();
    expect(Number(count)).toBe(1);
  });

  test("boolean switches back to select tool", async ({ page }) => {
    await cad.selectTool("rect");
    await cad.clickViewport(350, 280);
    await cad.clickViewport(400, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);
    await cad.selectTool("rect");
    await cad.clickViewport(420, 280);
    await cad.clickViewport(470, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);

    await cad.selectTool("union");
    await page.waitForTimeout(300);
    await cad.expectActiveTool("Select");
  });
});
