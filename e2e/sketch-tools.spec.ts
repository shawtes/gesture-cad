import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sketch Tools: Slot and Polygon", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test.describe("Slot Tool", () => {
    test("slot tool button exists in toolbar", async () => {
      await cad.expectToolExists("slot");
    });

    test("clicking slot tool activates it", async () => {
      await cad.selectTool("slot");
      await cad.page.waitForTimeout(200);
      await cad.expectActiveTool("Slot");
    });

    test("two clicks create a slot entity", async () => {
      await cad.selectTool("slot");
      await cad.page.waitForTimeout(200);
      await cad.expectEntityCount(0);

      // First click: center of first semicircular end
      await cad.clickViewport(300, 300);
      await cad.page.waitForTimeout(400);
      // Second click: center of second semicircular end
      await cad.clickViewport(500, 300);
      await cad.page.waitForTimeout(400);

      await cad.expectEntityCount(1);
      await cad.screenshot("slot-created");
    });

    test("slot entity increments entity count", async () => {
      await cad.selectTool("slot");
      await cad.page.waitForTimeout(200);

      // Create first slot
      await cad.clickViewport(200, 250);
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(400, 250);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(1);

      // Create second slot
      await cad.selectTool("slot");
      await cad.page.waitForTimeout(200);
      await cad.clickViewport(200, 400);
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(400, 400);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(2);
    });

    test("undo removes slot entity", async () => {
      await cad.selectTool("slot");
      await cad.page.waitForTimeout(200);

      await cad.clickViewport(300, 300);
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(500, 300);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(1);

      await cad.undo();
      await cad.expectEntityCount(0);
      await cad.screenshot("slot-undone");
    });
  });

  test.describe("Polygon Tool", () => {
    test("polygon tool button exists in toolbar", async () => {
      await cad.expectToolExists("polygon");
    });

    test("clicking polygon tool activates it", async () => {
      await cad.selectTool("polygon");
      await cad.page.waitForTimeout(200);
      await cad.expectActiveTool("Polygon");
    });

    test("two clicks create a polygon entity", async () => {
      await cad.selectTool("polygon");
      await cad.page.waitForTimeout(200);
      await cad.expectEntityCount(0);

      // First click: center of polygon
      await cad.clickViewport(400, 300);
      await cad.page.waitForTimeout(400);
      // Second click: edge point defining radius
      await cad.clickViewport(500, 300);
      await cad.page.waitForTimeout(400);

      await cad.expectEntityCount(1);
      await cad.screenshot("polygon-created");
    });

    test("polygon entity increments entity count", async () => {
      await cad.selectTool("polygon");
      await cad.page.waitForTimeout(200);

      // Create first polygon
      await cad.clickViewport(300, 250);
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(400, 250);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(1);

      // Create second polygon
      await cad.selectTool("polygon");
      await cad.page.waitForTimeout(200);
      await cad.clickViewport(300, 400);
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(400, 400);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(2);
    });

    test("keyboard shortcut 'g' activates polygon tool", async ({ page }) => {
      await page.keyboard.press("g");
      await cad.page.waitForTimeout(200);
      await cad.expectActiveTool("Polygon");
    });

    test("undo removes polygon entity", async () => {
      await cad.selectTool("polygon");
      await cad.page.waitForTimeout(200);

      await cad.clickViewport(400, 300);
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(500, 300);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(1);

      await cad.undo();
      await cad.expectEntityCount(0);
      await cad.screenshot("polygon-undone");
    });
  });

  test.describe("All Original Sketch Tools Still Work", () => {
    test("line tool creates entity", async () => {
      await cad.drawLine(300, 300, 500, 300);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(1);
    });

    test("circle tool creates entity", async () => {
      await cad.drawCircle(400, 300, 500, 300);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(1);
    });

    test("rect tool creates entity", async () => {
      await cad.drawRect(300, 250, 500, 400);
      await cad.page.waitForTimeout(400);
      await cad.expectEntityCount(1);
    });

    test("arc tool creates entity", async () => {
      await cad.selectTool("arc");
      await cad.page.waitForTimeout(200);
      await cad.expectActiveTool("Arc");

      // First click: start point
      await cad.clickViewport(300, 300);
      await cad.page.waitForTimeout(400);
      // Second click: end point
      await cad.clickViewport(500, 300);
      await cad.page.waitForTimeout(400);

      await cad.expectEntityCount(1);
    });

    test("spline tool button exists", async () => {
      await cad.expectToolExists("spline");
    });

    test("ellipse tool creates entity", async () => {
      await cad.selectTool("ellipse");
      await cad.page.waitForTimeout(200);
      await cad.expectActiveTool("Ellipse");

      // First click: center
      await cad.clickViewport(400, 300);
      await cad.page.waitForTimeout(400);
      // Second click: edge point
      await cad.clickViewport(500, 350);
      await cad.page.waitForTimeout(400);

      await cad.expectEntityCount(1);
    });

    test("slot and polygon visible in Sketcher workbench", async () => {
      await cad.switchWorkbench("Sketcher");
      await cad.expectToolExists("slot");
      await cad.expectToolExists("polygon");
      await cad.screenshot("sketcher-workbench-tools");
    });
  });
});
