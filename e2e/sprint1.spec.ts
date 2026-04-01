import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 1: Core Interactive Loop", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test.describe("Toolbar Tool Selection", () => {
    test("clicking Select tool highlights it and updates status", async () => {
      await cad.selectTool("select");
      await cad.expectActiveTool("Select");
    });

    test("clicking Point tool highlights it and updates status", async () => {
      await cad.selectTool("draw");
      await cad.expectActiveTool("Point");
    });

    test("clicking Line tool highlights it and updates status", async () => {
      await cad.selectTool("line");
      await cad.expectActiveTool("Line");
    });

    test("clicking Circle tool highlights it and updates status", async () => {
      await cad.selectTool("circle");
      await cad.expectActiveTool("Circle");
    });

    test("clicking Rect tool highlights it and updates status", async () => {
      await cad.selectTool("rect");
      await cad.expectActiveTool("Rectangle");
    });

    test("clicking Pan tool highlights it and updates status", async () => {
      await cad.selectTool("pan");
      await cad.expectActiveTool("Pan");
    });

    test("active tool button has highlighted style", async () => {
      await cad.selectTool("line");
      const btn = cad.toolButton("line");
      await expect(btn).toHaveCSS("border-color", "rgb(59, 130, 246)"); // #3b82f6
    });
  });

  test.describe("Point Placement", () => {
    test("clicking viewport with point tool creates entity", async () => {
      await cad.selectTool("draw");
      await cad.expectEntityCount(0);

      // Click somewhere in the viewport
      await cad.clickViewport(400, 300);
      await cad.expectEntityCount(1);
    });

    test("multiple clicks create multiple points", async () => {
      await cad.selectTool("draw");
      await cad.clickViewport(300, 250);
      await cad.clickViewport(500, 350);
      await cad.clickViewport(400, 200);
      await cad.expectEntityCount(3);
    });
  });

  test.describe("Line Drawing", () => {
    test("two clicks with line tool creates a line entity", async () => {
      await cad.selectTool("line");
      await cad.clickViewport(300, 300);
      await cad.clickViewport(500, 300);
      await cad.expectEntityCount(1);
    });
  });

  test.describe("Circle Drawing", () => {
    test("two clicks with circle tool creates a circle entity", async () => {
      await cad.selectTool("circle");
      // First click: center
      await cad.clickViewport(400, 300);
      // Second click: radius point
      await cad.clickViewport(500, 300);
      await cad.expectEntityCount(1);
    });
  });

  test.describe("Rectangle Drawing", () => {
    test("two clicks with rect tool creates a rectangle entity", async () => {
      await cad.selectTool("rect");
      await cad.clickViewport(300, 250);
      await cad.clickViewport(500, 400);
      await cad.expectEntityCount(1);
    });
  });

  test.describe("Undo / Redo", () => {
    test("undo removes last entity", async () => {
      await cad.selectTool("draw");
      await cad.clickViewport(400, 300);
      await cad.expectEntityCount(1);

      await cad.undo();
      await cad.expectEntityCount(0);
    });

    test("redo restores undone entity", async () => {
      await cad.selectTool("draw");
      await cad.clickViewport(400, 300);
      await cad.undo();
      await cad.expectEntityCount(0);

      await cad.redo();
      await cad.expectEntityCount(1);
    });

    test("keyboard Ctrl+Z undoes", async ({ page }) => {
      await cad.selectTool("draw");
      await cad.clickViewport(400, 300);
      await cad.expectEntityCount(1);

      await page.keyboard.press("Control+z");
      await cad.expectEntityCount(0);
    });

    test("keyboard Ctrl+Y redoes", async ({ page }) => {
      await cad.selectTool("draw");
      await cad.clickViewport(400, 300);
      await page.keyboard.press("Control+z");
      await page.keyboard.press("Control+y");
      await cad.expectEntityCount(1);
    });
  });

  test.describe("Status Bar", () => {
    test("shows entity count", async () => {
      await cad.expectEntityCount(0);
      await cad.selectTool("draw");
      await cad.clickViewport(400, 300);
      await cad.expectEntityCount(1);
    });

    test("shows active tool name", async () => {
      await cad.selectTool("line");
      await cad.expectActiveTool("Line");
      await cad.selectTool("circle");
      await cad.expectActiveTool("Circle");
    });
  });

  test.describe("Escape Key", () => {
    test("pressing Escape resets to Select tool", async ({ page }) => {
      await cad.selectTool("line");
      await cad.expectActiveTool("Line");
      await page.keyboard.press("Escape");
      await cad.expectActiveTool("Select");
    });
  });
});
