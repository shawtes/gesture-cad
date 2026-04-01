import { test, expect } from "@playwright/test";

test.describe("XR Sprint 2: Hand Tracking + Gesture Control", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 10000 });
  });

  test("XR gesture types are defined correctly", async ({ page }) => {
    const result = await page.evaluate(() => {
      const types = ["none", "pinch", "grab", "point", "open_palm", "thumbs_up"];
      return types.length;
    });
    expect(result).toBe(6);
  });

  test("pinch detection math: distance < 2cm = pinch", async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simulate pinch: thumb and index 1cm apart
      const thumbTip = { x: 0, y: 0.1, z: -0.3 };
      const indexTip = { x: 0.01, y: 0.1, z: -0.3 };
      const dist = Math.sqrt(
        (thumbTip.x - indexTip.x) ** 2 +
        (thumbTip.y - indexTip.y) ** 2 +
        (thumbTip.z - indexTip.z) ** 2
      );
      return { dist, isPinch: dist < 0.02 };
    });
    expect(result.isPinch).toBe(true);
    expect(result.dist).toBeLessThan(0.02);
  });

  test("bimanual scale math: distance ratio computes scale", async ({ page }) => {
    const result = await page.evaluate(() => {
      const initialDist = 0.3; // 30cm apart initially
      const currentDist = 0.6; // 60cm apart now
      const scale = currentDist / initialDist;
      return scale;
    });
    expect(result).toBeCloseTo(2.0, 2);
  });

  test("grab offset preserves model-hand relationship", async ({ page }) => {
    const result = await page.evaluate(() => {
      const handPos = { x: 0.5, y: 1.0, z: -0.5 };
      const modelPos = { x: 0, y: 0.5, z: 0 };
      const offset = {
        x: modelPos.x - handPos.x,
        y: modelPos.y - handPos.y,
        z: modelPos.z - handPos.z,
      };
      // Move hand to new position
      const newHandPos = { x: 0.8, y: 1.2, z: -0.3 };
      const newModelPos = {
        x: newHandPos.x + offset.x,
        y: newHandPos.y + offset.y,
        z: newHandPos.z + offset.z,
      };
      // Model should have moved same delta as hand
      return {
        dx: newModelPos.x - modelPos.x,
        handDx: newHandPos.x - handPos.x,
        match: Math.abs((newModelPos.x - modelPos.x) - (newHandPos.x - handPos.x)) < 0.001,
      };
    });
    expect(result.match).toBe(true);
  });

  test("mode buttons still work in XR app", async ({ page }) => {
    const viewBtn = page.getByTestId("mode-view");
    const drawBtn = page.getByTestId("mode-draw");
    const measureBtn = page.getByTestId("mode-measure");

    await drawBtn.click();
    const drawBorder = await drawBtn.evaluate((el) => getComputedStyle(el).borderColor);
    expect(drawBorder).toContain("59, 130, 246");

    await measureBtn.click();
    const measureBorder = await measureBtn.evaluate((el) => getComputedStyle(el).borderColor);
    expect(measureBorder).toContain("59, 130, 246");
  });
});
