import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1400, height: 900 } });

test("Integrated terminal works", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  // Draw something first so we have state
  await page.keyboard.press("c");
  await page.waitForTimeout(200);
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
    await page.waitForTimeout(400);
    await page.mouse.click(box.x + box.width/2 + 50, box.y + box.height/2);
    await page.waitForTimeout(400);
  }

  // Open terminal with Ctrl+`
  await page.keyboard.press("Control+`");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/TERM-01-opened.png" });

  // Type 'help'
  await page.keyboard.type("help");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/TERM-02-help.png" });

  // Type 'cad.entities'
  await page.keyboard.type("cad.entities");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/TERM-03-entities.png" });

  // Type 'cad.features'
  await page.keyboard.type("cad.features");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/TERM-04-features.png" });

  // Type 'cad.tool'
  await page.keyboard.type("cad.tool");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);

  // Type 'ai how do I make a gear?'
  await page.keyboard.type("ai how do I make a gear?");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/TERM-05-ai-response.png" });

  // Type 'mcp.tools'
  await page.keyboard.type("mcp.tools");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/TERM-06-mcp-tools.png" });

  // Close terminal
  await page.keyboard.press("Control+`");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/TERM-07-closed.png" });
});
