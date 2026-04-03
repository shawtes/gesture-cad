import { type Page, type Locator, expect } from "@playwright/test";

/** Page Object Model for the GestureCAD main page. */
export class CADPage {
  readonly page: Page;
  readonly toolbar: Locator;
  readonly viewport: Locator;
  readonly statusBar: Locator;
  readonly statusTool: Locator;
  readonly statusEntityCount: Locator;
  readonly undoBtn: Locator;
  readonly redoBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toolbar = page.locator('[data-testid^="tool-"]').first().locator("..");
    this.viewport = page.locator("canvas").first();
    this.statusBar = page.getByTestId("status-bar");
    this.statusTool = page.getByTestId("status-tool");
    this.statusEntityCount = page.getByTestId("status-entity-count");
    this.undoBtn = page.getByTestId("btn-undo");
    this.redoBtn = page.getByTestId("btn-redo");
  }

  async goto() {
    // Dismiss tutorial on test pages by pre-setting localStorage
    await this.page.addInitScript(() => {
      localStorage.setItem("gesture-cad-tutorial-v2", "true");
      localStorage.setItem("gesture-cad-tutorial-dismissed", "true");
    });
    await this.page.goto("/", { waitUntil: "networkidle" });
    // Wait for the Three.js canvas to render
    await this.viewport.waitFor({ state: "visible", timeout: 10000 });
    // Dismiss tutorial if it appears despite localStorage
    const skipBtn = this.page.locator("text=Skip Tutorial");
    if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await skipBtn.click();
      await this.page.waitForTimeout(300);
    }
    // Wait for R3F scene to initialize
    await this.page.waitForTimeout(500);
  }

  toolButton(toolId: string): Locator {
    return this.page.getByTestId(`tool-${toolId}`).first();
  }

  /** Smart tool selection: tries quick-bar first, then main toolbar, entering sketch mode if needed */
  async selectTool(toolId: string) {
    const sketchTools = ["line", "rect", "circle", "arc", "spline", "ellipse", "slot",
      "polygon", "draw", "trim", "offset", "mirror", "construction", "dimension"];

    // Try quick toolbar button first (navbar mini-toolbar)
    const quickBtn = this.page.getByTestId(`quick-${toolId}`);
    if (await quickBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await quickBtn.click();
      await this.page.waitForTimeout(100);
      return;
    }

    // Try main toolbar button
    const toolBtn = this.page.getByTestId(`tool-${toolId}`).first();
    if (await toolBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await toolBtn.click();
      await this.page.waitForTimeout(100);
      return;
    }

    // If it's a sketch tool, enter sketch mode first (click the Sketch/line primary button)
    if (sketchTools.includes(toolId)) {
      // Click the Sketch button (which is tool-line in the main toolbar) to enter sketch mode
      const sketchEntry = this.page.getByTestId("tool-line").first();
      if (await sketchEntry.isVisible({ timeout: 500 }).catch(() => false)) {
        await sketchEntry.click();
        await this.page.waitForTimeout(200);
      }
      // Now the sketch toolbar should be showing — try again
      const btn = this.page.getByTestId(`tool-${toolId}`).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        await this.page.waitForTimeout(100);
        return;
      }
    }

    // Last resort: try clicking via keyboard shortcut
    const shortcuts: Record<string, string> = {
      line: "l", circle: "c", rect: "r", arc: "a", draw: "p",
      ellipse: "e", polygon: "g", dimension: "d", trim: "t", mirror: "m",
      extrude: "x", hole: "h",
    };
    if (shortcuts[toolId]) {
      await this.page.keyboard.press(shortcuts[toolId]);
      await this.page.waitForTimeout(100);
    }
  }

  async expectActiveTool(toolName: string) {
    await expect(this.statusTool).toHaveText(toolName);
  }

  async expectEntityCount(count: number) {
    await expect(this.statusEntityCount).toHaveText(String(count));
  }

  async clickViewport(x: number, y: number) {
    await this.viewport.click({ position: { x, y } });
    // Wait for entity creation to propagate through React state
    await this.page.waitForTimeout(100);
  }

  async undo() {
    await this.undoBtn.click();
  }

  async redo() {
    await this.redoBtn.click();
  }

  /** Click a workbench tab by label */
  async switchWorkbench(label: string) {
    await this.page.locator(`button:has-text("${label}")`).first().click();
    await this.page.waitForTimeout(200);
  }

  /** Draw a rectangle (two-click) and return to select */
  async drawRect(x1: number, y1: number, x2: number, y2: number) {
    await this.selectTool("rect");
    await this.clickViewport(x1, y1);
    await this.clickViewport(x2, y2);
  }

  /** Draw a circle (two-click: center then edge) */
  async drawCircle(cx: number, cy: number, edgeX: number, edgeY: number) {
    await this.selectTool("circle");
    await this.clickViewport(cx, cy);
    await this.clickViewport(edgeX, edgeY);
  }

  /** Draw a line (two-click) */
  async drawLine(x1: number, y1: number, x2: number, y2: number) {
    await this.selectTool("line");
    await this.clickViewport(x1, y1);
    await this.clickViewport(x2, y2);
  }

  /** Verify feature count */
  async expectFeatureCount(count: number) {
    const featureCount = this.page.getByTestId("status-feature-count");
    await expect(featureCount).toHaveText(String(count));
  }

  /** Get the viewport canvas bounding box */
  async viewportBox() {
    return this.viewport.boundingBox();
  }

  /** Drag in the viewport from one point to another */
  async dragViewport(fromX: number, fromY: number, toX: number, toY: number) {
    const box = await this.viewportBox();
    if (!box) return;
    await this.page.mouse.move(box.x + fromX, box.y + fromY);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + toX, box.y + toY, { steps: 10 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(200);
  }

  /** Check a button exists and is visible */
  async expectToolExists(toolId: string) {
    await expect(this.toolButton(toolId)).toBeVisible();
  }

  /** Take a screenshot for visual record */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
