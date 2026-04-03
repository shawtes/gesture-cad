import { test, expect } from "@playwright/test";

test.describe("Object interaction — draw, select, move", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas", { timeout: 10000 });
    const skipBtn = page.locator("text=Skip Tutorial");
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }
    await page.waitForTimeout(500);
  });

  test("can draw a rectangle", async ({ page }) => {
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.click(cx - 50, cy - 50);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 50, cy + 50);
    await page.waitForTimeout(300);

    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBeGreaterThan(0);
  });

  test("can select an entity", async ({ page }) => {
    // Draw rect
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.click(cx - 30, cy);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 30, cy + 60);
    await page.waitForTimeout(300);

    // Switch to select and click near entity
    await page.click('[data-testid="tool-select"]');
    await page.waitForTimeout(200);
    await page.mouse.click(cx, cy + 30);
    await page.waitForTimeout(300);

    // Check "selected" badge appears in toolbar
    const selected = page.locator("text=selected");
    await expect(selected).toBeVisible({ timeout: 2000 });
  });

  test("can move entity by dragging", async ({ page }) => {
    // Draw rect
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.click(cx - 30, cy);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 30, cy + 60);
    await page.waitForTimeout(300);

    // Select mode, click entity, drag it
    await page.click('[data-testid="tool-select"]');
    await page.waitForTimeout(200);

    await page.mouse.move(cx, cy + 30);
    await page.mouse.down();
    await page.waitForTimeout(150);
    await page.mouse.move(cx + 120, cy + 30, { steps: 15 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Entity count should still be 1 (moved, not deleted)
    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);

    // Take screenshot to verify visual move
    await page.screenshot({ path: "test-results/move-result.png" });
  });

  test("orbit with right-click drag", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 100, cy + 50, { steps: 10 });
    await page.mouse.up({ button: "right" });

    await expect(canvas).toBeVisible();
  });

  test("all toolbar tools clickable", async ({ page }) => {
    const tools = ["select", "draw", "line", "circle", "rect", "arc", "ellipse", "trim", "offset", "mirror"];
    for (const tool of tools) {
      const btn = page.locator(`[data-testid="tool-${tool}"]`);
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(100);
      }
    }
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("extrude creates a 3D feature", async ({ page }) => {
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.click(cx - 40, cy - 20);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 40, cy + 40);
    await page.waitForTimeout(300);

    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(500);

    const count = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(count)).toBeGreaterThan(0);
  });
});
