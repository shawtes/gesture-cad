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
      localStorage.setItem("gesture-cad-tutorial-dismissed", "true");
    });
    await this.page.goto("/", { waitUntil: "networkidle" });
    // Wait for the Three.js canvas to render
    await this.viewport.waitFor({ state: "visible", timeout: 10000 });
    // Wait for R3F scene to initialize
    await this.page.waitForTimeout(500);
  }

  toolButton(toolId: string): Locator {
    return this.page.getByTestId(`tool-${toolId}`);
  }

  async selectTool(toolId: string) {
    await this.toolButton(toolId).click();
    // Wait for React state to propagate to Three.js scene
    await this.page.waitForTimeout(100);
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
}
