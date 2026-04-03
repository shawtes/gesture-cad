"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Integrated Terminal — embedded in the CAD app.
 *
 * Features:
 * - Shell command execution via API route
 * - Claude Code integration (run claude commands)
 * - CAD-aware commands (list features, export, etc.)
 * - MCP server access for tool use
 * - Resizable panel
 * - Command history (up/down arrows)
 */

interface TerminalLine {
  type: "input" | "output" | "error" | "system" | "ai";
  text: string;
  timestamp: number;
}

interface IntegratedTerminalProps {
  visible: boolean;
  onToggle: () => void;
  /** Access to CAD state for built-in commands */
  cadState?: {
    entities: any[];
    features: any[];
    activeTool: string;
    sketchPlane: string;
  };
  onCadCommand?: (command: string, args: string[]) => void;
}

// Built-in CAD commands
const CAD_COMMANDS: Record<string, string> = {
  help: "Show available commands",
  "cad.entities": "List all sketch entities",
  "cad.features": "List all features in the tree",
  "cad.tool": "Show/set active tool",
  "cad.plane": "Show/set active sketch plane",
  "cad.export": "Export current model (stl/obj/glb)",
  "cad.clear": "Clear all entities and features",
  "cad.undo": "Undo last action",
  "cad.redo": "Redo last action",
  "cad.screenshot": "Capture viewport screenshot",
  clear: "Clear terminal",
  "claude": "Send prompt to Claude Code CLI (runs claude --print)",
  "ai": "Quick built-in CAD design advice (no API needed)",
  "mcp.tools": "List available MCP tools",
  "mcp.call": "Call an MCP tool",
  "generate": "Generate house from RAG schematics (1bed/2bed/3bed)",
  "ai design": "AI-assisted design with RAG templates (e.g., ai design a 2-bedroom house)",
  "run": "Run inline CAD script commands",
  "rag.search": "Search RAG knowledge base",
  "rag.stats": "Show RAG knowledge base stats",
};

export function IntegratedTerminal({ visible, onToggle, cadState, onCadCommand }: IntegratedTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "system", text: "GestureCAD Terminal v1.0 — Claude Code Integrated", timestamp: Date.now() },
    { type: "system", text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", timestamp: Date.now() },
    { type: "system", text: "'claude <prompt>'  — Ask Claude (has full CAD context)", timestamp: Date.now() },
    { type: "system", text: "'help'             — All commands", timestamp: Date.now() },
    { type: "system", text: "'cad.features'     — List your design", timestamp: Date.now() },
    { type: "system", text: "Ctrl+`             — Toggle terminal", timestamp: Date.now() },
    { type: "system", text: "", timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [height, setHeight] = useState(280);
  const [activeTab, setActiveTab] = useState<"shell" | "ai" | "mcp">("shell");
  // Conversation history for Claude context persistence
  const conversationRef = useRef<{ role: string; text: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input when terminal opens
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  const addLine = useCallback((type: TerminalLine["type"], text: string) => {
    setLines((prev) => [...prev, { type, text, timestamp: Date.now() }]);
  }, []);

  /** Execute a batch of CAD commands from Claude's response */
  const executeCadCommands = useCallback(async (commands: any[]) => {
    for (const cmd of commands) {
      try {
        switch (cmd.action) {
          case "comment":
            addLine("system", `\n  ${cmd.text}`);
            break;

          case "set_plane":
            if (onCadCommand) onCadCommand("SET_PLANE", [cmd.plane]);
            addLine("output", `  ✓ Plane → ${cmd.plane}`);
            break;

          case "set_tool":
            if (onCadCommand) onCadCommand("SET_TOOL", [cmd.tool]);
            addLine("output", `  ✓ Tool → ${cmd.tool}`);
            break;

          case "add_entity":
            // Dispatch entity creation via window event
            window.dispatchEvent(new CustomEvent("gesture-cad-add-entity", {
              detail: { type: cmd.type, params: cmd.params },
            }));
            addLine("output", `  ✓ Added ${cmd.type}: ${JSON.stringify(cmd.params).substring(0, 60)}`);
            break;

          case "extrude_last":
            window.dispatchEvent(new CustomEvent("gesture-cad-auto-extrude", {
              detail: { distance: cmd.distance },
            }));
            addLine("output", `  ✓ Extrude ${cmd.distance}mm`);
            break;

          case "apply_feature":
            window.dispatchEvent(new CustomEvent("gesture-cad-apply-feature", {
              detail: { type: cmd.type, params: cmd.params },
            }));
            addLine("output", `  ✓ Applied ${cmd.type}: ${JSON.stringify(cmd.params).substring(0, 60)}`);
            break;

          case "export":
            handleCommand(`cad.export ${cmd.format || "stl"}`);
            break;

          case "undo":
            if (onCadCommand) onCadCommand("UNDO", []);
            addLine("output", `  ✓ Undo`);
            break;

          case "redo":
            if (onCadCommand) onCadCommand("REDO", []);
            addLine("output", `  ✓ Redo`);
            break;

          default:
            addLine("error", `  ✗ Unknown action: ${cmd.action}`);
        }
        // Small delay between commands so UI updates
        await new Promise((r) => setTimeout(r, 100));
      } catch (e: any) {
        addLine("error", `  ✗ ${cmd.action} failed: ${e.message}`);
      }
    }
  }, [onCadCommand, addLine]);

  const handleCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLine("input", `$ ${trimmed}`);
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Built-in commands
    switch (command) {
      case "help": {
        addLine("system", "═══ Available Commands ═══");
        for (const [cmd, desc] of Object.entries(CAD_COMMANDS)) {
          addLine("system", `  ${cmd.padEnd(20)} ${desc}`);
        }
        addLine("system", "");
        addLine("system", "Shell commands: prefix with '!' (e.g., !ls, !git status)");
        addLine("system", "Claude AI: prefix with 'ai' (e.g., ai design a gear with 20 teeth)");
        return;
      }

      case "clear": {
        setLines([]);
        return;
      }

      // Script execution — inline CAD scripting language
      case "run":
      case "script": {
        const scriptText = args.join(" ");
        if (!scriptText) {
          addLine("system", "Usage: run <script commands>");
          addLine("system", "  run box 2 1 3");
          addLine("system", "  run cylinder 0.5 2");
          addLine("system", "  run polygon 6 1 2");
          addLine("system", "  run fillet 0.1");
          addLine("system", "  run hole 0.5 2");
          addLine("system", "  run pattern linear 3 2 x");
          addLine("system", "  run plane xy");
          addLine("system", "  run shell 0.2");
          addLine("system", "  run export stl");
          return;
        }
        // Dynamic import to avoid circular deps
        import("@/lib/cad-script").then(({ parseScript, scriptToCommands }) => {
          const actions = parseScript(scriptText);
          const commands = scriptToCommands(actions);
          addLine("system", `⚡ Running script: ${actions.length} actions`);
          executeCadCommands(commands);
        }).catch((e) => addLine("error", `Script error: ${e.message}`));
        return;
      }

      case "claude.reset": {
        conversationRef.current = [];
        addLine("system", "Claude conversation history cleared. Starting fresh.");
        return;
      }

      case "rag.stats": {
        try {
          const res = await fetch("/api/terminal/rag-stats");
          const data = await res.json();
          addLine("output", `Knowledge Base: ${data.totalChunks} chunks, ${data.totalWords} words`);
          addLine("output", "Sources:");
          for (const src of data.sources || []) {
            addLine("output", `  ${src.name}: ${src.count} chunks`);
          }
        } catch {
          addLine("error", "RAG stats not available");
        }
        return;
      }

      case "rag.search": {
        const query = args.join(" ");
        if (!query) { addLine("error", "Usage: rag.search <query>"); return; }
        try {
          const res = await fetch("/api/terminal/rag-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, topK: 3 }),
          });
          const data = await res.json();
          addLine("output", `Found ${data.chunks?.length || 0} results for "${query}":`);
          for (const chunk of data.chunks || []) {
            addLine("output", `  [${chunk.source} p${chunk.page}] score=${chunk.score.toFixed(1)}`);
            addLine("system", `    ${chunk.text.substring(0, 150)}...`);
          }
        } catch {
          addLine("error", "RAG search not available");
        }
        return;
      }

      case "generate": {
        const planType = args[0]?.toLowerCase();
        if (!planType || !["1bed", "2bed", "3bed"].includes(planType)) {
          addLine("system", "Usage: generate <type> [options]");
          addLine("system", "  generate 1bed    — 1-bedroom apartment (7m × 7m)");
          addLine("system", "  generate 2bed    — 2-bedroom house (10m × 8m)");
          addLine("system", "  generate 3bed    — 3-bedroom house (12m × 10m)");
          addLine("system", "");
          addLine("system", "Options (append after type):");
          addLine("system", "  nofurniture      — skip furniture");
          addLine("system", "  noroof           — skip roof");
          addLine("system", "  scale=1.5        — scale all dimensions");
          addLine("system", "");
          addLine("system", "Example: generate 2bed scale=1.2");
          addLine("system", "All schematics sourced from RAG FloorPlanCAD dataset.");
          return;
        }

        setIsRunning(true);
        addLine("system", `Generating ${planType} floor plan from RAG schematics...`);

        try {
          // Parse optional adjustments from args
          const adjustments: any = {};
          for (const arg of args.slice(1)) {
            if (arg === "nofurniture") adjustments.includeFurniture = false;
            else if (arg === "noroof") adjustments.includeRoof = false;
            else if (arg.startsWith("scale=")) {
              const s = parseFloat(arg.split("=")[1]);
              if (!isNaN(s)) adjustments.scale = s;
            }
          }

          const res = await fetch("/api/terminal/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: planType, adjustments }),
          });
          const data = await res.json();

          if (data.error) {
            addLine("error", data.error);
            setIsRunning(false);
            return;
          }

          addLine("output", `Plan: ${data.plan?.label || planType}`);
          addLine("output", `Commands: ${data.commandCount} | Components: walls, doors, windows, furniture, roof`);
          addLine("system", `Executing ${data.commandCount} cad-commands...`);

          await executeCadCommands(data.commands);

          addLine("system", `Done — ${data.plan?.label || planType} built on canvas`);
          addLine("system", "Tip: use 'generate <type> nofurniture' to skip furniture, or 'scale=1.5' to resize");
        } catch (e: any) {
          addLine("error", `Generate failed: ${e.message}`);
        }
        setIsRunning(false);
        return;
      }

      case "claude.history": {
        if (conversationRef.current.length === 0) {
          addLine("system", "No conversation history yet. Type 'claude <prompt>' to start.");
        } else {
          addLine("system", `${conversationRef.current.length} messages in conversation:`);
          for (const h of conversationRef.current.slice(-6)) {
            addLine(h.role === "User" ? "input" : "ai", `${h.role}: ${h.text.substring(0, 100)}${h.text.length > 100 ? "..." : ""}`);
          }
        }
        return;
      }

      case "cad.entities": {
        if (cadState) {
          addLine("output", `${cadState.entities.length} entities:`);
          for (const e of cadState.entities) {
            addLine("output", `  [${e.type}] ${e.id} ${e.plane || "xz"}`);
          }
        } else {
          addLine("error", "CAD state not available");
        }
        return;
      }

      case "cad.features": {
        if (cadState) {
          addLine("output", `${cadState.features.length} features:`);
          for (const f of cadState.features) {
            const verts = f.mesh ? f.mesh.vertices.length / 3 : 0;
            addLine("output", `  [${f.type}] ${f.name} — ${verts} vertices, ${f.status}`);
          }
        } else {
          addLine("error", "CAD state not available");
        }
        return;
      }

      case "cad.tool": {
        if (args.length > 0 && onCadCommand) {
          onCadCommand("SET_TOOL", args);
          addLine("output", `Tool set to: ${args[0]}`);
        } else if (cadState) {
          addLine("output", `Active tool: ${cadState.activeTool}`);
        }
        return;
      }

      case "cad.plane": {
        if (args.length > 0 && onCadCommand) {
          onCadCommand("SET_PLANE", args);
          addLine("output", `Plane set to: ${args[0]}`);
        } else if (cadState) {
          addLine("output", `Active plane: ${cadState.sketchPlane}`);
        }
        return;
      }

      case "cad.undo": {
        if (onCadCommand) onCadCommand("UNDO", []);
        addLine("output", "Undo");
        return;
      }

      case "cad.redo": {
        if (onCadCommand) onCadCommand("REDO", []);
        addLine("output", "Redo");
        return;
      }

      case "cad.clear": {
        if (onCadCommand) onCadCommand("CLEAR_ALL", []);
        addLine("output", "All entities and features cleared");
        return;
      }

      case "cad.export": {
        const format = args[0] || "stl";
        addLine("output", `Exporting as ${format}...`);
        try {
          // Find the export button and click it, or directly trigger export
          const meshFeatures = cadState?.features?.filter((f: any) => f.mesh && f.visible) || [];
          if (meshFeatures.length === 0) {
            addLine("error", "No visible features to export");
            return;
          }
          // Combine all visible meshes
          const allVerts: number[] = [];
          const allNorms: number[] = [];
          const allIdx: number[] = [];
          for (const f of meshFeatures) {
            const offset = allVerts.length / 3;
            allVerts.push(...f.mesh.vertices);
            allNorms.push(...(f.mesh.normals || []));
            for (const i of f.mesh.indices) allIdx.push(i + offset);
          }

          if (format === "obj") {
            // OBJ export
            let obj = "# GestureCAD Export\n";
            for (let i = 0; i < allVerts.length; i += 3) {
              obj += `v ${allVerts[i]} ${allVerts[i+1]} ${allVerts[i+2]}\n`;
            }
            for (let i = 0; i < allIdx.length; i += 3) {
              obj += `f ${allIdx[i]+1} ${allIdx[i+1]+1} ${allIdx[i+2]+1}\n`;
            }
            const blob = new Blob([obj], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "model.obj"; a.click();
            addLine("output", `Exported ${allVerts.length/3} vertices as OBJ`);
          } else {
            // STL binary export
            const triangleCount = allIdx.length / 3;
            const buffer = new ArrayBuffer(84 + triangleCount * 50);
            const view = new DataView(buffer);
            // Header (80 bytes)
            const header = "GestureCAD STL Export";
            for (let i = 0; i < 80; i++) view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
            view.setUint32(80, triangleCount, true);
            let offset = 84;
            for (let t = 0; t < allIdx.length; t += 3) {
              const i0 = allIdx[t], i1 = allIdx[t+1], i2 = allIdx[t+2];
              // Normal (use first vertex normal or compute)
              const nx = allNorms[i0*3] || 0, ny = allNorms[i0*3+1] || 0, nz = allNorms[i0*3+2] || 0;
              view.setFloat32(offset, nx, true); view.setFloat32(offset+4, ny, true); view.setFloat32(offset+8, nz, true); offset += 12;
              // 3 vertices
              for (const idx of [i0, i1, i2]) {
                view.setFloat32(offset, allVerts[idx*3], true);
                view.setFloat32(offset+4, allVerts[idx*3+1], true);
                view.setFloat32(offset+8, allVerts[idx*3+2], true);
                offset += 12;
              }
              view.setUint16(offset, 0, true); offset += 2;
            }
            const blob = new Blob([buffer], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "model.stl"; a.click();
            addLine("output", `Exported ${triangleCount} triangles as STL`);
          }
        } catch (e: any) {
          addLine("error", `Export failed: ${e.message}`);
        }
        return;
      }

      case "cad.screenshot": {
        addLine("output", "Capturing viewport...");
        const canvasEl = document.querySelector("canvas");
        if (canvasEl) {
          const dataUrl = canvasEl.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = "gesturecad-screenshot.png";
          a.click();
          addLine("output", "Screenshot saved");
        } else {
          addLine("error", "No canvas found");
        }
        return;
      }

      case "mcp.tools": {
        addLine("output", "Available MCP tools:");
        addLine("output", "  cad.extrude — Extrude a sketch entity");
        addLine("output", "  cad.fillet — Apply fillet to edges");
        addLine("output", "  cad.hole — Create a hole");
        addLine("output", "  cad.pattern — Create linear/circular pattern");
        addLine("output", "  cad.boolean — Union/subtract/intersect");
        addLine("output", "  cad.sketch — Create sketch entities");
        addLine("output", "  cad.export — Export model");
        addLine("output", "  shell.exec — Execute shell command");
        return;
      }

      case "mcp.call": {
        if (args.length < 1) {
          addLine("error", "Usage: mcp.call <tool> [args...]");
          addLine("system", "Tools: cad.extrude, cad.fillet, cad.hole, cad.pattern, cad.boolean, cad.sketch, cad.tool");
          return;
        }
        const mcpTool = args[0];
        const mcpArgs = args.slice(1);

        switch (mcpTool) {
          case "cad.tool":
            if (mcpArgs[0] && onCadCommand) {
              onCadCommand("SET_TOOL", mcpArgs);
              addLine("output", `Tool set to: ${mcpArgs[0]}`);
            }
            break;
          case "cad.extrude":
            if (onCadCommand) onCadCommand("SET_TOOL", ["extrude"]);
            addLine("output", "Extrude tool activated — click and drag on canvas");
            break;
          case "cad.fillet":
            if (onCadCommand) onCadCommand("SET_TOOL", ["fillet"]);
            addLine("output", "Fillet tool activated — dialog will open");
            break;
          case "cad.hole":
            if (onCadCommand) onCadCommand("SET_TOOL", ["hole"]);
            addLine("output", "Hole tool activated — dialog will open");
            break;
          case "cad.pattern":
            if (onCadCommand) onCadCommand("SET_TOOL", ["linear_pattern"]);
            addLine("output", "Linear pattern tool activated");
            break;
          case "cad.boolean":
            const op = mcpArgs[0] || "union";
            if (onCadCommand) onCadCommand("SET_TOOL", [op]);
            addLine("output", `Boolean ${op} activated`);
            break;
          case "cad.sketch":
            const sketchTool = mcpArgs[0] || "line";
            if (onCadCommand) onCadCommand("SET_TOOL", [sketchTool]);
            addLine("output", `Sketch tool: ${sketchTool} — draw on canvas`);
            break;
          case "cad.undo":
            if (onCadCommand) onCadCommand("UNDO", []);
            addLine("output", "Undo");
            break;
          case "cad.redo":
            if (onCadCommand) onCadCommand("REDO", []);
            addLine("output", "Redo");
            break;
          case "cad.clear":
            if (onCadCommand) onCadCommand("CLEAR_ALL", []);
            addLine("output", "Cleared all");
            break;
          case "shell.exec": {
            const shellCmd = mcpArgs.join(" ");
            if (!shellCmd) { addLine("error", "Usage: mcp.call shell.exec <command>"); break; }
            setIsRunning(true);
            try {
              const res = await fetch("/api/terminal/exec", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: shellCmd }),
              });
              const data = await res.json();
              if (data.stdout) addLine("output", data.stdout);
              if (data.stderr) addLine("error", data.stderr);
            } catch { addLine("error", "Shell exec failed"); }
            setIsRunning(false);
            break;
          }
          default:
            addLine("error", `Unknown MCP tool: ${mcpTool}`);
        }
        return;
      }
    }

    // AI command — send to Claude via the existing Claude endpoint
    if (command === "ai") {
      const prompt = args.join(" ");
      if (!prompt) {
        addLine("error", "Usage: ai <your prompt>");
        return;
      }
      setIsRunning(true);
      addLine("ai", `Thinking about: "${prompt}"...`);

      try {
        const res = await fetch("/api/terminal/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context: {
              activeTool: cadState?.activeTool || "select",
              sketchPlane: cadState?.sketchPlane || "xz",
              entityCount: cadState?.entities?.length || 0,
              featureCount: cadState?.features?.length || 0,
              entityDetails: cadState?.entities?.slice(-10).map((e: any) => ({
                type: e.type, id: e.id, plane: e.plane,
              })) || [],
              featureDetails: cadState?.features?.map((f: any) => ({
                type: f.type,
                name: f.name,
                status: f.status,
                vertices: f.mesh ? f.mesh.vertices.length / 3 : 0,
              })) || [],
            },
            conversationHistory: conversationRef.current.slice(-10),
          }),
        });

        const data = await res.json();
        const response = data.response || "No response";

        // Add to conversation history
        conversationRef.current.push({ role: "User", text: prompt });
        conversationRef.current.push({ role: "Claude", text: response.substring(0, 500) });

        for (const line of response.split("\n")) {
          if (line.trim()) addLine("ai", line);
        }

        // Auto-detect use-template blocks
        const tplMatch = response.match(/```use-template\s*\n(\w+)\s*\n```/);
        if (tplMatch) {
          addLine("system", `Loading ${tplMatch[1]} template from RAG...`);
          try {
            const tRes = await fetch("/api/terminal/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: tplMatch[1] }),
            });
            const tData = await tRes.json();
            if (tData.commands) {
              await executeCadCommands(tData.commands);
              addLine("system", `Template ${tData.plan?.label} built`);
            }
          } catch { addLine("error", "Failed to load template"); }
        }

        // Auto-detect and execute ALL cad-commands blocks
        const allBlocks = [...response.matchAll(/```cad-commands\s*\n([\s\S]*?)\n```/g)];
        if (allBlocks.length > 0) {
          const allCommands: any[] = [];
          for (const block of allBlocks) {
            try {
              const parsed = JSON.parse(block[1]);
              allCommands.push(...parsed);
            } catch { /* skip unparseable blocks */ }
          }
          if (allCommands.length > 0) {
            addLine("system", `Executing ${allCommands.length} commands...`);
            await executeCadCommands(allCommands);
            addLine("system", `Done — ${allCommands.length} commands executed`);
          }
        }
      } catch {
        // Fall back to built-in help if Claude endpoint is unavailable
        addLine("ai", getBuiltInHelp(prompt, cadState));
      }
      setIsRunning(false);
      return;
    }

    // Claude Code — persistent session with full CAD context
    if (command === "claude" || trimmed.startsWith("claude ")) {
      const prompt = command === "claude" ? args.join(" ") : trimmed.replace(/^claude\s*/, "");
      if (!prompt) {
        addLine("error", "Usage: claude <your prompt>");
        addLine("system", "Example: claude design a spur gear with 20 teeth");
        addLine("system", "Claude has full context: your entities, features, tools, and conversation history.");
        return;
      }

      setIsRunning(true);
      addLine("system", `🤖 Claude is thinking...`);

      // Add to conversation history
      conversationRef.current.push({ role: "User", text: prompt });

      try {
        const res = await fetch("/api/terminal/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context: {
              activeTool: cadState?.activeTool || "select",
              sketchPlane: cadState?.sketchPlane || "xz",
              entityCount: cadState?.entities?.length || 0,
              featureCount: cadState?.features?.length || 0,
              entityDetails: cadState?.entities?.slice(-10).map((e: any) => ({
                type: e.type, id: e.id, plane: e.plane,
              })) || [],
              featureDetails: cadState?.features?.map((f: any) => ({
                type: f.type,
                name: f.name,
                status: f.status,
                vertices: f.mesh ? f.mesh.vertices.length / 3 : 0,
              })) || [],
            },
            conversationHistory: conversationRef.current.slice(-10),
          }),
        });

        const data = await res.json();
        const response = data.response || "No response";

        // Add Claude's response to conversation history
        conversationRef.current.push({ role: "Claude", text: response.substring(0, 500) });

        // Display response line by line
        for (const line of response.split("\n")) {
          if (line.trim()) addLine("ai", line);
        }

        // Auto-detect use-template blocks (Claude references a pre-built floor plan)
        const templateMatch = response.match(/```use-template\s*\n(\w+)\s*\n```/);
        if (templateMatch) {
          const templateType = templateMatch[1];
          addLine("system", `Loading pre-built ${templateType} template from RAG...`);
          try {
            const tRes = await fetch("/api/terminal/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: templateType }),
            });
            const tData = await tRes.json();
            if (tData.commands) {
              addLine("system", `Executing ${tData.commandCount} template commands...`);
              await executeCadCommands(tData.commands);
              addLine("system", `Template ${tData.plan?.label || templateType} built`);
            }
          } catch { addLine("error", "Failed to load template"); }
        }

        // Auto-detect and execute ALL cad-commands blocks (Claude outputs multiple)
        const allBlocks = [...response.matchAll(/```cad-commands\s*\n([\s\S]*?)\n```/g)];
        if (allBlocks.length > 0) {
          const allCommands: any[] = [];
          for (const block of allBlocks) {
            try {
              const parsed = JSON.parse(block[1]);
              allCommands.push(...parsed);
            } catch { /* skip unparseable blocks */ }
          }
          if (allCommands.length > 0) {
            addLine("system", `Executing ${allCommands.length} commands from ${allBlocks.length} blocks...`);
            await executeCadCommands(allCommands);
            addLine("system", `Done — ${allCommands.length} commands executed`);
          }
        } else if (!templateMatch) {
          // Check for single command suggestion
          const cmdMatch = response.match(/`(cad\.\w+[^`]*)`/);
          if (cmdMatch) {
            addLine("system", `Suggested command: ${cmdMatch[1]} — type it to execute`);
          }
        }
      } catch (e: any) {
        addLine("error", `Failed to reach Claude: ${e.message}`);
        addLine("system", "Falling back to built-in help...");
        addLine("ai", getBuiltInHelp(prompt, cadState));
      }
      setIsRunning(false);
      return;
    }

    // Shell command (prefixed with !)
    if (trimmed.startsWith("!")) {
      const shellCmd = trimmed.slice(1).trim();
      setIsRunning(true);
      addLine("system", `Running: ${shellCmd}`);

      try {
        const res = await fetch("/api/terminal/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: shellCmd }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.stdout) addLine("output", data.stdout);
          if (data.stderr) addLine("error", data.stderr);
        } else {
          addLine("error", `Shell execution not available (API route needed)`);
          addLine("system", `To enable: create apps/web/app/api/terminal/exec/route.ts`);
        }
      } catch {
        addLine("error", "Shell execution failed — API route not available");
      }
      setIsRunning(false);
      return;
    }

    // Try as a script command (box, cylinder, polygon, fillet, etc.)
    const SCRIPT_COMMANDS = ["box", "cylinder", "polygon", "cone", "sphere", "wall",
      "slot", "helix", "fillet", "chamfer", "hole", "shell", "draft",
      "pattern", "plane", "export", "union", "subtract", "intersect"];
    if (SCRIPT_COMMANDS.includes(command)) {
      import("@/lib/cad-script").then(({ parseScript, scriptToCommands }) => {
        const actions = parseScript(trimmed);
        const commands = scriptToCommands(actions);
        addLine("system", `⚡ ${command}`);
        executeCadCommands(commands);
      }).catch((e) => addLine("error", `Script error: ${e.message}`));
      return;
    }

    // Unknown command
    addLine("error", `Unknown command: ${command}. Type 'help' for available commands.`);
  }, [cadState, onCadCommand, addLine]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      let cmd = input;
      // Auto-prefix based on active tab
      if (activeTab === "ai" && !cmd.startsWith("ai ") && !cmd.startsWith("claude ") && !cmd.startsWith("cad.") && !cmd.startsWith("!") && !cmd.startsWith("mcp.") && cmd !== "help" && cmd !== "clear") {
        cmd = `claude ${cmd}`;
      } else if (activeTab === "mcp" && !cmd.startsWith("mcp.") && !cmd.startsWith("cad.") && !cmd.startsWith("!") && !cmd.startsWith("ai") && cmd !== "help" && cmd !== "clear") {
        cmd = `mcp.call ${cmd}`;
      } else if (activeTab === "shell" && !cmd.startsWith("!") && !cmd.startsWith("cad.") && !cmd.startsWith("ai") && !cmd.startsWith("mcp.") && !cmd.startsWith("rag.") && !cmd.startsWith("claude") && cmd !== "help" && cmd !== "clear") {
        cmd = `!${cmd}`;
      }
      handleCommand(cmd);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const idx = historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx >= 0) {
        const idx = historyIdx + 1;
        if (idx >= history.length) {
          setHistoryIdx(-1);
          setInput("");
        } else {
          setHistoryIdx(idx);
          setInput(history[idx]);
        }
      }
    }
  };

  // Resize drag handler
  const handleResizeStart = (e: React.MouseEvent) => {
    dragRef.current = { startY: e.clientY, startH: height };
    const handleMove = (ev: MouseEvent) => {
      if (dragRef.current) {
        const delta = dragRef.current.startY - ev.clientY;
        setHeight(Math.max(100, Math.min(600, dragRef.current.startH + delta)));
      }
    };
    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  if (!visible) {
    return (
      <button onClick={onToggle} style={s.toggleBtn} title="Open Terminal (Ctrl+`)">
        <span style={{ fontSize: 14 }}>⌨</span>
      </button>
    );
  }

  return (
    <div style={{ ...s.container, height }}>
      {/* Resize handle */}
      <div style={s.resizeHandle} onMouseDown={handleResizeStart} />

      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>⌨ Terminal</span>
        <div style={s.headerTabs}>
          <span style={activeTab === "shell" ? s.tabActive : s.tab} onClick={() => setActiveTab("shell")}>Shell</span>
          <span style={activeTab === "ai" ? s.tabActive : s.tab} onClick={() => setActiveTab("ai")}>AI Assistant</span>
          <span style={activeTab === "mcp" ? s.tabActive : s.tab} onClick={() => setActiveTab("mcp")}>MCP</span>
        </div>
        <button onClick={onToggle} style={s.closeBtn}>✕</button>
      </div>

      {/* Output area */}
      <div ref={scrollRef} style={s.output}>
        {lines.map((line, i) => (
          <div key={i} style={s.line}>
            <span style={lineStyle(line.type)}>{line.text}</span>
          </div>
        ))}
        {isRunning && (
          <div style={s.line}>
            <span style={{ color: "#f59e0b" }}>⏳ Running...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={s.inputRow}>
        <span style={s.prompt}>{activeTab === "shell" ? "$" : activeTab === "ai" ? "🤖" : "⚡"}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={s.input}
          placeholder={
            activeTab === "shell" ? "Shell command (ls, git status, claude ...)" :
            activeTab === "ai" ? "Ask anything about CAD design..." :
            "MCP tool (cad.extrude, cad.fillet, shell.exec ls)"
          }
          autoFocus
        />
      </div>
    </div>
  );
}

/** Built-in AI responses for common CAD questions */
function getBuiltInHelp(prompt: string, cadState?: any): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("gear") || lower.includes("teeth")) {
    return "To make a gear: 1) Draw a circle (press C) for the pitch diameter. 2) Use Polygon tool (G) for the teeth profile. 3) Extrude (X) to set gear thickness. 4) Use Circular Pattern for teeth. 5) Add a center Hole (H) for the shaft.";
  }
  if (lower.includes("house") || lower.includes("building")) {
    return "To make a house: 1) Draw rectangle on XZ plane (R) for the footprint. 2) Extrude (X, drag up) for walls. 3) Switch to XY plane (press 2) for front face. 4) Draw circles for windows. 5) Draw rectangle for door. 6) Use a triangle/polygon for the roof shape.";
  }
  if (lower.includes("hole") || lower.includes("drill")) {
    return "To add a hole: 1) First create a solid body (draw shape + extrude). 2) Press H or search 'hole'. 3) Set diameter, depth, and type (simple/counterbore/countersink). 4) Click Apply.";
  }
  if (lower.includes("fillet") || lower.includes("round")) {
    return "To round edges: 1) Create a solid first. 2) Search 'fillet' or click the fillet tool. 3) Set the radius. 4) Apply. For variable fillet, change the type to 'Variable Radius'.";
  }
  if (lower.includes("extrude")) {
    return "To extrude: 1) Draw any 2D shape (circle, rect, polygon, etc.). 2) Press X. 3) Click on the canvas and drag up/down to set height. 4) Release to confirm. The shape you drew becomes a 3D solid.";
  }
  if (lower.includes("pattern") || lower.includes("array")) {
    return "For patterns: Search 'linear pattern' for rows/grids, 'circular pattern' for radial copies. Set count and spacing in the dialog.";
  }
  if (lower.includes("export") || lower.includes("save")) {
    return "To export: Type 'cad.export stl' or 'cad.export obj' or 'cad.export glb'. Or use the File menu in the toolbar.";
  }

  const entityCount = cadState?.entities?.length || 0;
  const featureCount = cadState?.features?.length || 0;
  return `Current state: ${entityCount} entities, ${featureCount} features, tool: ${cadState?.activeTool || "select"}, plane: ${cadState?.sketchPlane || "xz"}. Try: 'cad.features' to list features, 'cad.entities' for sketch entities, or ask about specific CAD operations.`;
}

function lineStyle(type: TerminalLine["type"]): React.CSSProperties {
  switch (type) {
    case "input": return { color: "#e5e5e5", fontWeight: 600 };
    case "output": return { color: "#22c55e" };
    case "error": return { color: "#ef4444" };
    case "system": return { color: "#888" };
    case "ai": return { color: "#93c5fd" };
  }
}

const s: Record<string, React.CSSProperties> = {
  toggleBtn: {
    position: "fixed",
    bottom: 42,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 6,
    background: "#1a1a1a",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#333",
    color: "#888",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  container: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#0a0a0a",
    borderTop: "2px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    zIndex: 100,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    fontSize: 12,
  },
  resizeHandle: {
    height: 4,
    cursor: "ns-resize",
    background: "transparent",
    position: "absolute",
    top: -2,
    left: 0,
    right: 0,
    zIndex: 101,
  },
  header: {
    display: "flex",
    alignItems: "center",
    height: 32,
    padding: "0 10px",
    background: "#111",
    borderBottom: "1px solid #222",
    gap: 12,
    flexShrink: 0,
  },
  headerTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: 700,
  },
  headerTabs: {
    display: "flex",
    gap: 1,
    flex: 1,
  },
  tab: {
    padding: "4px 12px",
    color: "#555",
    fontSize: 11,
    cursor: "pointer",
    borderRadius: "4px 4px 0 0",
  },
  tabActive: {
    padding: "4px 12px",
    color: "#e5e5e5",
    fontSize: 11,
    background: "#0a0a0a",
    borderRadius: "4px 4px 0 0",
    fontWeight: 600,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#666",
    cursor: "pointer",
    fontSize: 14,
    padding: "2px 6px",
    fontFamily: "inherit",
  },
  output: {
    flex: 1,
    overflow: "auto",
    padding: "8px 12px",
    lineHeight: 1.6,
  },
  line: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    borderTop: "1px solid #1a1a1a",
    gap: 8,
    flexShrink: 0,
  },
  prompt: {
    color: "#3b82f6",
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#e5e5e5",
    fontFamily: "inherit",
    fontSize: 12,
    outline: "none",
    padding: 0,
  },
};
