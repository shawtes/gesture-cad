import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 9: Pattern Features", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("mirror button exists in toolbar", async ({ page }) => {
    await expect(page.getByTestId("tool-mirror")).toBeVisible();
  });

  test("mirror tool activates", async () => {
    await cad.selectTool("mirror");
    await cad.expectActiveTool("Mirror");
  });
});

test.describe("Sprint 10: Advanced 3D", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("sweep button exists in toolbar", async ({ page }) => {
    await expect(page.getByTestId("tool-sweep")).toBeVisible();
  });

  test("sweep tool activates", async () => {
    await cad.selectTool("sweep");
    await cad.expectActiveTool("Sweep");
  });

  test("all tools are accessible from toolbar", async ({ page }) => {
    // Verify complete toolbar has all expected tools
    const toolIds = [
      "select", "draw", "line", "circle", "rect", "arc", "spline",
      "extrude", "union", "subtract", "fillet", "chamfer", "mirror", "sweep", "pan",
    ];
    for (const id of toolIds) {
      await expect(page.getByTestId(`tool-${id}`)).toBeVisible();
    }
  });

  test("total tool count in toolbar", async ({ page }) => {
    const buttons = page.locator('[data-testid^="tool-"]');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(15);
  });
});
