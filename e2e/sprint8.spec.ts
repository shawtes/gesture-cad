import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 8: Fillet, Chamfer, Shell", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("fillet button exists in toolbar", async ({ page }) => {
    await expect(page.getByTestId("tool-fillet")).toBeVisible();
  });

  test("chamfer button exists in toolbar", async ({ page }) => {
    await expect(page.getByTestId("tool-chamfer")).toBeVisible();
  });

  test("fillet tool activates and shows in status bar", async () => {
    await cad.selectTool("fillet");
    await cad.expectActiveTool("Fillet");
  });

  test("chamfer tool activates and shows in status bar", async () => {
    await cad.selectTool("chamfer");
    await cad.expectActiveTool("Chamfer");
  });

  test("escape from fillet returns to select", async ({ page }) => {
    await cad.selectTool("fillet");
    await page.keyboard.press("Escape");
    await cad.expectActiveTool("Select");
  });
});
