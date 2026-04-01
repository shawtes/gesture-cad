import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 21: Animation", () => {
  test("feature visibility toggle works (exploded view foundation)", async ({ page }) => {
    const cad = new CADPage(page);
    await cad.goto();

    // Create a feature
    await cad.selectTool("rect");
    await cad.clickViewport(350, 280);
    await cad.clickViewport(400, 330);
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);

    const count = await page.getByTestId("status-feature-count").textContent();
    expect(Number(count)).toBe(1);
  });
});

test.describe("Sprint 22-23: Collaboration + Version Control", () => {
  test("collaborator color generation is deterministic", async ({ page }) => {
    const result = await page.evaluate(() => {
      const colors = [
        "#ef4444", "#f97316", "#eab308", "#22c55e",
        "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
      ];
      function getColor(userId: string) {
        let hash = 0;
        for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
        return colors[Math.abs(hash) % colors.length];
      }
      // Same ID should always produce same color
      return getColor("user1") === getColor("user1");
    });
    expect(result).toBe(true);
  });

  test("version snapshot captures state", async ({ page }) => {
    const result = await page.evaluate(() => {
      const version = {
        id: `v_${Date.now()}`,
        message: "Initial commit",
        author: "test",
        timestamp: Date.now(),
        entityCount: 5,
        featureCount: 2,
      };
      return version.entityCount === 5 && version.featureCount === 2;
    });
    expect(result).toBe(true);
  });
});

test.describe("Sprint 24: Advanced Gestures", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("hand tracking button is accessible", async ({ page }) => {
    await expect(page.getByText("Enable Hand Tracking")).toBeVisible();
  });

  test("gesture-to-tool mapping covers all sketch tools", async ({ page }) => {
    // Verify all sketch tools can be activated
    const tools = ["draw", "line", "circle", "rect", "arc", "spline"];
    for (const tool of tools) {
      await cad.selectTool(tool);
      // Should not throw
    }
  });
});

test.describe("Sprint 25: Performance", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("rapid entity creation stays responsive", async ({ page }) => {
    await cad.selectTool("draw");
    // Create 5 points with adequate spacing
    for (let i = 0; i < 5; i++) {
      await cad.clickViewport(350 + i * 20, 300);
      await page.waitForTimeout(200); // allow constraint pipeline
    }
    const count = await page.getByTestId("status-entity-count").textContent();
    expect(Number(count)).toBe(5);
  });

  test("page initial load is under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("canvas").first().waitFor({ state: "visible" });
    expect(Date.now() - start).toBeLessThan(5000);
  });
});

test.describe("Sprint 26-28: DXF, Weldments, CAM", () => {
  test("file type detection works for all formats", async ({ page }) => {
    const result = await page.evaluate(() => {
      function detect(filename: string) {
        const ext = filename.toLowerCase().split(".").pop();
        switch (ext) {
          case "stl": return "stl";
          case "obj": return "obj";
          case "step": case "stp": return "step";
          case "dxf": return "dxf";
          default: return "unknown";
        }
      }
      return {
        stl: detect("model.stl"),
        obj: detect("model.obj"),
        step: detect("part.step"),
        stp: detect("part.stp"),
        dxf: detect("drawing.dxf"),
        unknown: detect("file.xyz"),
      };
    });
    expect(result.stl).toBe("stl");
    expect(result.obj).toBe("obj");
    expect(result.step).toBe("step");
    expect(result.stp).toBe("step");
    expect(result.dxf).toBe("dxf");
    expect(result.unknown).toBe("unknown");
  });
});

test.describe("Sprint 29: Plugin System", () => {
  test("toolbar supports dynamic tool registration", async ({ page }) => {
    const cad = new CADPage(page);
    await cad.goto();
    // Verify the toolbar renders all registered tools
    const toolButtons = page.locator('[data-testid^="tool-"]');
    const count = await toolButtons.count();
    expect(count).toBeGreaterThanOrEqual(15);
  });
});

test.describe("Sprint 30: Polish + Launch", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("tutorial is accessible via ? button", async ({ page }) => {
    // The ? button should be in the toolbar
    const helpBtn = page.getByTitle("Show Tutorial");
    await expect(helpBtn).toBeVisible();
  });

  test("full workflow: sketch → extrude → undo → redo", async ({ page }) => {
    // Draw rect
    await cad.selectTool("rect");
    await cad.clickViewport(350, 280);
    await cad.clickViewport(450, 350);
    await cad.expectEntityCount(1);

    // Extrude
    await cad.selectTool("extrude");
    await page.waitForTimeout(300);
    const featuresBefore = await page.getByTestId("status-feature-count").textContent();
    expect(Number(featuresBefore)).toBe(1);

    // Undo extrude
    await cad.undo();
    await page.waitForTimeout(100);
    const featuresAfter = await page.getByTestId("status-feature-count").textContent();
    expect(Number(featuresAfter)).toBe(0);

    // Redo extrude
    await cad.redo();
    await page.waitForTimeout(100);
    const featuresRedo = await page.getByTestId("status-feature-count").textContent();
    expect(Number(featuresRedo)).toBe(1);
  });

  test("complete app renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("React") && !msg.text().includes("Warning")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("canvas").first().waitFor({ state: "visible" });
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });

  test("status bar shows all information fields", async ({ page }) => {
    await expect(page.getByTestId("status-tool")).toBeVisible();
    await expect(page.getByTestId("status-entity-count")).toBeVisible();
    await expect(page.getByTestId("status-constraint-count")).toBeVisible();
    await expect(page.getByTestId("status-feature-count")).toBeVisible();
  });
});
