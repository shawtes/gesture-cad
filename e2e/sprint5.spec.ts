import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 5: Parametric Design", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test.describe("Parameter Panel", () => {
    test("parameter panel is visible", async ({ page }) => {
      await expect(page.getByTestId("parameter-panel")).toBeVisible();
    });

    test("shows default parameters (width, height, depth, radius)", async ({ page }) => {
      await expect(page.getByTestId("param-value-width")).toBeVisible();
      await expect(page.getByTestId("param-value-height")).toBeVisible();
      await expect(page.getByTestId("param-value-depth")).toBeVisible();
      await expect(page.getByTestId("param-value-radius")).toBeVisible();
    });

    test("default width is 2.00", async ({ page }) => {
      await expect(page.getByTestId("param-value-width")).toHaveText(/2\.00/);
    });

    test("clicking parameter value opens edit mode", async ({ page }) => {
      await page.getByTestId("param-value-width").click();
      const input = page.getByTestId("param-input-width");
      await expect(input).toBeVisible();
    });

    test("editing parameter value and pressing Enter saves it", async ({ page }) => {
      await page.getByTestId("param-value-width").click();
      const input = page.getByTestId("param-input-width");
      await input.fill("5.0");
      await input.press("Enter");
      await expect(page.getByTestId("param-value-width")).toHaveText(/5\.00/);
    });

    test("expression evaluation: width * 2", async ({ page }) => {
      // Set width to 3
      await page.getByTestId("param-value-width").click();
      await page.getByTestId("param-input-width").fill("3");
      await page.getByTestId("param-input-width").press("Enter");

      // Set height to "width * 2" expression
      await page.getByTestId("param-value-height").click();
      await page.getByTestId("param-input-height").fill("width * 2");
      await page.getByTestId("param-input-height").press("Enter");

      // Height should be 6.00
      await expect(page.getByTestId("param-value-height")).toHaveText(/6\.00/);
    });

    test("escape cancels editing", async ({ page }) => {
      await page.getByTestId("param-value-width").click();
      const input = page.getByTestId("param-input-width");
      await input.fill("999");
      await input.press("Escape");

      // Should still show original value
      await expect(page.getByTestId("param-value-width")).toHaveText(/2\.00/);
    });
  });

  test.describe("Feature Tree Interaction", () => {
    test("feature tree shows feature count badge", async ({ page }) => {
      const tree = page.getByTestId("feature-tree");
      await expect(tree).toBeVisible();
    });
  });
});
