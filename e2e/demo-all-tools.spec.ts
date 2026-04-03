/**
 * Demo every single tool — opens browser, uses each one, takes screenshots.
 * Run with: npx playwright test demo-all-tools --headed
 * The --headed flag opens a visible browser window so you can watch.
 */
import { test, expect } from "@playwright/test";

// Slow down so you can see each action
test.use({ launchOptions: { slowMo: 300 } });

test("Demo EVERY tool in GestureCAD", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(1500);

  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) { console.log("No canvas found"); return; }
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  /** Helper: select tool via keyboard shortcut or search */
  async function useTool(name: string, shortcut?: string) {
    if (shortcut) {
      await page.keyboard.press(shortcut);
      await page.waitForTimeout(400);
      return;
    }
    // Use search
    const searchBtn = page.locator("text=Search tools").first();
    if (await searchBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await searchBtn.click();
      await page.waitForTimeout(200);
      await page.keyboard.type(name, { delay: 50 });
      await page.waitForTimeout(300);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
    }
  }

  /** Helper: click Apply on param dialog if visible */
  async function clickApply() {
    const apply = page.locator('[data-testid="param-apply"]');
    if (await apply.isVisible({ timeout: 1500 }).catch(() => false)) {
      await apply.click();
      await page.waitForTimeout(500);
    }
  }

  /** Helper: draw 2 clicks */
  async function twoClicks(x1: number, y1: number, x2: number, y2: number) {
    await page.mouse.click(x1, y1);
    await page.waitForTimeout(400);
    await page.mouse.click(x2, y2);
    await page.waitForTimeout(400);
  }

  let step = 0;
  async function screenshot(label: string) {
    step++;
    const name = `DEMO-${String(step).padStart(2, "0")}-${label}`;
    await page.screenshot({ path: `test-results/${name}.png` });
    console.log(`✓ ${name}`);
  }

  // ═══════════════════════════════════════════
  // SKETCH TOOLS
  // ═══════════════════════════════════════════
  console.log("\n=== SKETCH TOOLS ===");

  // 1. Line
  await useTool("line", "l");
  await twoClicks(cx - 80, cy, cx + 80, cy);
  await screenshot("line");

  // 2. Rectangle
  await useTool("rect");
  await twoClicks(cx - 60, cy - 40, cx + 60, cy + 40);
  await screenshot("rect");

  // 3. Circle
  await useTool("circle", "c");
  await twoClicks(cx + 120, cy, cx + 160, cy);
  await screenshot("circle");

  // 4. Arc (3 clicks)
  await useTool("arc", "a");
  await page.mouse.click(cx - 120, cy);
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 100, cy - 40);
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 80, cy);
  await page.waitForTimeout(300);
  await screenshot("arc");

  // 5. Ellipse
  await useTool("ellipse", "e");
  await twoClicks(cx, cy + 80, cx + 40, cy + 100);
  await screenshot("ellipse");

  // 6. Polygon
  await useTool("polygon", "g");
  await twoClicks(cx - 120, cy + 80, cx - 90, cy + 80);
  await screenshot("polygon");

  // 7. Slot
  await useTool("slot");
  await twoClicks(cx + 80, cy + 80, cx + 140, cy + 80);
  await screenshot("slot");

  // 8. Spline (multi-click)
  await useTool("spline");
  await page.mouse.click(cx - 60, cy - 80);
  await page.waitForTimeout(200);
  await page.mouse.click(cx - 30, cy - 100);
  await page.waitForTimeout(200);
  await page.mouse.click(cx, cy - 80);
  await page.waitForTimeout(200);
  await page.mouse.click(cx + 30, cy - 100);
  await page.waitForTimeout(200);
  await page.mouse.click(cx + 30, cy - 100); // double-click to finish
  await page.waitForTimeout(300);
  await screenshot("spline");

  // 9. Point
  await useTool("point", "p");
  await page.mouse.click(cx, cy - 60);
  await page.waitForTimeout(300);
  await screenshot("point");

  // 10. Center Point Rectangle
  await useTool("center_rect");
  await twoClicks(cx + 100, cy - 60, cx + 130, cy - 40);
  await screenshot("center-rect");

  // 11. 3 Point Circle
  await useTool("3 point circle");
  await page.mouse.click(cx - 140, cy - 30);
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 120, cy - 60);
  await page.waitForTimeout(300);
  await page.mouse.click(cx - 100, cy - 30);
  await page.waitForTimeout(300);
  await screenshot("three-point-circle");

  // 12. Dimension
  await useTool("dimension", "d");
  await twoClicks(cx - 80, cy, cx + 80, cy);
  await page.waitForTimeout(500);
  await screenshot("dimension");

  // 13. Trim
  await useTool("trim", "t");
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(300);
  await screenshot("trim");

  // 14. Offset
  await useTool("offset");
  await page.mouse.click(cx + 120, cy);
  await page.waitForTimeout(300);
  await screenshot("offset");

  // 15. Mirror
  await useTool("mirror");
  await page.mouse.click(cx - 80, cy);
  await page.waitForTimeout(300);
  await screenshot("mirror");

  // Full sketch screenshot
  await screenshot("ALL-SKETCH-ENTITIES");

  // ═══════════════════════════════════════════
  // EXTRUDE (interactive)
  // ═══════════════════════════════════════════
  console.log("\n=== 3D FEATURES ===");

  // Clear and draw a fresh circle for extrude
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(100);
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(100);
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(100);
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(100);

  // Draw circle
  await useTool("circle", "c");
  await twoClicks(cx, cy, cx + 50, cy);

  // 16. Extrude — interactive drag
  await useTool("extrude", "x");
  await page.waitForTimeout(300);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 100, { steps: 15 });
  await page.waitForTimeout(500);
  await screenshot("extrude-dragging");
  await page.mouse.up();
  await page.waitForTimeout(500);
  await screenshot("extrude-done");

  // 17. Fillet
  await useTool("fillet");
  await clickApply();
  await screenshot("fillet");

  // 18. Chamfer
  await useTool("chamfer");
  await clickApply();
  await screenshot("chamfer");

  // 19. Shell
  await useTool("shell");
  await clickApply();
  await screenshot("shell");

  // 20. Draft
  await useTool("draft");
  await clickApply();
  await screenshot("draft");

  // 21. Hole
  await useTool("hole", "h");
  await clickApply();
  await screenshot("hole");

  // 22. Rib
  await useTool("rib");
  await clickApply();
  await screenshot("rib");

  // 23. Split
  await useTool("split");
  await clickApply();
  await screenshot("split");

  // 24. Thicken
  await useTool("thicken");
  await clickApply();
  await screenshot("thicken");

  // 25. Helix
  await useTool("helix");
  await clickApply();
  await screenshot("helix");

  // 26. Emboss
  await useTool("emboss");
  await clickApply();
  await screenshot("emboss");

  // 27. External Thread
  await useTool("external thread");
  await clickApply();
  await screenshot("external-thread");

  // 28. Revolve
  // Draw a new circle first
  await useTool("circle", "c");
  await twoClicks(cx - 80, cy, cx - 60, cy);
  await useTool("revolve");
  await clickApply();
  await screenshot("revolve");

  // ═══════════════════════════════════════════
  // PATTERNS
  // ═══════════════════════════════════════════
  console.log("\n=== PATTERNS ===");

  // 29. Linear Pattern
  await useTool("linear pattern");
  await clickApply();
  await screenshot("linear-pattern");

  // 30. Circular Pattern
  await useTool("circular pattern");
  await clickApply();
  await screenshot("circular-pattern");

  // ═══════════════════════════════════════════
  // DIRECT EDIT TOOLS
  // ═══════════════════════════════════════════
  console.log("\n=== DIRECT EDIT ===");

  // 31. Modify Fillet
  await useTool("modify fillet");
  await clickApply();
  await screenshot("modify-fillet");

  // 32. Move Face
  await useTool("move face");
  await clickApply();
  await screenshot("move-face");

  // 33. Offset Face
  await useTool("offset face");
  await clickApply();
  await screenshot("offset-face");

  // 34. Transform/Move Part
  await useTool("move/copy");
  await clickApply();
  await screenshot("transform-part");

  // ═══════════════════════════════════════════
  // CONSTRUCTION TOOLS
  // ═══════════════════════════════════════════
  console.log("\n=== CONSTRUCTION ===");

  // 35. Custom Plane
  await useTool("plane");
  await clickApply();
  await screenshot("custom-plane");

  // 36. Mate Connector
  await useTool("mate connector");
  await clickApply();
  await screenshot("mate-connector");

  // 37. Construction Axis
  await useTool("construction axis");
  await clickApply();
  await screenshot("construction-axis");

  // 38. Construction Point
  await useTool("construction point");
  await clickApply();
  await screenshot("construction-point");

  // 39. Frame
  await useTool("frame");
  await clickApply();
  await screenshot("frame");

  // ═══════════════════════════════════════════
  // VIEW CONTROLS
  // ═══════════════════════════════════════════
  console.log("\n=== VIEW CONTROLS ===");

  // 40. View presets
  for (const view of ["top", "front", "right", "iso"]) {
    const btn = page.locator(`[data-testid="viewcube-${view}"]`);
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(400);
    }
  }
  await screenshot("view-presets");

  // 41. N key (normal to sketch)
  await page.keyboard.press("n");
  await page.waitForTimeout(400);
  await screenshot("normal-view");

  // 42. Camera sliders
  const toggle = page.locator('[data-testid="toggle-camera-sliders"]');
  if (await toggle.isVisible({ timeout: 500 }).catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(300);
    await screenshot("camera-sliders");
  }

  // 43. Render mode
  const viewOpts = page.locator('[data-testid="view-options-btn"]');
  if (await viewOpts.isVisible({ timeout: 500 }).catch(() => false)) {
    await viewOpts.click();
    await page.waitForTimeout(300);
    await screenshot("render-modes");
    await page.keyboard.press("Escape");
  }

  // ═══════════════════════════════════════════
  // SIDEBAR TABS
  // ═══════════════════════════════════════════
  console.log("\n=== SIDEBAR TABS ===");

  for (const tab of ["Model", "Assembly", "Drawing", "Simulate", "CAM", "History"]) {
    const btn = page.locator(`button:has-text("${tab}")`).last();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(400);
      await screenshot(`tab-${tab.toLowerCase()}`);
    }
  }

  // ═══════════════════════════════════════════
  // UNDO/REDO
  // ═══════════════════════════════════════════
  console.log("\n=== UNDO/REDO ===");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  await screenshot("undo");
  await page.keyboard.press("Control+y");
  await page.waitForTimeout(300);
  await screenshot("redo");

  // Final state
  await screenshot("FINAL-STATE");

  console.log(`\n✅ Demo complete — ${step} screenshots captured in test-results/`);
});
