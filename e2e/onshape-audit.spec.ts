/**
 * Onshape UI Audit — captures every button, dropdown, menu item, and feature
 * from a live Onshape Part Studio session.
 *
 * This spec navigates to the user's Onshape document, systematically clicks
 * every toolbar group, opens every dropdown, and records what's there.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";

const ONSHAPE_URL = "https://cad.onshape.com/documents/28fceb55c90760468a880e25/w/cbe074d402ff028";

const audit: any = {
  toolbar: [],
  dropdowns: [],
  leftSidebar: [],
  rightSidebar: [],
  featureTree: [],
  bottomTabs: [],
  contextMenus: [],
  dialogs: [],
  shortcuts: [],
};

test.describe("Onshape Complete UI Audit", () => {
  test("Capture every toolbar button and dropdown", async ({ page }) => {
    // Go to Onshape — user should already be logged in via browser cookies
    await page.goto(ONSHAPE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000); // Wait for Onshape to load

    // If login page, skip — we need cookies
    const isLoggedIn = await page.locator(".custom-toolbar").isVisible({ timeout: 10000 }).catch(() => false);

    if (!isLoggedIn) {
      console.log("Not logged into Onshape — saving what we can from the page");
      await page.screenshot({ path: "test-results/onshape-login-required.png", fullPage: true });

      // Try to extract toolbar HTML from the page anyway
      const pageHTML = await page.content();
      fs.writeFileSync("test-results/onshape-page-source.html", pageHTML.substring(0, 500000));
      return;
    }

    await page.screenshot({ path: "test-results/onshape-00-full-page.png", fullPage: false });

    // ═══════════════════════════════════════════
    // 1. MAIN TOOLBAR — capture every button
    // ═══════════════════════════════════════════
    const toolButtons = await page.locator(".tool.is-activatable").all();
    console.log(`Found ${toolButtons.length} toolbar buttons`);

    for (let i = 0; i < toolButtons.length; i++) {
      const btn = toolButtons[i];
      try {
        const commandId = await btn.getAttribute("command-id") || "unknown";
        const title = await btn.getAttribute("data-bs-original-title") || "";
        const description = await btn.getAttribute("data-bs-expanded-content") || "";
        const label = await btn.locator(".tool-label").textContent().catch(() => "");
        const isDisabled = await btn.evaluate((el) => el.classList.contains("disabled"));

        audit.toolbar.push({
          index: i,
          commandId,
          title,
          description: description.replace(/<[^>]*>/g, "").substring(0, 300),
          label: label?.trim(),
          disabled: isDisabled,
        });

        console.log(`  [${i}] ${commandId}: ${title}`);
      } catch {
        console.log(`  [${i}] Error reading button`);
      }
    }

    // ═══════════════════════════════════════════
    // 2. DROPDOWNS — click each dropdown arrow to reveal hidden tools
    // ═══════════════════════════════════════════
    const dropdownArrows = await page.locator(".dropdown-arrow").all();
    console.log(`\nFound ${dropdownArrows.length} dropdown arrows`);

    for (let i = 0; i < dropdownArrows.length; i++) {
      try {
        await dropdownArrows[i].click({ timeout: 2000 });
        await page.waitForTimeout(500);

        // Capture the dropdown menu
        const dropdownMenu = page.locator(".dropdown-menu:visible, .os-dropdown-menu:visible, .toolgroup-dropdown:visible").first();
        const isMenuVisible = await dropdownMenu.isVisible({ timeout: 1000 }).catch(() => false);

        if (isMenuVisible) {
          await page.screenshot({ path: `test-results/onshape-dropdown-${i}.png` });

          // Get all items in the dropdown
          const menuItems = await dropdownMenu.locator(".tool, .dropdown-item, button").all();
          const items: string[] = [];
          for (const item of menuItems) {
            const text = await item.textContent().catch(() => "");
            const cmdId = await item.getAttribute("command-id").catch(() => "");
            const itemTitle = await item.getAttribute("data-bs-original-title").catch(() => "");
            if (text || cmdId) {
              items.push(`${cmdId || ""}: ${(itemTitle || text || "").trim()}`);
            }
          }

          audit.dropdowns.push({ index: i, items });
          console.log(`  Dropdown ${i}: ${items.length} items — ${items.join(", ")}`);

          // Close dropdown by pressing Escape
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
        }
      } catch {
        console.log(`  Dropdown ${i}: couldn't open`);
      }
    }

    // ═══════════════════════════════════════════
    // 3. FEATURE TREE — capture all items
    // ═══════════════════════════════════════════
    console.log("\nFeature Tree:");
    const featureItems = await page.locator(".feature-list-item, .node-label, [class*='feature']").all();
    for (const item of featureItems) {
      const text = await item.textContent().catch(() => "");
      if (text && text.trim()) {
        audit.featureTree.push(text.trim().substring(0, 100));
        console.log(`  ${text.trim().substring(0, 80)}`);
      }
    }

    // ═══════════════════════════════════════════
    // 4. LEFT SIDEBAR ICONS
    // ═══════════════════════════════════════════
    console.log("\nLeft sidebar:");
    const leftIcons = await page.locator(".os-left-panel button, .os-left-panel [role='button'], nav button").all();
    for (const icon of leftIcons) {
      const title = await icon.getAttribute("title").catch(() => "");
      const ariaLabel = await icon.getAttribute("aria-label").catch(() => "");
      const text = await icon.textContent().catch(() => "");
      const label = title || ariaLabel || (text || "").trim();
      if (label) {
        audit.leftSidebar.push(label.substring(0, 100));
        console.log(`  ${label.substring(0, 80)}`);
      }
    }

    // ═══════════════════════════════════════════
    // 5. RIGHT SIDEBAR ICONS
    // ═══════════════════════════════════════════
    console.log("\nRight sidebar:");
    const rightIcons = await page.locator(".os-right-panel button, [class*='right-panel'] button, [class*='toolbar-right'] button").all();
    for (const icon of rightIcons) {
      const title = await icon.getAttribute("title").catch(() => "");
      const text = await icon.textContent().catch(() => "");
      if (title || (text && text.trim())) {
        audit.rightSidebar.push((title || text || "").trim().substring(0, 100));
        console.log(`  ${(title || text || "").trim().substring(0, 80)}`);
      }
    }

    // ═══════════════════════════════════════════
    // 6. BOTTOM TAB BAR
    // ═══════════════════════════════════════════
    console.log("\nBottom tabs:");
    const tabs = await page.locator("[class*='tab-bar'] button, [class*='tab-list'] button, .os-tabs button").all();
    for (const tab of tabs) {
      const text = await tab.textContent().catch(() => "");
      if (text && text.trim()) {
        audit.bottomTabs.push(text.trim());
        console.log(`  ${text.trim()}`);
      }
    }

    // ═══════════════════════════════════════════
    // 7. SKETCH TOOLBAR — enter sketch mode and capture those tools
    // ═══════════════════════════════════════════
    console.log("\nTrying to enter sketch mode...");
    const sketchBtn = page.locator('[command-id="newSketch"]');
    if (await sketchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sketchBtn.click();
      await page.waitForTimeout(1000);

      // Click on a plane to start the sketch
      const topPlane = page.locator('text=Top').first();
      if (await topPlane.isVisible({ timeout: 2000 }).catch(() => false)) {
        await topPlane.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: "test-results/onshape-sketch-toolbar.png" });

      // Capture sketch tools
      const sketchTools = await page.locator(".tool.is-activatable").all();
      console.log(`\nSketch toolbar: ${sketchTools.length} buttons`);

      audit.sketchToolbar = [];
      for (const tool of sketchTools) {
        const cmdId = await tool.getAttribute("command-id").catch(() => "");
        const title = await tool.getAttribute("data-bs-original-title").catch(() => "");
        const desc = await tool.getAttribute("data-bs-expanded-content").catch(() => "");
        if (cmdId) {
          audit.sketchToolbar.push({
            commandId: cmdId,
            title: (title || "").trim(),
            description: (desc || "").replace(/<[^>]*>/g, "").substring(0, 300),
          });
          console.log(`  ${cmdId}: ${title}`);
        }
      }

      // Exit sketch
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1000);
    }

    // ═══════════════════════════════════════════
    // 8. SAVE FULL AUDIT REPORT
    // ═══════════════════════════════════════════
    const report = JSON.stringify(audit, null, 2);
    fs.writeFileSync("test-results/onshape-full-audit.json", report);
    fs.writeFileSync("research/ONSHAPE_UI_AUDIT.json", report);

    // Also save as markdown
    let md = "# Onshape UI Audit — Complete Button & Feature Inventory\n\n";
    md += `Generated: ${new Date().toISOString()}\n\n`;

    md += "## Main Toolbar Buttons\n\n";
    md += "| # | Command ID | Title | Description |\n|---|---|---|---|\n";
    for (const btn of audit.toolbar) {
      md += `| ${btn.index} | \`${btn.commandId}\` | ${btn.title} | ${btn.description.substring(0, 120)} |\n`;
    }

    if (audit.dropdowns.length > 0) {
      md += "\n## Dropdown Menus\n\n";
      for (const dd of audit.dropdowns) {
        md += `### Dropdown ${dd.index}\n`;
        for (const item of dd.items) {
          md += `- ${item}\n`;
        }
        md += "\n";
      }
    }

    if (audit.sketchToolbar?.length > 0) {
      md += "## Sketch Toolbar\n\n";
      md += "| Command ID | Title | Description |\n|---|---|---|\n";
      for (const tool of audit.sketchToolbar) {
        md += `| \`${tool.commandId}\` | ${tool.title} | ${tool.description.substring(0, 120)} |\n`;
      }
    }

    md += "\n## Feature Tree\n\n";
    for (const item of audit.featureTree) {
      md += `- ${item}\n`;
    }

    md += "\n## Left Sidebar\n\n";
    for (const item of audit.leftSidebar) {
      md += `- ${item}\n`;
    }

    md += "\n## Right Sidebar\n\n";
    for (const item of audit.rightSidebar) {
      md += `- ${item}\n`;
    }

    md += "\n## Bottom Tabs\n\n";
    for (const item of audit.bottomTabs) {
      md += `- ${item}\n`;
    }

    fs.writeFileSync("research/ONSHAPE_UI_AUDIT.md", md);
    console.log("\n✅ Audit saved to research/ONSHAPE_UI_AUDIT.md and research/ONSHAPE_UI_AUDIT.json");
  });
});
