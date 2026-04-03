/**
 * Onshape Research & Documentation Script
 *
 * Academic research into Onshape's CAD interface design patterns,
 * UI architecture, feature tools, and interaction models.
 */

import { test, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://cad.onshape.com";
const DOCS_URL = `${BASE_URL}/documents?resourceType=resourceuserowner&nodeId=69cce7763e7e891881454c81`;
const OUTPUT_DIR = path.resolve(__dirname);
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, "screenshots");
const NETWORK_DIR = path.join(OUTPUT_DIR, "network");
const DOM_DIR = path.join(OUTPUT_DIR, "dom");

const EMAIL = process.env.ONSHAPE_EMAIL || "stesfaye4@student.gsu.edu";
const PASSWORD = process.env.ONSHAPE_PASSWORD || "Sin06251994";

interface NetworkEntry {
  url: string;
  method: string;
  resourceType: string;
  status?: number;
  contentType?: string;
  timestamp: number;
}

const networkLog: NetworkEntry[] = [];

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

async function waitForPageReady(page: Page, timeout = 15000) {
  await page.waitForTimeout(3000);
  try {
    await page.waitForLoadState("domcontentloaded", { timeout });
  } catch { /* ok */ }
}

test("Onshape Full Research Session", async ({ browser }) => {
  test.setTimeout(600000); // 10 minutes

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Network logging
  page.on("request", (request) => {
    networkLog.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      timestamp: Date.now(),
    });
  });
  page.on("response", (response) => {
    const entry = networkLog.find((e) => e.url === response.url() && !e.status);
    if (entry) {
      entry.status = response.status();
      entry.contentType = response.headers()["content-type"] || "unknown";
    }
  });

  // ============================================================
  // PHASE 1: LOGIN
  // ============================================================
  console.log("\n=== PHASE 1: LOGIN ===");

  // Go to the sign-in page directly
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  await screenshot(page, "01-signin-page-initial.png");

  // Check current URL to understand the login flow
  console.log(`  Current URL after goto /signin: ${page.url()}`);
  saveDom("01-signin-page.html", await page.content());

  // Onshape may redirect to their identity provider
  // Look for any form or input on the page
  const pageText = await page.evaluate(() => document.body?.innerText?.substring(0, 2000) || "");
  console.log(`  Page text preview: ${pageText.substring(0, 300)}`);

  // Try multiple selectors for email input
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[id*="email" i]',
    'input[id*="user" i]',
    'input[name="username"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email"]',
    '#os-signin-email',
    'input[type="text"]',
    'input:not([type="hidden"]):not([type="password"])',
  ];

  let emailFound = false;
  for (const sel of emailSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`  Found email input with selector: ${sel}`);
      await el.fill(EMAIL);
      emailFound = true;
      break;
    }
  }

  if (!emailFound) {
    // Maybe it's an OAuth page or SSO — take screenshot and dump all inputs
    console.log("  Email input not found. Dumping all visible inputs...");
    const allInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input")).map((inp) => ({
        type: inp.type,
        name: inp.name,
        id: inp.id,
        placeholder: inp.placeholder,
        visible: inp.offsetParent !== null,
        classes: inp.className,
        value: inp.type !== "password" ? inp.value : "***",
      }));
    });
    saveReport("debug-inputs-signin.json", allInputs);

    const allLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a")).map((a) => ({
        text: a.innerText?.trim().substring(0, 100),
        href: a.href,
      }))
    );
    saveReport("debug-links-signin.json", allLinks);

    // Try going to the Onshape sign-in URL with different paths
    const signinUrls = [
      `${BASE_URL}/signin`,
      `${BASE_URL}/signin?redirectOnshapeUri=%2Fdocuments`,
      "https://oauth.onshape.com/signin",
      "https://cad.onshape.com/signin#",
    ];

    for (const url of signinUrls) {
      console.log(`  Trying: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(5000);
      console.log(`  -> Landed on: ${page.url()}`);

      const hasInput = await page.locator("input:not([type='hidden'])").first()
        .isVisible({ timeout: 3000 }).catch(() => false);
      if (hasInput) {
        console.log("  Found inputs on this page!");
        await screenshot(page, `01-signin-found-${signinUrls.indexOf(url)}.png`);

        // Try filling
        for (const sel of emailSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
            await el.fill(EMAIL);
            emailFound = true;
            console.log(`  Filled email with: ${sel}`);
            break;
          }
        }
        if (emailFound) break;
      }
    }
  }

  await screenshot(page, "02-email-filled.png");

  // Now handle password
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    '#os-signin-password',
  ];

  let passwordVisible = false;
  for (const sel of passwordSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(PASSWORD);
      passwordVisible = true;
      console.log(`  Filled password with: ${sel}`);
      break;
    }
  }

  if (!passwordVisible) {
    // May need to click "Next" first for two-step login
    const nextSelectors = [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button[type="submit"]',
      'input[type="submit"]',
    ];
    for (const sel of nextSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`  Clicking next/submit: ${sel}`);
        await btn.click();
        await page.waitForTimeout(3000);
        break;
      }
    }

    await screenshot(page, "02b-after-next.png");

    // Try password again
    for (const sel of passwordSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
        await el.fill(PASSWORD);
        passwordVisible = true;
        break;
      }
    }
  }

  await screenshot(page, "03-credentials-filled.png");

  // Click sign-in
  const submitSelectors = [
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Sign In")',
    'button:has-text("Log In")',
    '#os-signin-submit',
    'button[type="submit"]',
    'input[type="submit"]',
  ];

  for (const sel of submitSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log(`  Clicking submit: ${sel}`);
      await btn.click();
      break;
    }
  }

  // Wait for post-login navigation
  await page.waitForTimeout(10000);
  console.log(`  Post-login URL: ${page.url()}`);
  await screenshot(page, "04-post-login.png");
  saveDom("02-post-login.html", await page.content());

  // ============================================================
  // PHASE 2: DOCUMENTS PAGE
  // ============================================================
  console.log("\n=== PHASE 2: DOCUMENTS PAGE ===");

  await page.goto(DOCS_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);
  console.log(`  Documents URL: ${page.url()}`);
  await screenshot(page, "05-documents-page.png");
  saveDom("03-documents-page.html", await page.content());

  // Extract all visible text and structure
  const pageStructure = await page.evaluate(() => {
    const extractTree = (el: Element, depth: number): any => {
      if (depth > 4) return null;
      const children = Array.from(el.children)
        .filter((c) => {
          const r = c.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .slice(0, 20)
        .map((c) => extractTree(c, depth + 1))
        .filter(Boolean);

      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classes: el.className?.toString().substring(0, 200) || undefined,
        role: el.getAttribute("role") || undefined,
        text: el.children.length === 0 ? (el as HTMLElement).innerText?.trim().substring(0, 100) : undefined,
        rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
        children: children.length > 0 ? children : undefined,
      };
    };
    return extractTree(document.body, 0);
  });
  saveReport("page-structure.json", pageStructure);

  // Navigation sidebar
  const navElements = await page.evaluate(() => {
    const items: any[] = [];
    document.querySelectorAll("a, button, [role='button'], [role='tab'], [role='menuitem']").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        items.push({
          tag: el.tagName,
          text: (el as HTMLElement).innerText?.trim().substring(0, 150),
          href: (el as HTMLAnchorElement).href || undefined,
          role: el.getAttribute("role"),
          title: el.getAttribute("title"),
          ariaLabel: el.getAttribute("aria-label"),
          classes: el.className?.toString().substring(0, 200),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        });
      }
    });
    return items;
  });
  saveReport("all-interactive-elements.json", navElements);

  // CSS Design tokens
  const designTokens = await page.evaluate(() => {
    const tokens: Record<string, string> = {};
    const styles = getComputedStyle(document.documentElement);
    for (let i = 0; i < styles.length; i++) {
      if (styles[i].startsWith("--")) {
        tokens[styles[i]] = styles.getPropertyValue(styles[i]).trim();
      }
    }
    return tokens;
  });
  saveReport("design-tokens.json", designTokens);

  // ============================================================
  // PHASE 3: OPEN A DOCUMENT (CAD WORKSPACE)
  // ============================================================
  console.log("\n=== PHASE 3: CAD WORKSPACE ===");

  // Find clickable document entries
  const docLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href*='/documents/']"))
      .slice(0, 10)
      .map((a) => ({
        text: (a as HTMLElement).innerText?.trim().substring(0, 100),
        href: (a as HTMLAnchorElement).href,
      }));
  });
  saveReport("document-links.json", docLinks);
  console.log(`  Found ${docLinks.length} document links`);

  if (docLinks.length > 0) {
    console.log(`  Opening: ${docLinks[0].text} -> ${docLinks[0].href}`);
    await page.goto(docLinks[0].href, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(15000); // CAD workspace needs time to load WebGL
    await screenshot(page, "06-cad-workspace.png");
    saveDom("04-cad-workspace.html", await page.content());
  } else {
    // Try clicking on any document-looking element
    console.log("  No <a> links found, trying click-based approach...");
    const clickableDoc = page.locator('[class*="document"], [class*="Document"], [data-document], tr').first();
    if (await clickableDoc.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableDoc.dblclick();
      await page.waitForTimeout(15000);
      await screenshot(page, "06-cad-workspace-alt.png");
      saveDom("04-cad-workspace.html", await page.content());
    }
  }

  // ============================================================
  // PHASE 4: DOCUMENT TOOLBARS & TOOLS
  // ============================================================
  console.log("\n=== PHASE 4: TOOLBARS & TOOLS ===");

  const toolbarData = await page.evaluate(() => {
    const result: any = { toolbars: [], allButtons: [] };

    // All toolbar areas
    document.querySelectorAll('[class*="toolbar" i], [role="toolbar"], [class*="tool-bar" i], [class*="ribbon" i]').forEach((tb) => {
      const rect = tb.getBoundingClientRect();
      const buttons: any[] = [];
      tb.querySelectorAll("button, [role='button']").forEach((btn) => {
        buttons.push({
          text: (btn as HTMLElement).innerText?.trim().substring(0, 80),
          title: btn.getAttribute("title"),
          ariaLabel: btn.getAttribute("aria-label"),
          classes: btn.className?.toString().substring(0, 150),
          dataAttrs: Array.from(btn.attributes)
            .filter((a) => a.name.startsWith("data-"))
            .map((a) => `${a.name}=${a.value}`),
        });
      });
      result.toolbars.push({
        classes: tb.className?.toString().substring(0, 200),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        buttons,
      });
    });

    // All buttons on the page (for completeness)
    document.querySelectorAll("button, [role='button']").forEach((btn) => {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        result.allButtons.push({
          text: (btn as HTMLElement).innerText?.trim().substring(0, 80),
          title: btn.getAttribute("title"),
          ariaLabel: btn.getAttribute("aria-label"),
          classes: btn.className?.toString().substring(0, 150),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        });
      }
    });

    return result;
  });
  saveReport("toolbars.json", toolbarData);
  console.log(`  Found ${toolbarData.toolbars.length} toolbars, ${toolbarData.allButtons.length} buttons`);

  // ============================================================
  // PHASE 5: FEATURE TREE
  // ============================================================
  console.log("\n=== PHASE 5: FEATURE TREE ===");

  const featureTree = await page.evaluate(() => {
    const items: any[] = [];
    // Onshape uses various selectors for the feature list
    const selectors = [
      '[class*="feature" i]', '[class*="Feature"]',
      '[class*="tree-item" i]', '[class*="model-tree" i]',
      '[class*="part-list" i]', '[class*="PartList"]',
      'li[class*="node"]', '[data-feature]',
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          items.push({
            selector: sel,
            text: (el as HTMLElement).innerText?.trim().substring(0, 200),
            classes: el.className?.toString().substring(0, 200),
            tag: el.tagName,
            id: el.id,
            dataAttrs: Array.from(el.attributes)
              .filter((a) => a.name.startsWith("data-"))
              .map((a) => `${a.name}=${a.value.substring(0, 100)}`),
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          });
        }
      });
    }
    return items;
  });
  saveReport("feature-tree.json", featureTree);
  console.log(`  Found ${featureTree.length} feature tree items`);

  // ============================================================
  // PHASE 6: TABS (Part Studio, Assembly, Drawing)
  // ============================================================
  console.log("\n=== PHASE 6: WORKSPACE TABS ===");

  const tabs = await page.evaluate(() => {
    const tabItems: any[] = [];
    document.querySelectorAll('[role="tab"], [class*="tab" i]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 20 && rect.height > 10) {
        tabItems.push({
          text: (el as HTMLElement).innerText?.trim().substring(0, 100),
          classes: el.className?.toString().substring(0, 200),
          selected: el.getAttribute("aria-selected") === "true" || el.classList.contains("active"),
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        });
      }
    });
    return tabItems;
  });
  saveReport("workspace-tabs.json", tabs);
  console.log(`  Found ${tabs.length} tabs`);

  // Click through each tab type if we see them
  for (const tabType of ["Assembly", "Drawing"]) {
    const tab = page.locator(`[role="tab"]:has-text("${tabType}"), [class*="tab"]:has-text("${tabType}")`).first();
    if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`  Clicking tab: ${tabType}`);
      await tab.click();
      await page.waitForTimeout(5000);
      await screenshot(page, `07-tab-${tabType.toLowerCase()}.png`);

      const tabButtons = await page.evaluate(() =>
        Array.from(document.querySelectorAll("button, [role='button']"))
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .map((el) => ({
            text: (el as HTMLElement).innerText?.trim().substring(0, 80),
            title: el.getAttribute("title"),
            ariaLabel: el.getAttribute("aria-label"),
          }))
      );
      saveReport(`tab-${tabType.toLowerCase()}-tools.json`, tabButtons);
    }
  }

  // Go back to Part Studio tab
  const psTab = page.locator('[role="tab"]:has-text("Part Studio"), [class*="tab"]:has-text("Part")').first();
  if (await psTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await psTab.click();
    await page.waitForTimeout(3000);
  }

  // ============================================================
  // PHASE 7: MENUS (File, Edit, View, Insert, Tools, Help)
  // ============================================================
  console.log("\n=== PHASE 7: MENUS ===");

  const allMenuData: any[] = [];
  for (const menuText of ["File", "Edit", "View", "Insert", "Tools", "Help"]) {
    const menuBtn = page.locator(
      `[role="menuitem"]:has-text("${menuText}"), [class*="menu"]:has-text("${menuText}"), button:has-text("${menuText}")`
    ).first();

    if (await menuBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log(`  Opening menu: ${menuText}`);
      await menuBtn.click();
      await page.waitForTimeout(1500);
      await screenshot(page, `08-menu-${menuText.toLowerCase()}.png`);

      const menuItems = await page.evaluate(() => {
        const items: any[] = [];
        document.querySelectorAll(
          '[role="menu"] [role="menuitem"], [class*="dropdown"] [class*="item"], [class*="menu-popup"] *, [class*="context-menu"] *'
        ).forEach((el) => {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length > 0 && text.length < 200) {
            items.push({
              text,
              shortcut: el.querySelector('[class*="shortcut"]')?.textContent?.trim() || el.getAttribute("data-shortcut"),
              disabled: el.getAttribute("aria-disabled") === "true",
              hasSubmenu: el.getAttribute("aria-haspopup") === "true",
              classes: el.className?.toString().substring(0, 150),
            });
          }
        });
        return items;
      });

      allMenuData.push({ menu: menuText, items: menuItems });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
  }
  saveReport("menus.json", allMenuData);
  console.log(`  Documented ${allMenuData.length} menus`);

  // ============================================================
  // PHASE 8: SKETCH MODE EXPLORATION
  // ============================================================
  console.log("\n=== PHASE 8: SKETCH MODE ===");

  const sketchBtn = page.locator('[title*="Sketch" i], [aria-label*="Sketch" i], button:has-text("Sketch")').first();
  if (await sketchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("  Entering sketch mode...");
    await sketchBtn.click();
    await page.waitForTimeout(3000);

    // May need to select a plane
    const planeSelector = page.locator('[class*="plane" i], :text("Front"), :text("Top"), :text("Right")').first();
    if (await planeSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await planeSelector.click();
      await page.waitForTimeout(2000);
    }

    await screenshot(page, "09-sketch-mode.png");

    const sketchTools = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button, [role='button']"))
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({
          text: (el as HTMLElement).innerText?.trim().substring(0, 80),
          title: el.getAttribute("title"),
          ariaLabel: el.getAttribute("aria-label"),
          classes: el.className?.toString().substring(0, 150),
        }))
    );
    saveReport("sketch-tools.json", sketchTools);

    // Check known sketch tools
    const sketchToolNames = ["Line", "Circle", "Arc", "Rectangle", "Spline", "Point",
      "Polygon", "Ellipse", "Slot", "Mirror", "Offset", "Trim", "Fillet",
      "Chamfer", "Dimension", "Constrain", "Construction"];
    const sketchAvailability = [];
    for (const name of sketchToolNames) {
      const found = sketchTools.some(
        (t) => t.text?.includes(name) || t.title?.includes(name) || t.ariaLabel?.includes(name)
      );
      sketchAvailability.push({ name, found });
    }
    saveReport("sketch-tool-availability.json", sketchAvailability);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);
  }

  // ============================================================
  // PHASE 9: FEATURE TOOLS (Extrude, Revolve, etc.)
  // ============================================================
  console.log("\n=== PHASE 9: FEATURE TOOLS ===");

  const featureNames = ["Extrude", "Revolve", "Sweep", "Loft", "Fillet", "Chamfer",
    "Shell", "Draft", "Boolean", "Pattern", "Mirror", "Hole", "Rib",
    "Split", "Move", "Transform", "Thicken", "Helix", "Plane"];

  const featureAvailability = [];
  for (const name of featureNames) {
    const btn = page.locator(`[title*="${name}" i], [aria-label*="${name}" i], button:has-text("${name}")`).first();
    const visible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
    featureAvailability.push({ name, available: visible });

    if (visible) {
      await btn.click();
      await page.waitForTimeout(2000);
      await screenshot(page, `10-feature-${name.toLowerCase()}.png`);

      // Capture dialog/panel
      const dialog = await page.evaluate(() => {
        const panels = document.querySelectorAll('[role="dialog"], [class*="dialog" i], [class*="panel" i], [class*="property" i]');
        return Array.from(panels).map((p) => ({
          classes: p.className?.toString().substring(0, 200),
          text: (p as HTMLElement).innerText?.trim().substring(0, 1000),
          inputs: Array.from(p.querySelectorAll("input, select, textarea")).map((inp) => ({
            type: (inp as HTMLInputElement).type,
            name: inp.getAttribute("name"),
            placeholder: (inp as HTMLInputElement).placeholder,
            label: inp.getAttribute("aria-label") || inp.closest("label")?.textContent?.trim()?.substring(0, 50),
          })),
        }));
      });
      featureAvailability[featureAvailability.length - 1].dialog = dialog;

      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
  }
  saveReport("feature-tools.json", featureAvailability);
  console.log(`  Feature tools: ${featureAvailability.filter((t) => t.available).length}/${featureNames.length} found`);

  // ============================================================
  // PHASE 10: RIGHT-CLICK CONTEXT MENUS
  // ============================================================
  console.log("\n=== PHASE 10: CONTEXT MENUS ===");

  const canvas = page.locator("canvas").first();
  if (await canvas.isVisible({ timeout: 3000 }).catch(() => false)) {
    await canvas.click({ button: "right", position: { x: 400, y: 300 } });
    await page.waitForTimeout(1500);
    await screenshot(page, "11-context-menu.png");

    const contextMenu = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[class*="context-menu" i] *, [role="menu"] [role="menuitem"]'))
        .map((el) => (el as HTMLElement).innerText?.trim())
        .filter((t) => t && t.length > 0 && t.length < 100)
    );
    saveReport("context-menu.json", contextMenu);
    await page.keyboard.press("Escape");
  }

  // ============================================================
  // PHASE 11: FULL ELEMENT INVENTORY
  // ============================================================
  console.log("\n=== PHASE 11: ELEMENT INVENTORY ===");

  const inventory = await page.evaluate(() => {
    const allEls = document.querySelectorAll("*");
    const roles: Record<string, number> = {};
    const dataAttrs = new Set<string>();
    const customTags = new Set<string>();

    allEls.forEach((el) => {
      const role = el.getAttribute("role");
      if (role) roles[role] = (roles[role] || 0) + 1;
      if (el.tagName.includes("-")) customTags.add(el.tagName.toLowerCase());
      Array.from(el.attributes).forEach((a) => {
        if (a.name.startsWith("data-")) dataAttrs.add(a.name);
      });
    });

    return {
      totalElements: allEls.length,
      buttons: document.querySelectorAll("button, [role='button']").length,
      inputs: document.querySelectorAll("input, textarea, select").length,
      canvases: Array.from(document.querySelectorAll("canvas")).map((c) => ({
        width: c.width, height: c.height, id: c.id, classes: c.className,
      })),
      svgCount: document.querySelectorAll("svg").length,
      iframes: Array.from(document.querySelectorAll("iframe")).map((f) => ({ src: f.src, id: f.id })),
      ariaRoles: roles,
      dataAttributes: Array.from(dataAttrs).sort(),
      customElements: Array.from(customTags).sort(),
      links: document.querySelectorAll("a[href]").length,
    };
  });
  saveReport("element-inventory.json", inventory);
  console.log(`  ${inventory.totalElements} total elements, ${inventory.buttons} buttons, ${inventory.canvases.length} canvases`);

  // ============================================================
  // PHASE 12: THEME & STYLES ANALYSIS
  // ============================================================
  console.log("\n=== PHASE 12: THEME ANALYSIS ===");

  const theme = await page.evaluate(() => {
    const colors = new Set<string>();
    const fonts = new Set<string>();
    const allEls = document.querySelectorAll("*");
    const sample = Math.min(allEls.length, 300);

    for (let i = 0; i < sample; i++) {
      const idx = Math.floor((i * allEls.length) / sample);
      const style = getComputedStyle(allEls[idx]);
      colors.add(style.color);
      colors.add(style.backgroundColor);
      fonts.add(style.fontFamily);
    }

    const computed = getComputedStyle(document.body);
    return {
      bodyBg: computed.backgroundColor,
      bodyColor: computed.color,
      bodyFont: computed.fontFamily,
      fontSize: computed.fontSize,
      uniqueColors: Array.from(colors).filter((c) => c && c !== "rgba(0, 0, 0, 0)"),
      uniqueFonts: Array.from(fonts).filter(Boolean),
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    };
  });
  saveReport("theme-analysis.json", theme);

  // ============================================================
  // PHASE 13: TECH STACK DETECTION
  // ============================================================
  console.log("\n=== PHASE 13: TECH STACK ===");

  const techStack = await page.evaluate(() => {
    const stack: any = { frameworks: [], globals: [], meta: [], scripts: [] };
    const w = window as any;

    if (w.React || w.__REACT_DEVTOOLS_GLOBAL_HOOK__) stack.frameworks.push("React");
    if (w.Vue) stack.frameworks.push("Vue");
    if (w.angular || w.ng) stack.frameworks.push("Angular");
    if (w.jQuery || w.$) stack.frameworks.push("jQuery");
    if (w.__NEXT_DATA__) stack.frameworks.push("Next.js");
    if (w.THREE) stack.frameworks.push("Three.js");
    if (w.WebAssembly) stack.globals.push("WebAssembly");
    if (w.SharedArrayBuffer) stack.globals.push("SharedArrayBuffer");

    const canvas = document.querySelector("canvas");
    if (canvas) {
      try { if (canvas.getContext("webgl2")) stack.frameworks.push("WebGL2"); }
      catch { try { if (canvas.getContext("webgl")) stack.frameworks.push("WebGL"); } catch {} }
    }

    document.querySelectorAll("meta").forEach((m) => {
      if (m.name || m.getAttribute("property"))
        stack.meta.push({ name: m.name || m.getAttribute("property"), content: m.content?.substring(0, 200) });
    });

    document.querySelectorAll("script[src]").forEach((s) => {
      stack.scripts.push((s as HTMLScriptElement).src);
    });

    // Onshape-specific globals
    ["onshape", "OS", "Parasolid", "BREP"].forEach((g) => {
      if (w[g]) stack.globals.push(g);
    });

    return stack;
  });
  saveReport("tech-stack.json", techStack);
  console.log(`  Frameworks: ${techStack.frameworks.join(", ")}`);

  // ============================================================
  // PHASE 14: PERFORMANCE
  // ============================================================
  console.log("\n=== PHASE 14: PERFORMANCE ===");

  const perfData = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource");
    const byType: Record<string, { count: number; size: number }> = {};
    resources.forEach((r: any) => {
      const t = r.initiatorType || "other";
      if (!byType[t]) byType[t] = { count: 0, size: 0 };
      byType[t].count++;
      byType[t].size += r.transferSize || 0;
    });
    return {
      timing: nav ? {
        ttfb: Math.round(nav.responseStart - nav.startTime),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        load: Math.round(nav.loadEventEnd - nav.startTime),
        domInteractive: Math.round(nav.domInteractive - nav.startTime),
      } : null,
      resourceCount: resources.length,
      resourceByType: byType,
      memory: (performance as any).memory ? {
        usedHeap: (performance as any).memory.usedJSHeapSize,
        totalHeap: (performance as any).memory.totalJSHeapSize,
      } : null,
    };
  });
  saveReport("performance.json", perfData);

  // ============================================================
  // PHASE 15: KEYBOARD SHORTCUTS
  // ============================================================
  console.log("\n=== PHASE 15: KEYBOARD SHORTCUTS ===");

  await page.keyboard.press("?");
  await page.waitForTimeout(2000);
  const kbDialog = page.locator('[class*="shortcut" i], [class*="keyboard" i], [role="dialog"]').first();
  if (await kbDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await screenshot(page, "12-keyboard-shortcuts.png");
    const shortcuts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[class*="shortcut"] tr, [class*="shortcut"] li, [class*="keyboard"] li'))
        .map((el) => (el as HTMLElement).innerText?.trim())
        .filter(Boolean)
    );
    saveReport("keyboard-shortcuts.json", shortcuts);
    await page.keyboard.press("Escape");
  }

  // ============================================================
  // PHASE 16: NETWORK ANALYSIS
  // ============================================================
  console.log("\n=== PHASE 16: NETWORK ANALYSIS ===");

  const apiCalls = networkLog.filter((e) => e.url.includes("/api/") || e.resourceType === "xhr" || e.resourceType === "fetch");
  const wsCalls = networkLog.filter((e) => e.url.startsWith("wss://"));
  const staticAssets = networkLog.filter((e) => ["stylesheet", "script", "image", "font"].includes(e.resourceType));

  // Extract unique API endpoints
  const uniqueEndpoints = [...new Set(apiCalls.map((e) => {
    try { const u = new URL(e.url); return `${e.method} ${u.pathname}`; } catch { return e.url; }
  }))].sort();

  saveReport("network/full-log.json", networkLog);
  saveReport("network/api-calls.json", apiCalls);
  saveReport("network/api-endpoints.json", uniqueEndpoints);
  saveReport("network/websockets.json", wsCalls);
  saveReport("network/static-assets.json", staticAssets);
  console.log(`  ${networkLog.length} total requests, ${apiCalls.length} API calls, ${wsCalls.length} WebSocket, ${uniqueEndpoints.length} unique endpoints`);

  // ============================================================
  // FINAL SCREENSHOT & SUMMARY
  // ============================================================
  console.log("\n=== FINAL SUMMARY ===");
  await screenshot(page, "99-final-state.png");

  const jsonFiles = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".json"));
  const screenshotFiles = fs.existsSync(SCREENSHOTS_DIR) ? fs.readdirSync(SCREENSHOTS_DIR) : [];
  const domFiles = fs.existsSync(DOM_DIR) ? fs.readdirSync(DOM_DIR) : [];

  const summary = {
    generatedAt: new Date().toISOString(),
    purpose: "Academic research into Onshape CAD interface design",
    outputs: { jsonReports: jsonFiles, screenshots: screenshotFiles, domSnapshots: domFiles },
    network: {
      totalRequests: networkLog.length,
      apiCalls: apiCalls.length,
      uniqueEndpoints: uniqueEndpoints.length,
      websockets: wsCalls.length,
    },
  };
  saveReport("RESEARCH-SUMMARY.json", summary);

  console.log(`\n  JSON Reports: ${jsonFiles.length}`);
  console.log(`  Screenshots: ${screenshotFiles.length}`);
  console.log(`  DOM Snapshots: ${domFiles.length}`);
  console.log(`  Network Requests: ${networkLog.length}`);
  console.log(`  Unique API Endpoints: ${uniqueEndpoints.length}\n`);

  await context.close();
});
