/**
 * Honest test: click every tool, verify it ACTUALLY DOES SOMETHING.
 * Not just "button exists" — verify state changes.
 */
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1920, height: 1080 } });

test("Test every tool actually works", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  const entityCount = async () => {
    const el = page.locator('[data-testid="status-entity-count"]');
    const text = await el.textContent().catch(() => "0");
    return Number(text);
  };

  const featureCount = async () => {
    const el = page.locator('[data-testid="status-feature-count"]');
    const text = await el.textContent().catch(() => "0");
    return Number(text);
  };

  const results: { tool: string; worked: boolean; detail: string }[] = [];

  async function testSketchTool(name: string, shortcut: string, clicks: [number, number][]) {
    const before = await entityCount();
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(300);
    for (const [x, y] of clicks) {
      await page.mouse.click(cx + x, cy + y);
      await page.waitForTimeout(400);
    }
    const after = await entityCount();
    const worked = after > before;
    results.push({ tool: name, worked, detail: worked ? `${before} → ${after} entities` : `STUCK at ${after}` });
    if (worked) await page.screenshot({ path: `test-results/WORKS-${name}.png` });
  }

  async function testFeatureTool(name: string, expectDialog: boolean = true) {
    const before = await featureCount();

    // Try search first
    const searchBtn = page.locator("text=Search tools").first();
    if (await searchBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(200);
      await page.locator("input[placeholder*='Search']").fill(name);
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }

    if (expectDialog) {
      const apply = page.locator('[data-testid="param-apply"]');
      if (await apply.isVisible({ timeout: 2000 }).catch(() => false)) {
        await apply.click();
        await page.waitForTimeout(600);
      } else {
        results.push({ tool: name, worked: false, detail: "NO DIALOG APPEARED" });
        return;
      }
    }

    await page.waitForTimeout(300);
    const after = await featureCount();
    const worked = after > before;
    results.push({ tool: name, worked, detail: worked ? `${before} → ${after} features` : `STUCK at ${after}` });
    if (worked) await page.screenshot({ path: `test-results/WORKS-${name.replace(/\s/g, "-")}.png` });
  }

  // ═══════════════════════════════════
  // TEST SKETCH TOOLS
  // ═══════════════════════════════════
  console.log("\n=== SKETCH TOOLS ===");

  await testSketchTool("line", "l", [[-60, 0], [60, 0]]);
  await testSketchTool("circle", "c", [[0, 60], [40, 60]]);
  await testSketchTool("rect", "r", [[-40, -80], [40, -40]]);
  await testSketchTool("arc", "a", [[-80, 60], [-60, 40], [-40, 60]]);
  await testSketchTool("ellipse", "e", [[80, -60], [110, -40]]);
  await testSketchTool("polygon", "g", [[-80, -60], [-50, -60]]);
  await testSketchTool("point", "p", [[0, -100]]);

  // Test slot via search
  const beforeSlot = await entityCount();
  const searchBtn1 = page.locator("text=Search tools").first();
  if (await searchBtn1.isVisible({ timeout: 500 }).catch(() => false)) {
    await searchBtn1.click();
    await page.waitForTimeout(200);
    await page.locator("input[placeholder*='Search']").fill("slot");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
  }
  await page.mouse.click(cx + 60, cy + 60);
  await page.waitForTimeout(400);
  await page.mouse.click(cx + 120, cy + 60);
  await page.waitForTimeout(400);
  const afterSlot = await entityCount();
  results.push({ tool: "slot", worked: afterSlot > beforeSlot, detail: `${beforeSlot} → ${afterSlot}` });

  await page.screenshot({ path: "test-results/WORKS-all-sketch.png" });

  // ═══════════════════════════════════
  // TEST EXTRUDE (interactive)
  // ═══════════════════════════════════
  console.log("\n=== EXTRUDE ===");
  const beforeExtrude = await featureCount();
  await page.keyboard.press("x");
  await page.waitForTimeout(500);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 100, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const afterExtrude = await featureCount();
  results.push({ tool: "extrude (interactive)", worked: afterExtrude > beforeExtrude, detail: `${beforeExtrude} → ${afterExtrude}` });
  await page.screenshot({ path: "test-results/WORKS-extrude.png" });

  // ═══════════════════════════════════
  // TEST FEATURE TOOLS (via dialog)
  // ═══════════════════════════════════
  console.log("\n=== FEATURE TOOLS ===");

  await testFeatureTool("fillet");
  await testFeatureTool("chamfer");
  await testFeatureTool("shell");
  await testFeatureTool("draft");
  await testFeatureTool("hole");
  await testFeatureTool("helix");
  await testFeatureTool("emboss");
  await testFeatureTool("external thread");
  await testFeatureTool("modify fillet");
  await testFeatureTool("move face");
  await testFeatureTool("offset face");
  await testFeatureTool("rib");
  await testFeatureTool("split");
  await testFeatureTool("thicken");
  await testFeatureTool("revolve");
  await testFeatureTool("linear pattern");
  await testFeatureTool("circular pattern");

  // Transform/move part
  await testFeatureTool("move/copy");

  // Construction tools
  await testFeatureTool("plane");
  await testFeatureTool("mate connector");
  await testFeatureTool("axis");
  await testFeatureTool("point");
  await testFeatureTool("frame");

  // ═══════════════════════════════════
  // PRINT RESULTS
  // ═══════════════════════════════════
  console.log("\n\n═══════════════════════════════════");
  console.log("TOOL TEST RESULTS");
  console.log("═══════════════════════════════════\n");

  let worked = 0, broken = 0;
  for (const r of results) {
    const icon = r.worked ? "✅" : "❌";
    console.log(`${icon} ${r.tool.padEnd(25)} ${r.detail}`);
    if (r.worked) worked++; else broken++;
  }

  console.log(`\n✅ WORKING: ${worked}/${results.length}`);
  console.log(`❌ BROKEN:  ${broken}/${results.length}`);

  await page.screenshot({ path: "test-results/WORKS-final.png" });

  // Write results to file
  const fs = require("fs");
  fs.writeFileSync("test-results/TOOL-TEST-RESULTS.txt",
    results.map((r) => `${r.worked ? "PASS" : "FAIL"} | ${r.tool} | ${r.detail}`).join("\n")
  );
});
