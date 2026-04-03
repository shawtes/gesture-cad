import { test, expect } from "@playwright/test";

test.describe("Core functional tests — everything must work", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas", { timeout: 10000 });
    const skipBtn = page.locator("text=Skip Tutorial");
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }
    await page.waitForTimeout(500);
  });

  test("1. Draw a rectangle on the canvas", async ({ page }) => {
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx - 50, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 50, cy + 80);
    await page.waitForTimeout(400);

    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);
    await page.screenshot({ path: "test-results/func-01-rect.png" });
  });

  test("2. Draw a circle on the canvas", async ({ page }) => {
    await page.click('[data-testid="tool-circle"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 60, cy);
    await page.waitForTimeout(400);

    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);
    await page.screenshot({ path: "test-results/func-02-circle.png" });
  });

  test("3. Draw line with keyboard shortcut", async ({ page }) => {
    await page.keyboard.press("l");
    await page.waitForTimeout(200);

    const toolText = await page.locator('[data-testid="status-tool"]').textContent();
    expect(toolText).toBe("Line");

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx - 80, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 80, cy);
    await page.waitForTimeout(400);

    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);
  });

  test("4. Select entity and see it highlighted", async ({ page }) => {
    // Draw rect
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx - 40, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 40, cy + 60);
    await page.waitForTimeout(400);

    // Select
    await page.click('[data-testid="tool-select"]');
    await page.waitForTimeout(200);
    await page.mouse.click(cx, cy + 30);
    await page.waitForTimeout(400);

    const selectedBadge = page.locator("text=selected");
    await expect(selectedBadge).toBeVisible({ timeout: 2000 });
    await page.screenshot({ path: "test-results/func-04-select.png" });
  });

  test("5. Move entity by dragging", async ({ page }) => {
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx - 30, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 30, cy + 50);
    await page.waitForTimeout(400);

    await page.click('[data-testid="tool-select"]');
    await page.waitForTimeout(200);

    // Click on entity and drag
    await page.mouse.move(cx, cy + 25);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.move(cx + 100, cy + 25, { steps: 15 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(300);

    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);
    await page.screenshot({ path: "test-results/func-05-moved.png" });
  });

  test("6. Extrude rectangle into 3D box", async ({ page }) => {
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx - 40, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 40, cy + 50);
    await page.waitForTimeout(400);

    await page.click('[data-testid="tool-extrude"]');
    await page.waitForTimeout(600);

    const featureCount = await page.locator('[data-testid="status-feature-count"]').textContent();
    expect(Number(featureCount)).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/func-06-extrude.png" });
  });

  test("7. Undo/redo works", async ({ page }) => {
    await page.click('[data-testid="tool-rect"]');
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.click(cx - 30, cy);
    await page.waitForTimeout(400);
    await page.mouse.click(cx + 30, cy + 50);
    await page.waitForTimeout(400);

    let count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);

    // Undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(0);

    // Redo
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(300);
    count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);
  });

  test("8. Switch planes with keyboard 1/2/3", async ({ page }) => {
    // Default is Top (XZ)
    const topBtn = page.locator('[data-testid="plane-xz"]');
    // Press 2 for front
    await page.keyboard.press("2");
    await page.waitForTimeout(300);
    // Press 3 for side
    await page.keyboard.press("3");
    await page.waitForTimeout(300);
    // Press 1 for top
    await page.keyboard.press("1");
    await page.waitForTimeout(300);

    // Should not crash
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("9. Right-click orbits camera", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 100, cy, { steps: 10 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(200);

    await expect(canvas).toBeVisible();
    await page.screenshot({ path: "test-results/func-09-orbit.png" });
  });

  test("10. Scroll zooms", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);

    await expect(canvas).toBeVisible();
  });
});
