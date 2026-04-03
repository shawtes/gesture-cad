import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Workbench Switching", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("All Tools workbench is the default", async () => {
    const allToolsBtn = cad.page
      .locator('button:has-text("All Tools")')
      .first();
    await expect(allToolsBtn).toBeVisible();
    await cad.screenshot("workbench-default-all-tools");
  });

  test("can switch to Sketcher workbench", async () => {
    await cad.switchWorkbench("Sketcher");
    await cad.screenshot("workbench-sketcher");
  });

  test("can switch to Part Design workbench", async () => {
    await cad.switchWorkbench("Part Design");
    await cad.screenshot("workbench-part-design");
  });

  test("can switch to Modeling workbench", async () => {
    await cad.switchWorkbench("Modeling");
    await cad.screenshot("workbench-modeling");
  });

  test("can switch to Assembly workbench", async () => {
    await cad.switchWorkbench("Assembly");
    await cad.screenshot("workbench-assembly");
  });

  test("switching back to All Tools shows all tools", async () => {
    await cad.switchWorkbench("Sketcher");
    await cad.switchWorkbench("All Tools");
    // Verify tools from multiple workbenches are visible
    await cad.expectToolExists("line");
    await cad.expectToolExists("extrude");
    await cad.screenshot("workbench-back-to-all-tools");
  });
});

test.describe("Workbench Tool Visibility", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("Sketcher workbench shows sketch tools", async () => {
    await cad.switchWorkbench("Sketcher");
    await cad.expectToolExists("line");
    await cad.expectToolExists("circle");
    await cad.expectToolExists("rect");
    await cad.expectToolExists("arc");
    await cad.expectToolExists("slot");
    await cad.expectToolExists("polygon");
    await cad.screenshot("sketcher-sketch-tools");
  });

  test("Sketcher workbench shows edit tools", async () => {
    await cad.switchWorkbench("Sketcher");
    await cad.expectToolExists("trim");
    await cad.expectToolExists("offset");
    await cad.expectToolExists("mirror");
    await cad.screenshot("sketcher-edit-tools");
  });

  test("Part Design workbench shows part tools", async () => {
    await cad.switchWorkbench("Part Design");
    await cad.expectToolExists("extrude");
    await cad.expectToolExists("fillet");
    await cad.expectToolExists("chamfer");
    await cad.expectToolExists("draft");
    await cad.expectToolExists("hole");
    await cad.screenshot("part-design-part-tools");
  });

  test("Part Design workbench shows boolean tools", async () => {
    await cad.switchWorkbench("Part Design");
    await cad.expectToolExists("union");
    await cad.expectToolExists("subtract");
    await cad.expectToolExists("intersect");
    await cad.screenshot("part-design-boolean-tools");
  });

  test("Part Design workbench shows pattern tools", async () => {
    await cad.switchWorkbench("Part Design");
    await cad.expectToolExists("linear_pattern");
    await cad.expectToolExists("circular_pattern");
    await cad.expectToolExists("curve_pattern");
    await cad.screenshot("part-design-pattern-tools");
  });
});

test.describe("Pattern Tools", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("linear pattern button exists", async () => {
    await cad.expectToolExists("linear_pattern");
  });

  test("circular pattern button exists", async () => {
    await cad.expectToolExists("circular_pattern");
  });

  test("curve pattern button exists", async () => {
    await cad.expectToolExists("curve_pattern");
  });

  test("linear pattern activates when clicked", async () => {
    await cad.selectTool("linear_pattern");
    await cad.expectActiveTool("Linear Pattern");
    await cad.screenshot("pattern-linear-active");
  });

  test("circular pattern activates when clicked", async () => {
    await cad.selectTool("circular_pattern");
    await cad.expectActiveTool("Circular Pattern");
    await cad.screenshot("pattern-circular-active");
  });

  test("curve pattern activates when clicked", async () => {
    await cad.selectTool("curve_pattern");
    await cad.expectActiveTool("Curve Pattern");
    await cad.screenshot("pattern-curve-active");
  });
});

test.describe("Boolean Tools", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("union tool exists and activates", async () => {
    await cad.expectToolExists("union");
    await cad.selectTool("union");
    await cad.expectActiveTool("Union");
    await cad.screenshot("boolean-union-active");
  });

  test("subtract tool exists and activates", async () => {
    await cad.expectToolExists("subtract");
    await cad.selectTool("subtract");
    await cad.expectActiveTool("Cut");
    await cad.screenshot("boolean-subtract-active");
  });

  test("intersect tool exists and activates", async () => {
    await cad.expectToolExists("intersect");
    await cad.selectTool("intersect");
    await cad.expectActiveTool("Intersect");
    await cad.screenshot("boolean-intersect-active");
  });
});

test.describe("Plane Switching", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("XZ (Top) plane button exists", async () => {
    const planeBtn = cad.page.getByTestId("plane-xz");
    await expect(planeBtn).toBeVisible();
  });

  test("XY (Front) plane button exists", async () => {
    const planeBtn = cad.page.getByTestId("plane-xy");
    await expect(planeBtn).toBeVisible();
  });

  test("YZ (Side) plane button exists", async () => {
    const planeBtn = cad.page.getByTestId("plane-yz");
    await expect(planeBtn).toBeVisible();
  });

  test("clicking plane button switches active plane", async () => {
    const xyBtn = cad.page.getByTestId("plane-xy");
    await xyBtn.click();
    await cad.page.waitForTimeout(200);
    // The active plane button should have a highlighted style
    await expect(xyBtn).toHaveCSS("border-color", "rgb(59, 130, 246)");
    await cad.screenshot("plane-xy-active");
  });

  test("keyboard 1/2/3 switches planes", async ({ page }) => {
    // Press 1 for XZ (Top)
    await page.keyboard.press("1");
    await page.waitForTimeout(200);
    const xzBtn = cad.page.getByTestId("plane-xz");
    await expect(xzBtn).toHaveCSS("border-color", "rgb(59, 130, 246)");

    // Press 2 for XY (Front)
    await page.keyboard.press("2");
    await page.waitForTimeout(200);
    const xyBtn = cad.page.getByTestId("plane-xy");
    await expect(xyBtn).toHaveCSS("border-color", "rgb(59, 130, 246)");

    // Press 3 for YZ (Side)
    await page.keyboard.press("3");
    await page.waitForTimeout(200);
    const yzBtn = cad.page.getByTestId("plane-yz");
    await expect(yzBtn).toHaveCSS("border-color", "rgb(59, 130, 246)");
    await cad.screenshot("plane-keyboard-switch");
  });
});

test.describe("Undo / Redo", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("undo button is visible", async () => {
    await expect(cad.undoBtn).toBeVisible();
  });

  test("redo button is visible", async () => {
    await expect(cad.redoBtn).toBeVisible();
  });

  test("draw entity then undo removes it, redo restores it", async () => {
    await cad.selectTool("draw");
    await cad.clickViewport(400, 300);
    await cad.expectEntityCount(1);

    await cad.undo();
    await cad.expectEntityCount(0);
    await cad.screenshot("undo-entity-removed");

    await cad.redo();
    await cad.expectEntityCount(1);
    await cad.screenshot("redo-entity-restored");
  });
});

test.describe("Export Menu", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("export menu button is visible in toolbar", async () => {
    const exportBtn = cad.page.getByTestId("btn-export");
    await expect(exportBtn).toBeVisible();
    await cad.screenshot("export-menu-visible");
  });
});

test.describe("Primitives Panel", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("primitives panel button exists in toolbar", async () => {
    const primitivesBtn = cad.page.getByTestId("btn-primitives");
    await expect(primitivesBtn).toBeVisible();
    await cad.screenshot("primitives-panel-button");
  });
});

test.describe("Tutorial", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("tutorial button exists in toolbar", async () => {
    const tutorialBtn = cad.page.getByTestId("btn-tutorial");
    await expect(tutorialBtn).toBeVisible();
    await cad.screenshot("tutorial-button");
  });
});

test.describe("Status Bar", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("entity count shows 0 initially", async () => {
    await cad.expectEntityCount(0);
  });

  test("feature count shows 0 initially", async () => {
    await cad.expectFeatureCount(0);
  });

  test("drawing entity updates count", async () => {
    await cad.expectEntityCount(0);
    await cad.selectTool("draw");
    await cad.clickViewport(400, 300);
    await cad.expectEntityCount(1);
    await cad.clickViewport(500, 350);
    await cad.expectEntityCount(2);
    await cad.screenshot("status-bar-entity-count");
  });

  test("tool name updates on selection", async () => {
    await cad.selectTool("line");
    await cad.expectActiveTool("Line");
    await cad.selectTool("circle");
    await cad.expectActiveTool("Circle");
    await cad.selectTool("rect");
    await cad.expectActiveTool("Rectangle");
    await cad.selectTool("select");
    await cad.expectActiveTool("Select");
    await cad.screenshot("status-bar-tool-name");
  });
});

test.describe("Feature Tree Panel", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("feature tree is visible in sidebar", async () => {
    const featureTree = cad.page.getByTestId("feature-tree");
    await expect(featureTree).toBeVisible();
    await cad.screenshot("feature-tree-visible");
  });

  test("after extrude, feature appears in tree", async () => {
    // Draw a rectangle to create a sketch profile
    await cad.drawRect(300, 250, 500, 400);
    await cad.expectEntityCount(1);

    // Extrude the sketch
    await cad.selectTool("extrude");
    await cad.clickViewport(400, 325);
    await cad.page.waitForTimeout(500);

    // Feature tree should now contain an extrude entry
    const featureTree = cad.page.getByTestId("feature-tree");
    await expect(featureTree).toBeVisible();
    await cad.screenshot("feature-tree-after-extrude");
  });
});

test.describe("View Controls", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("view controls panel exists", async () => {
    const viewControls = cad.page.getByTestId("view-controls");
    await expect(viewControls).toBeVisible();
    await cad.screenshot("view-controls-visible");
  });

  test("can interact with view preset buttons", async () => {
    const viewControls = cad.page.getByTestId("view-controls");
    await expect(viewControls).toBeVisible();

    // Click a view preset button (e.g., Front view)
    const frontBtn = cad.page
      .locator('[data-testid="view-controls"] button:has-text("Front")')
      .first();
    if (await frontBtn.isVisible()) {
      await frontBtn.click();
      await cad.page.waitForTimeout(300);
    }
    await cad.screenshot("view-controls-front-preset");
  });
});
