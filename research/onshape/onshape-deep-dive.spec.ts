/**
 * Onshape Deep Dive — Part Studio & Assembly Tools
 *
 * Second pass: Navigate into an actual Part Studio tab to capture
 * all CAD modeling tools, sketch tools, feature dialogs, and menus.
 */

import { test, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://cad.onshape.com";
const OUTPUT_DIR = path.resolve(__dirname);
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, "screenshots");
const DOM_DIR = path.join(OUTPUT_DIR, "dom");

const EMAIL = process.env.ONSHAPE_EMAIL || "stesfaye4@student.gsu.edu";
const PASSWORD = process.env.ONSHAPE_PASSWORD || "Sin06251994";

function saveReport(filename: string, data: any) {
  const dir = path.dirname(path.join(OUTPUT_DIR, filename));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(data, null, 2));
  console.log(`  -> Saved: ${filename}`);
}

function saveDom(filename: string, html: string) {
  fs.writeFileSync(path.join(DOM_DIR, filename), html);
  console.log(`  -> Saved DOM: ${filename}`);
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: true });
  console.log(`  -> Screenshot: ${name}`);
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  const emailInput = page.locator('input[name="username"]').first();
  await emailInput.fill(EMAIL);

  const continueBtn = page.locator('button:has-text("Continue")').first();
  if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await continueBtn.click();
    await page.waitForTimeout(3000);
  }

  const passwordInput = page.locator('input[type="password"]').first();
  if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await passwordInput.fill(PASSWORD);
  }

  const signInBtn = page.locator('button:has-text("Sign in"), button[type="submit"]').first();
  await signInBtn.click();
  await page.waitForTimeout(10000);
  console.log(`  Logged in. URL: ${page.url()}`);
}

test("Onshape Deep Dive — Part Studio Tools", async ({ browser }) => {
  test.setTimeout(600000);

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // ============ LOGIN ============
  console.log("\n=== LOGIN ===");
  await login(page);

  // ============ NAVIGATE TO QUICKSTART DOC ============
  console.log("\n=== OPEN QUICKSTART DOC ===");
  // The Quickstart doc URL from the first run
  await page.goto(
    "https://cad.onshape.com/documents/77fc2d775aa51fdf2220efd9/w/f8749b028c9091d1278de6f2/e/091ee274b01614a5ece78dbb",
    { waitUntil: "domcontentloaded", timeout: 60000 }
  );
  await page.waitForTimeout(12000);
  await screenshot(page, "20-quickstart-loaded.png");

  // ============ CLICK "BASE PARTS" TAB (Part Studio) ============
  console.log("\n=== CLICK PART STUDIO TAB ===");

  // The tabs at bottom showed: Quickstart, MAIN ASSEMBLY, JAW SUBASSEMBLY, BASE SUBASSEMBLY, BASE PARTS, JAW PARTS, SPINDLE PARTS, DRAWING
  const basePartsTab = page.locator('.os-tab-name:has-text("BASE PARTS"), .os-tab-bar-tab:has-text("BASE PARTS")').first();
  if (await basePartsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("  Found BASE PARTS tab, clicking...");
    await basePartsTab.click();
    await page.waitForTimeout(10000);
  } else {
    // Try any Part Studio tab
    console.log("  BASE PARTS not found, trying other Part Studio tabs...");
    const tabTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.os-tab-name, .os-tab-bar-tab'))
        .map(el => (el as HTMLElement).innerText?.trim())
        .filter(Boolean);
    });
    console.log(`  Available tabs: ${tabTexts.join(", ")}`);

    // Click the first non-assembly, non-drawing tab
    for (const tabName of tabTexts) {
      if (tabName.includes("PARTS") || tabName.includes("Part")) {
        const tab = page.locator(`.os-tab-name:has-text("${tabName}"), .os-tab-bar-tab:has-text("${tabName}")`).first();
        if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`  Clicking tab: ${tabName}`);
          await tab.click();
          await page.waitForTimeout(10000);
          break;
        }
      }
    }
  }

  await screenshot(page, "21-part-studio.png");
  saveDom("05-part-studio.html", await page.content());

  // ============ CAPTURE TOOLBAR WITH ACTUAL TOOL NAMES ============
  console.log("\n=== PART STUDIO TOOLBAR ===");

  // Onshape uses a custom toolbar system — grab ALL interactive elements
  // The toolbar tools have data-automation attributes and tooltip/titles
  const allToolbarTools = await page.evaluate(() => {
    const tools: any[] = [];

    // Method 1: Look for toolbar buttons with specific attributes
    document.querySelectorAll('[data-automation], [class*="os-toolbar"] *, [class*="tool-button"], .os-toolbar-button').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        tools.push({
          text: (el as HTMLElement).innerText?.trim().substring(0, 100),
          title: el.getAttribute("title"),
          ariaLabel: el.getAttribute("aria-label"),
          dataAutomation: el.getAttribute("data-automation"),
          classes: el.className?.toString().substring(0, 200),
          tag: el.tagName,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        });
      }
    });

    // Method 2: Look for SVG icons that are clickable (buttons with SVG children)
    document.querySelectorAll("button svg, [role='button'] svg").forEach(svg => {
      const parent = svg.closest("button, [role='button']") as HTMLElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        if (rect.width > 10 && rect.y < 100) { // top toolbar area
          tools.push({
            text: parent.innerText?.trim(),
            title: parent.getAttribute("title"),
            ariaLabel: parent.getAttribute("aria-label"),
            classes: parent.className?.toString().substring(0, 200),
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            source: "svg-button",
          });
        }
      }
    });

    return tools;
  });
  saveReport("deep-dive/toolbar-tools-raw.json", allToolbarTools);

  // ============ ONSHAPE'S API-DRIVEN TOOLBAR ============
  console.log("\n=== API-DRIVEN TOOLBAR DATA ===");

  // Onshape loads toolbar definitions from /api/v13/toolbar/tools — let's check if it's in the page state
  const toolbarApiData = await page.evaluate(() => {
    // Check Angular scope/service data
    const w = window as any;
    const result: any = {};

    // Try to access Angular's injector
    try {
      const rootEl = document.querySelector("[ng-app], [data-ng-app], .ng-scope") as any;
      if (rootEl) {
        const scope = (window as any).angular?.element(rootEl)?.scope?.();
        if (scope) result.angularScope = "found";
      }
    } catch {}

    // Check for toolbar-related data in the DOM
    const toolbarElements = document.querySelectorAll(
      '.os-toolbar-button, .os-toolbar-group, [class*="toolbar-tool"], [class*="lui-toolbar"]'
    );
    const toolbarInfo: any[] = [];
    toolbarElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        toolbarInfo.push({
          classes: el.className?.toString().substring(0, 200),
          text: (el as HTMLElement).innerText?.trim().substring(0, 100),
          title: el.getAttribute("title"),
          id: el.id,
          tag: el.tagName,
          children: el.children.length,
          allAttrs: Array.from(el.attributes).map(a => `${a.name}=${a.value.substring(0, 80)}`),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y) },
        });
      }
    });
    result.toolbarElements = toolbarInfo;

    return result;
  });
  saveReport("deep-dive/toolbar-api-data.json", toolbarApiData);

  // ============ USE THE SEARCH TOOLS SHORTCUT ============
  console.log("\n=== TOOL SEARCH (⌥C) ===");

  // Onshape has a "Search tools" feature accessible via alt+c
  await page.keyboard.press("Alt+c");
  await page.waitForTimeout(2000);
  await screenshot(page, "22-tool-search.png");

  // Check if a search dialog opened
  const searchInput = page.locator('input[placeholder*="Search" i], input[class*="search" i], input[type="search"]').first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("  Tool search opened!");

    // Search for common CAD tools to discover what's available
    const searchTerms = [
      "Extrude", "Revolve", "Sweep", "Loft", "Sketch",
      "Fillet", "Chamfer", "Shell", "Draft", "Boolean",
      "Pattern", "Mirror", "Hole", "Split", "Thicken",
      "Helix", "Plane", "Offset", "Rib", "Sheet Metal",
      "Line", "Circle", "Arc", "Rectangle", "Spline",
      "Dimension", "Constraint", "Mate",
    ];

    const searchResults: any = {};
    for (const term of searchTerms) {
      await searchInput.fill(term);
      await page.waitForTimeout(800);

      const results = await page.evaluate(() => {
        const items: any[] = [];
        document.querySelectorAll(
          '[class*="search-result"], [class*="autocomplete"] li, [class*="dropdown-item"], [class*="command-palette"] *, [class*="search"] [class*="item"]'
        ).forEach(el => {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length > 0 && text.length < 200) {
            items.push({
              text,
              classes: el.className?.toString().substring(0, 150),
            });
          }
        });
        return items;
      });

      if (results.length > 0) {
        searchResults[term] = results;
      }

      await searchInput.clear();
    }
    saveReport("deep-dive/tool-search-results.json", searchResults);
    console.log(`  Found results for ${Object.keys(searchResults).length} search terms`);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // ============ RIGHT-CLICK ON FEATURE TREE ============
  console.log("\n=== FEATURE TREE DEEP INSPECTION ===");

  // Inspect the left panel (feature list)
  const leftPanel = await page.evaluate(() => {
    // Look for the feature list panel
    const panels = document.querySelectorAll(
      '.os-feature-list, [class*="feature-list"], [class*="left-panel"], [class*="model-panel"], [class*="FeatureList"]'
    );
    const result: any[] = [];
    panels.forEach(p => {
      const rect = p.getBoundingClientRect();
      result.push({
        classes: p.className?.toString().substring(0, 300),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        text: (p as HTMLElement).innerText?.trim().substring(0, 2000),
        children: Array.from(p.children).map(c => ({
          tag: c.tagName,
          classes: c.className?.toString().substring(0, 200),
          text: (c as HTMLElement).innerText?.trim().substring(0, 200),
        })),
      });
    });
    return result;
  });
  saveReport("deep-dive/feature-list-panel.json", leftPanel);

  // ============ OPEN ALL MENUS IN THE PART STUDIO ============
  console.log("\n=== PART STUDIO MENUS ===");

  // In Part Studio, the menus are different from the document level
  const menuBar = await page.evaluate(() => {
    const menuItems: any[] = [];
    document.querySelectorAll('[role="menuitem"], [role="menubar"] > *, .os-menu-item, [class*="menu-bar"] > *').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.y < 50) {
        menuItems.push({
          text: (el as HTMLElement).innerText?.trim().substring(0, 50),
          classes: el.className?.toString().substring(0, 200),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y) },
        });
      }
    });
    return menuItems;
  });
  saveReport("deep-dive/menu-bar.json", menuBar);

  // Click on the first dropdown (usually "hamburger" or document name)
  for (const menuText of ["Onshape EDU", "File", "Edit", "View", "Insert", "Measure", "Help"]) {
    const menuItem = page.locator(
      `[role="menuitem"]:has-text("${menuText}"), .os-menu-item:has-text("${menuText}")`
    ).first();

    if (await menuItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log(`  Opening menu: ${menuText}`);
      await menuItem.click();
      await page.waitForTimeout(1500);
      await screenshot(page, `23-ps-menu-${menuText.toLowerCase().replace(/\s/g, "-")}.png`);

      const items = await page.evaluate(() => {
        const result: any[] = [];
        document.querySelectorAll(
          '[role="menu"] [role="menuitem"], .dropdown-menu .dropdown-item, [class*="menu-popup"] [class*="item"]'
        ).forEach(el => {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length > 0 && text.length < 200 && (el as HTMLElement).offsetParent !== null) {
            result.push({
              text,
              shortcut: el.querySelector('[class*="shortcut"], [class*="hotkey"]')?.textContent?.trim(),
              disabled: el.getAttribute("aria-disabled") === "true" || el.classList.contains("disabled"),
              classes: el.className?.toString().substring(0, 150),
            });
          }
        });
        return result;
      });

      saveReport(`deep-dive/menu-${menuText.toLowerCase().replace(/\s/g, "-")}.json`, items);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  }

  // ============ ASSEMBLY TAB TOOLS ============
  console.log("\n=== ASSEMBLY TAB ===");

  const mainAssemblyTab = page.locator('.os-tab-name:has-text("MAIN ASSEMBLY"), .os-tab-bar-tab:has-text("MAIN ASSEMBLY")').first();
  if (await mainAssemblyTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mainAssemblyTab.click();
    await page.waitForTimeout(10000);
    await screenshot(page, "24-assembly-tab.png");

    // Capture assembly toolbar
    const assemblyToolbar = await page.evaluate(() => {
      const tools: any[] = [];
      // Get ALL visible elements in the toolbar area (top ~80px)
      document.querySelectorAll("*").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.y >= 30 && rect.y <= 80 && rect.width > 15 && rect.width < 200 && rect.height > 15 && rect.height < 50) {
          const text = (el as HTMLElement).innerText?.trim();
          const title = el.getAttribute("title");
          const ariaLabel = el.getAttribute("aria-label");
          if (text || title || ariaLabel) {
            tools.push({
              text: text?.substring(0, 100),
              title,
              ariaLabel,
              tag: el.tagName,
              classes: el.className?.toString().substring(0, 150),
              rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            });
          }
        }
      });
      return tools;
    });
    saveReport("deep-dive/assembly-toolbar.json", assemblyToolbar);

    // Assembly-specific menus
    await page.keyboard.press("Alt+c");
    await page.waitForTimeout(2000);
    const asmSearch = page.locator('input[placeholder*="Search" i], input[type="search"]').first();
    if (await asmSearch.isVisible({ timeout: 2000 }).catch(() => false)) {
      const assemblyTerms = ["Mate", "Fasten", "Insert", "Exploded", "Section", "Pattern", "Replicate"];
      const asmResults: any = {};
      for (const term of assemblyTerms) {
        await asmSearch.fill(term);
        await page.waitForTimeout(800);
        const results = await page.evaluate(() => {
          const items: any[] = [];
          document.querySelectorAll('[class*="search-result"], [class*="item"]').forEach(el => {
            const text = (el as HTMLElement).innerText?.trim();
            if (text && text.length > 0 && text.length < 200) {
              items.push(text);
            }
          });
          return [...new Set(items)].slice(0, 20);
        });
        if (results.length > 0) asmResults[term] = results;
        await asmSearch.clear();
      }
      saveReport("deep-dive/assembly-search-results.json", asmResults);
      await page.keyboard.press("Escape");
    }
  }

  // ============ DRAWING TAB ============
  console.log("\n=== DRAWING TAB ===");

  const drawingTab = page.locator('.os-tab-name:has-text("DRAWING"), .os-tab-bar-tab:has-text("DRAWING")').first();
  if (await drawingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await drawingTab.click();
    await page.waitForTimeout(10000);
    await screenshot(page, "25-drawing-tab.png");
    saveDom("06-drawing-tab.html", await page.content());

    const drawingTools = await page.evaluate(() => {
      const tools: any[] = [];
      document.querySelectorAll("*").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.y >= 30 && rect.y <= 80 && rect.width > 15 && rect.width < 200 && rect.height > 15 && rect.height < 50) {
          const text = (el as HTMLElement).innerText?.trim();
          const title = el.getAttribute("title");
          const ariaLabel = el.getAttribute("aria-label");
          if (text || title || ariaLabel) {
            tools.push({
              text: text?.substring(0, 100),
              title,
              ariaLabel,
              tag: el.tagName,
              classes: el.className?.toString().substring(0, 150),
            });
          }
        }
      });
      return tools;
    });
    saveReport("deep-dive/drawing-toolbar.json", drawingTools);
  }

  // ============ CAPTURE ALL CSS CLASSES (design system analysis) ============
  console.log("\n=== CSS CLASS ANALYSIS ===");

  // Go back to Part Studio
  const partsTab = page.locator('.os-tab-name:has-text("BASE PARTS")').first();
  if (await partsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await partsTab.click();
    await page.waitForTimeout(8000);
  }

  const cssAnalysis = await page.evaluate(() => {
    const classPrefix: Record<string, number> = {};
    document.querySelectorAll("*").forEach(el => {
      if (el.className && typeof el.className === "string") {
        el.className.split(/\s+/).forEach(cls => {
          // Extract prefix (e.g., "os-" from "os-toolbar-button")
          const match = cls.match(/^([a-z]+-)/);
          if (match) {
            classPrefix[match[1]] = (classPrefix[match[1]] || 0) + 1;
          }
        });
      }
    });

    // Get all stylesheets
    const sheets: any[] = [];
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        sheets.push({
          href: sheet.href?.substring(0, 200),
          rulesCount: sheet.cssRules?.length || 0,
          media: sheet.media?.mediaText,
        });
      } catch {}
    }

    return { classPrefixes: classPrefix, stylesheets: sheets };
  });
  saveReport("deep-dive/css-analysis.json", cssAnalysis);

  // ============ FINAL COMPREHENSIVE ELEMENT DUMP ============
  console.log("\n=== COMPREHENSIVE ELEMENT DUMP ===");

  // Get every single visible element with useful attributes
  const comprehensiveDump = await page.evaluate(() => {
    const elements: any[] = [];
    const seen = new Set<string>();

    document.querySelectorAll("*").forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) return;

      const text = (el as HTMLElement).innerText?.trim();
      const title = el.getAttribute("title");
      const ariaLabel = el.getAttribute("aria-label");
      const dataAutomation = el.getAttribute("data-automation");
      const role = el.getAttribute("role");

      // Only include elements with meaningful identifiers
      if (!text && !title && !ariaLabel && !dataAutomation && !role) return;

      const key = `${el.tagName}-${Math.round(rect.x)}-${Math.round(rect.y)}`;
      if (seen.has(key)) return;
      seen.add(key);

      elements.push({
        tag: el.tagName,
        text: text?.substring(0, 150),
        title,
        ariaLabel,
        role,
        dataAutomation,
        classes: el.className?.toString().substring(0, 200),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      });
    });

    return elements;
  });
  saveReport("deep-dive/comprehensive-elements.json", comprehensiveDump);
  console.log(`  ${comprehensiveDump.length} unique visible elements with identifiers`);

  // ============ FINAL SCREENSHOT ============
  await screenshot(page, "99-deep-dive-final.png");

  console.log("\n=== DEEP DIVE COMPLETE ===\n");
  await context.close();
});
