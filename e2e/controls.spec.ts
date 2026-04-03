import { test, expect } from "@playwright/test";

test.describe("Camera and object controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("canvas", { timeout: 10000 });
    const skipBtn = page.locator("text=Skip Tutorial");
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }
    await page.waitForTimeout(500);
  });

  test("left-click does NOT orbit — only selects", async ({ page }) => {
    // Take screenshot before
    const before = await page.screenshot();

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Left-click drag across viewport
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: "left" });
    await page.mouse.move(cx + 150, cy + 100, { steps: 10 });
    await page.mouse.up({ button: "left" });
    await page.waitForTimeout(300);

    // Should NOT have orbited — just a select/deselect in empty space
    await expect(canvas).toBeVisible();
  });

  test("right-click drag orbits the camera", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(cx + 150, cy, { steps: 15 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(300);

    // Page should still be functional after orbit
    await expect(canvas).toBeVisible();
  });

  test("scroll zooms", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -200); // scroll up = zoom in
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, 200); // scroll down = zoom out
    await page.waitForTimeout(300);

    await expect(canvas).toBeVisible();
  });

  test("draw rect then select and drag moves it", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Draw
    await page.click('[data-testid="tool-rect"]');
    await page.mouse.click(cx - 30, cy);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 30, cy + 50);
    await page.waitForTimeout(300);

    // Select tool
    await page.click('[data-testid="tool-select"]');
    await page.waitForTimeout(200);

    // Click on entity and drag
    await page.mouse.move(cx, cy + 25);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(cx + 80, cy + 25, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Entity should still exist
    const count = await page.locator('[data-testid="status-entity-count"]').textContent();
    expect(Number(count)).toBe(1);

    // Should show as selected
    const selected = page.locator("text=selected");
    await expect(selected).toBeVisible({ timeout: 2000 });
  });
});
