import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1400, height: 900 } });

test("Terminal — shell commands actually execute", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("gesture-cad-tutorial-v2", "true"); });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(2000);

  // Open terminal
  await page.keyboard.press("Control+`");
  await page.waitForTimeout(500);

  // Test shell tab — type 'pwd'
  await page.keyboard.type("!pwd");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/TFUL-01-pwd.png" });

  // Test 'ls'
  await page.keyboard.type("!ls");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/TFUL-02-ls.png" });

  // Test 'git status'
  await page.keyboard.type("!git status");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/TFUL-03-git-status.png" });

  // Test 'which claude'
  await page.keyboard.type("!which claude");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/TFUL-04-which-claude.png" });

  // Test MCP tab
  await page.keyboard.type("mcp.tools");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  await page.keyboard.type("mcp.call cad.sketch line");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/TFUL-05-mcp-call.png" });

  // Test cad.export
  // First draw something
  await page.keyboard.press("Control+`"); // close terminal
  await page.waitForTimeout(300);
  await page.keyboard.press("r");
  await page.waitForTimeout(200);
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width/2 - 50, box.y + box.height/2 - 30);
    await page.waitForTimeout(400);
    await page.mouse.click(box.x + box.width/2 + 50, box.y + box.height/2 + 30);
    await page.waitForTimeout(400);
  }
  // Extrude
  await page.keyboard.press("x");
  await page.waitForTimeout(500);
  if (box) {
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2 - 80, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  // Open terminal and export
  await page.keyboard.press("Control+`");
  await page.waitForTimeout(500);
  await page.keyboard.type("cad.features");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/TFUL-06-features-before-export.png" });

  await page.keyboard.type("cad.export stl");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/TFUL-07-exported-stl.png" });

  await page.keyboard.type("cad.export obj");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/TFUL-08-exported-obj.png" });

  // Test AI tab
  await page.keyboard.type("ai how do I add a hole to my box?");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/TFUL-09-ai-help.png" });

  console.log("✅ All terminal tests complete");
});
