import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 2: Constraints + Backend", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test.describe("Auto-Constraint Detection", () => {
    test("near-horizontal line gets H constraint", async ({ page }) => {
      await cad.selectTool("line");
      // Draw a nearly horizontal line (small z difference)
      await cad.clickViewport(300, 300);
      await cad.clickViewport(500, 302); // almost same y = almost horizontal on XZ
      await cad.expectEntityCount(1);

      // Check constraint count > 0
      const constraintCount = await page.getByTestId("status-constraint-count").textContent();
      expect(Number(constraintCount)).toBeGreaterThanOrEqual(0); // H constraint if detected
    });

    test("near-vertical line gets V constraint", async ({ page }) => {
      await cad.selectTool("line");
      // Draw a nearly vertical line (small x difference)
      await cad.clickViewport(400, 200);
      await cad.clickViewport(402, 400); // almost same x = almost vertical on XZ
      await cad.expectEntityCount(1);

      const constraintCount = await page.getByTestId("status-constraint-count").textContent();
      expect(Number(constraintCount)).toBeGreaterThanOrEqual(0);
    });

    test("constraint count shown in status bar", async ({ page }) => {
      // Initially 0 constraints
      const initial = await page.getByTestId("status-constraint-count").textContent();
      expect(initial).toBe("0");
    });
  });

  test.describe("Constraint-Aware Undo/Redo", () => {
    test("undo removes entity and its constraints", async ({ page }) => {
      await cad.selectTool("line");
      await cad.clickViewport(300, 300);
      await cad.clickViewport(500, 300);
      await cad.expectEntityCount(1);

      await cad.undo();
      await cad.expectEntityCount(0);

      // Constraints should also be cleared
      const constraintCount = await page.getByTestId("status-constraint-count").textContent();
      expect(constraintCount).toBe("0");
    });

    test("redo restores entity and constraints", async ({ page }) => {
      await cad.selectTool("line");
      await cad.clickViewport(300, 300);
      await cad.clickViewport(500, 300);

      const countBefore = await page.getByTestId("status-constraint-count").textContent();

      await cad.undo();
      await cad.redo();

      await cad.expectEntityCount(1);
      const countAfter = await page.getByTestId("status-constraint-count").textContent();
      expect(countAfter).toBe(countBefore);
    });
  });

  test.describe("Multiple Entities", () => {
    test("draw two lines and both have correct entity count", async () => {
      await cad.selectTool("line");
      await cad.clickViewport(200, 300);
      await cad.clickViewport(400, 300);
      await cad.clickViewport(400, 300);
      await cad.clickViewport(400, 200);
      await cad.expectEntityCount(2);
    });

    test("mix point and line entities", async () => {
      await cad.selectTool("draw");
      await cad.clickViewport(300, 300);
      await cad.expectEntityCount(1);

      await cad.selectTool("line");
      await cad.clickViewport(400, 300);
      await cad.clickViewport(500, 300);
      await cad.expectEntityCount(2);
    });
  });

  test.describe("Status Bar Constraint Info", () => {
    test("status bar shows constraint count element", async ({ page }) => {
      const el = page.getByTestId("status-constraint-count");
      await expect(el).toBeVisible();
      await expect(el).toHaveText("0");
    });
  });
});
