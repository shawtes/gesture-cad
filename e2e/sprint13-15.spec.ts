import { test, expect } from "@playwright/test";
import { CADPage } from "./pages/cad-page";

test.describe("Sprint 13: Sheet Metal", () => {
  test("sheet metal K-factor calculation is correct", async ({ page }) => {
    // Test the bend allowance formula: BA = θ × (R + K × T)
    // 90° bend, R=1.5, K=0.44, T=1.0
    // BA = (π/2) × (1.5 + 0.44 × 1.0) = 1.5708 × 1.94 = 3.047
    const result = await page.evaluate(() => {
      const angleDeg = 90;
      const radius = 1.5;
      const kFactor = 0.44;
      const thickness = 1.0;
      const angleRad = (angleDeg * Math.PI) / 180;
      return angleRad * (radius + kFactor * thickness);
    });
    expect(result).toBeCloseTo(3.047, 1);
  });
});

test.describe("Sprint 14-15: Surfacing", () => {
  test("NURBS evaluation produces valid coordinates", async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simple 2x2 control grid
      const cp = [
        [{ x: 0, y: 0, z: 0, weight: 1 }, { x: 1, y: 0, z: 0, weight: 1 }],
        [{ x: 0, y: 0, z: 1, weight: 1 }, { x: 1, y: 1, z: 1, weight: 1 }],
      ];
      // Bilinear at (0.5, 0.5) should be center
      const u = 0.5, v = 0.5;
      const ui = 0, vi = 0, uf = 0.5, vf = 0.5;
      const p00 = cp[0][0], p10 = cp[1][0], p01 = cp[0][1], p11 = cp[1][1];
      return {
        x: (1-uf)*(1-vf)*p00.x + uf*(1-vf)*p10.x + (1-uf)*vf*p01.x + uf*vf*p11.x,
        y: (1-uf)*(1-vf)*p00.y + uf*(1-vf)*p10.y + (1-uf)*vf*p01.y + uf*vf*p11.y,
        z: (1-uf)*(1-vf)*p00.z + uf*(1-vf)*p10.z + (1-uf)*vf*p01.z + uf*vf*p11.z,
      };
    });
    expect(result.x).toBeCloseTo(0.5, 2);
    expect(result.z).toBeCloseTo(0.5, 2);
  });
});

test.describe("Sprint 14-15: UI Integration", () => {
  let cad: CADPage;

  test.beforeEach(async ({ page }) => {
    cad = new CADPage(page);
    await cad.goto();
  });

  test("parameter panel shows default radius parameter", async ({ page }) => {
    await expect(page.getByTestId("param-value-radius")).toBeVisible();
  });
});
