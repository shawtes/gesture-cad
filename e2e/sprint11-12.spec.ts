import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 11-12: Assembly", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("feature tree visible for assembly management", async ({ page }) => {
    await expect(page.getByTestId("feature-tree")).toBeVisible();
  });

  test("can create multiple features for assembly", async ({ page }) => {
    // Create two extruded rects (two "components")
    await cad.selectTool("rect");
    await cad.clickViewport(350, 280);
    await cad.clickViewport(400, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);

    await cad.selectTool("rect");
    await cad.clickViewport(450, 280);
    await cad.clickViewport(500, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);

    const count = await page.getByTestId("status-feature-count").textContent();
    expect(Number(count)).toBe(2);
  });

  test("feature tree shows all features", async ({ page }) => {
    await cad.selectTool("rect");
    await cad.clickViewport(350, 280);
    await cad.clickViewport(400, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);

    const tree = page.getByTestId("feature-tree");
    await expect(tree.getByText(/Extrude/)).toBeVisible();
  });
});
