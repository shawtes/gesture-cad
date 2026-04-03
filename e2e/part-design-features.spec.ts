import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Part Design Features", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test.describe("Tool Visibility — All 12 Part Design Tools", () => {
    const existingTools = ["extrude", "fillet", "chamfer", "shell", "sweep", "loft"];
    const newTools = ["draft", "hole", "rib", "split", "thicken", "helix"];

    for (const toolId of existingTools) {
      test(`existing tool "${toolId}" is visible`, async () => {
        await cad.expectToolExists(toolId);
      });
    }

    for (const toolId of newTools) {
      test(`new tool "${toolId}" is visible`, async () => {
        await cad.expectToolExists(toolId);
      });
    }

    test("screenshot of all part design tools", async () => {
      await cad.screenshot("part-design-tools-visible");
    });
  });

  test.describe("Draft Tool", () => {
    test("draft tool button exists", async () => {
      await cad.expectToolExists("draft");
    });

    test("clicking draft tool activates it", async () => {
      await cad.selectTool("draft");
      await cad.expectActiveTool("Draft");
    });

    test("draw rect then apply draft increments feature count", async () => {
      await cad.drawRect(300, 250, 500, 400);
      await cad.page.waitForTimeout(400);

      await cad.selectTool("draft");
      await cad.page.waitForTimeout(400);

      await cad.clickViewport(400, 325);
      await cad.page.waitForTimeout(400);

      await cad.expectFeatureCount(1);
      await cad.screenshot("draft-applied");
    });
  });

  test.describe("Hole Tool", () => {
    test("hole tool button exists", async () => {
      await cad.expectToolExists("hole");
    });

    test("keyboard shortcut 'h' activates hole tool", async ({ page }) => {
      await page.keyboard.press("h");
      await page.waitForTimeout(400);
      await cad.expectActiveTool("Hole");
    });

    test("draw rect, extrude, then place hole creates feature", async () => {
      // Draw a rectangle sketch
      await cad.drawRect(300, 250, 500, 400);
      await cad.page.waitForTimeout(400);

      // Extrude the sketch to create a solid body
      await cad.selectTool("extrude");
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(400, 325);
      await cad.page.waitForTimeout(400);

      // Select hole tool and click on a face
      await cad.selectTool("hole");
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(400, 325);
      await cad.page.waitForTimeout(400);

      await cad.expectFeatureCount(2);
      await cad.screenshot("hole-created");
    });
  });

  test.describe("Rib Tool", () => {
    test("rib tool button exists", async () => {
      await cad.expectToolExists("rib");
    });

    test("clicking rib tool activates it", async () => {
      await cad.selectTool("rib");
      await cad.expectActiveTool("Rib");
    });
  });

  test.describe("Split Tool", () => {
    test("split tool button exists", async () => {
      await cad.expectToolExists("split");
    });

    test("clicking split tool activates it", async () => {
      await cad.selectTool("split");
      await cad.expectActiveTool("Split");
    });
  });

  test.describe("Thicken Tool", () => {
    test("thicken tool button exists", async () => {
      await cad.expectToolExists("thicken");
    });

    test("clicking thicken tool activates it", async () => {
      await cad.selectTool("thicken");
      await cad.expectActiveTool("Thicken");
    });
  });

  test.describe("Helix Tool", () => {
    test("helix tool button exists", async () => {
      await cad.expectToolExists("helix");
    });

    test("clicking helix tool activates it", async () => {
      await cad.selectTool("helix");
      await cad.expectActiveTool("Helix");
    });
  });

  test.describe("Curve Pattern", () => {
    test("curve pattern button exists", async () => {
      await cad.expectToolExists("curve_pattern");
    });

    test("linear pattern button still exists", async () => {
      await cad.expectToolExists("linear_pattern");
    });

    test("circular pattern button still exists", async () => {
      await cad.expectToolExists("circular_pattern");
    });

    test("screenshot of pattern tools", async () => {
      await cad.screenshot("pattern-tools-visible");
    });
  });

  test.describe("Extrude Workflow (regression)", () => {
    test("draw rect then extrude creates feature", async () => {
      await cad.drawRect(300, 250, 500, 400);
      await cad.page.waitForTimeout(400);

      await cad.selectTool("extrude");
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(400, 325);
      await cad.page.waitForTimeout(400);

      await cad.expectFeatureCount(1);
      await cad.screenshot("extrude-workflow");
    });

    test("undo removes extruded feature", async () => {
      await cad.drawRect(300, 250, 500, 400);
      await cad.page.waitForTimeout(400);

      await cad.selectTool("extrude");
      await cad.page.waitForTimeout(400);
      await cad.clickViewport(400, 325);
      await cad.page.waitForTimeout(400);

      await cad.expectFeatureCount(1);

      await cad.undo();
      await cad.page.waitForTimeout(400);

      await cad.expectFeatureCount(0);
      await cad.screenshot("extrude-undo");
    });
  });

  test.describe("Fillet / Chamfer / Shell (regression)", () => {
    test("fillet tool exists and activates", async () => {
      await cad.expectToolExists("fillet");
      await cad.selectTool("fillet");
      await cad.expectActiveTool("Fillet");
    });

    test("chamfer tool exists and activates", async () => {
      await cad.expectToolExists("chamfer");
      await cad.selectTool("chamfer");
      await cad.expectActiveTool("Chamfer");
    });

    test("shell tool exists and activates", async () => {
      await cad.expectToolExists("shell");
      await cad.selectTool("shell");
      await cad.expectActiveTool("Shell");
    });

    test("screenshot of fillet chamfer shell tools", async () => {
      await cad.screenshot("fillet-chamfer-shell-tools");
    });
  });

  test.describe("Part Design Workbench Switching", () => {
    test("switch to Part Design workbench shows part tools", async () => {
      await cad.switchWorkbench("Part Design");
      await cad.page.waitForTimeout(400);

      await cad.expectToolExists("extrude");
      await cad.expectToolExists("fillet");
      await cad.expectToolExists("chamfer");
      await cad.expectToolExists("draft");
      await cad.expectToolExists("hole");
      await cad.screenshot("workbench-part-design");
    });

    test("switch to Modeling workbench shows surfacing tools", async () => {
      await cad.switchWorkbench("Modeling");
      await cad.page.waitForTimeout(400);

      await cad.expectToolExists("loft");
      await cad.expectToolExists("sweep");
      await cad.screenshot("workbench-modeling");
    });
  });
});
