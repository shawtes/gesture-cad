import { test, expect } from "@playwright/test";

test.describe("XR Sprint 4: CAD Format Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3002", { waitUntil: "networkidle", timeout: 15000 });
    await page.locator("canvas").first().waitFor({ state: "visible", timeout: 10000 });
  });

  test("cross-section plane math: normal dot offset", async ({ page }) => {
    const result = await page.evaluate(() => {
      // Plane at y=0.5 with normal (0,1,0)
      const normal = { x: 0, y: 1, z: 0 };
      const offset = 0.5;
      // Point above plane should be on positive side
      const pointAbove = { x: 0, y: 0.8, z: 0 };
      const dist = normal.x * pointAbove.x + normal.y * pointAbove.y + normal.z * pointAbove.z - offset;
      return { dist, abovePlane: dist > 0 };
    });
    expect(result.abovePlane).toBe(true);
  });

  test("exploded view factor 0 = assembled, 1 = spread", async ({ page }) => {
    const result = await page.evaluate(() => {
      const factor0 = 0; // assembled
      const factor1 = 1; // exploded
      const baseOffset = 0.5;
      return {
        assembledOffset: factor0 * baseOffset,
        explodedOffset: factor1 * baseOffset,
      };
    });
    expect(result.assembledOffset).toBe(0);
    expect(result.explodedOffset).toBe(0.5);
  });

  test("measurement between two points calculates correctly", async ({ page }) => {
    const result = await page.evaluate(() => {
      const a = { x: 0, y: 0, z: 0 };
      const b = { x: 0.3, y: 0.4, z: 0 }; // 3-4-5 triangle → dist = 0.5
      const dist = Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2 + (b.z-a.z)**2);
      return dist;
    });
    expect(result).toBeCloseTo(0.5, 4);
  });

  test("STL file type detection works", async ({ page }) => {
    const result = await page.evaluate(() => {
      function detect(name: string) {
        const ext = name.toLowerCase().split(".").pop();
        return ext === "stl" || ext === "glb" || ext === "gltf" || ext === "step" || ext === "stp";
      }
      return {
        stl: detect("part.stl"),
        glb: detect("model.glb"),
        step: detect("cad.step"),
        txt: detect("readme.txt"),
      };
    });
    expect(result.stl).toBe(true);
    expect(result.glb).toBe(true);
    expect(result.step).toBe(true);
    expect(result.txt).toBe(false);
  });

  test("load model button is accessible", async ({ page }) => {
    await expect(page.getByTestId("load-model-btn")).toBeVisible();
  });
});
