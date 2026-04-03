/**
 * Claude Code Session API Route
 *
 * Runs claude --print with full CAD context piped in.
 * Each call includes the current project state so Claude
 * has full awareness of what's on screen.
 */

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { buildDesignContext, formatDesignContext } from "@/lib/rag/intent-classifier";

const MAX_PROMPT_LENGTH = 50_000; // ~50KB max prompt to prevent OOM

export async function POST(req: NextRequest) {
  try {
    const { prompt, context, conversationHistory } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "No prompt" }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({
        response: `Prompt too long (${prompt.length} chars). Max: ${MAX_PROMPT_LENGTH}.`,
        error: true,
      }, { status: 400 });
    }

    // Classify design intent and build smart RAG context
    const designCtx = buildDesignContext(prompt);
    const designContextStr = formatDesignContext(designCtx);

    // Build the full context string
    const contextStr = buildContext(context, conversationHistory);
    const fullPrompt = `${contextStr}${designContextStr}\n\nUser: ${prompt}`;

    // Use spawn + stdin to avoid shell injection — no shell interpolation
    const response = await runClaude(fullPrompt);

    return NextResponse.json({
      response,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("not found") || msg.includes("ENOENT")) {
      return NextResponse.json({
        response: "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code",
        error: true,
      });
    }
    if (msg.includes("timeout") || msg.includes("TIMEOUT")) {
      return NextResponse.json({
        response: "Claude took too long to respond (>120s). Try a shorter prompt.",
        error: true,
      });
    }
    return NextResponse.json({
      response: `Error: ${err.message}`,
      error: true,
    });
  }
}

/** Spawn claude CLI and pipe prompt via stdin — no shell injection possible */
function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["--print"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    child.on("error", (err) => reject(err));
    child.on("close", () => {
      resolve(stdout.trim() || stderr.trim() || "No response from Claude");
    });

    // Pipe prompt via stdin — safe from shell injection
    child.stdin.write(prompt);
    child.stdin.end();

    // Timeout after 120s
    setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("TIMEOUT: Claude took too long to respond"));
    }, 120_000);
  });
}

function buildContext(context: any, history: any[]): string {
  let ctx = `You are a professional CAD design engineer embedded inside GestureCAD.
You follow the standard 8-phase engineering design workflow:
1. REQUIREMENTS → 2. CONCEPTUAL SKETCH → 3. DETAILED 2D DRAWING → 4. 3D MODELING → 5. ANALYSIS → 6. ASSEMBLY → 7. DOCUMENTATION → 8. EXPORT

WHEN BUILDING A DESIGN:
- Always describe what you're building first (requirements/concept)
- List features in proper order: base shape → secondary features → holes → patterns → fillets LAST
- Output cad-commands to auto-build on the canvas
- Follow feature order standard: base extrude, then cuts, then holes, then patterns, then fillets/chamfers last
- Never add fillets before all geometry is placed

CURRENT CAD STATE:
- Active tool: ${context?.activeTool || "select"}
- Sketch plane: ${context?.sketchPlane || "xz"}
- Entities: ${context?.entityCount || 0} sketch entities
- Features: ${context?.featureCount || 0} 3D features`;

  if (context?.featureDetails && context.featureDetails.length > 0) {
    ctx += "\n\nFEATURE TREE:";
    for (const f of context.featureDetails) {
      ctx += `\n  - ${f.type}: "${f.name}" (${f.vertices} vertices, ${f.status})`;
    }
  }

  if (context?.entityDetails && context.entityDetails.length > 0) {
    ctx += "\n\nSKETCH ENTITIES:";
    for (const e of context.entityDetails) {
      ctx += `\n  - ${e.type}: id=${e.id}, plane=${e.plane || "xz"}`;
    }
  }

  ctx += `\n
CRITICAL RULE: BUILD COMPONENT BY COMPONENT — NOT ONE GIANT BLOCK.

Each component = 1 sketch + 1 extrude. Build ONE component at a time:
1. Draw ONE shape on a plane
2. Extrude it immediately
3. Then draw the NEXT shape and extrude it
4. Apply modifications (fillet, hole) to individual components
5. NEVER draw multiple shapes before extruding — extrude after EACH shape

CORRECT (component-by-component):
\`\`\`cad-commands
[
  {"action": "comment", "text": "--- Component 1: Main walls ---"},
  {"action": "set_plane", "plane": "xz"},
  {"action": "add_entity", "type": "rect", "params": {"x1": -6, "z1": -5, "x2": 6, "z2": 5}},
  {"action": "extrude_last", "distance": 3},

  {"action": "comment", "text": "--- Component 2: Door opening ---"},
  {"action": "set_plane", "plane": "xy"},
  {"action": "add_entity", "type": "rect", "params": {"x1": -0.5, "z1": 0, "x2": 0.5, "z2": 2.1}},
  {"action": "extrude_last", "distance": 0.3},

  {"action": "comment", "text": "--- Component 3: Left window ---"},
  {"action": "set_plane", "plane": "xy"},
  {"action": "add_entity", "type": "rect", "params": {"x1": -4, "z1": 1, "x2": -2.5, "z2": 2}},
  {"action": "extrude_last", "distance": 0.3},

  {"action": "comment", "text": "--- Component 4: Right window ---"},
  {"action": "add_entity", "type": "rect", "params": {"x1": 2.5, "z1": 1, "x2": 4, "z2": 2}},
  {"action": "extrude_last", "distance": 0.3},

  {"action": "comment", "text": "--- Component 5: Roof ---"},
  {"action": "set_plane", "plane": "xz"},
  {"action": "add_entity", "type": "rect", "params": {"x1": -6.5, "z1": -5.5, "x2": 6.5, "z2": 5.5}},
  {"action": "extrude_last", "distance": 0.4},

  {"action": "comment", "text": "--- Component 6: Chimney ---"},
  {"action": "add_entity", "type": "rect", "params": {"x1": 3, "z1": -2, "x2": 4, "z2": -1}},
  {"action": "extrude_last", "distance": 2},

  {"action": "comment", "text": "--- Finishing: fillets ---"},
  {"action": "apply_feature", "type": "fillet", "params": {"radius": 0.1}}
]
\`\`\`

WRONG (giant 2D schematic then one extrude):
- Drawing all walls, doors, windows as 2D lines on one plane
- Then trying to extrude everything at once
- This creates a flat block, not individual components

RULES:
- Each component gets its OWN add_entity + extrude_last pair
- Use "comment" actions to label each component
- Switch planes when building on different faces (xz=top, xy=front, yz=side)
- Keep each component small: 1-3 entities max
- Extrude distances: walls=3, doors=0.3, windows=0.3, roof=0.4, furniture=varies
- Position components using different coordinates — don't stack at origin

Available entity types: rect, circle, line, arc, ellipse, polygon, slot, point
Available planes: xz (top/ground), xy (front wall), yz (side wall)
Available features: fillet, chamfer, shell, draft, hole, helix, linear_pattern, circular_pattern

Coordinates are in meters. Origin is center of the design.
For houses: footprint ±6 x ±5 (12m x 10m). Wall height 3m. Door 0.9x2.1m. Window 1.5x1m.
For parts: use ±2 range. For small details: ±0.5.

Include explanatory text between command blocks describing each component.
ALWAYS use the component-by-component pattern above.`;

  // Add conversation history
  if (history && history.length > 0) {
    ctx += "\n\nCONVERSATION HISTORY:";
    for (const h of history.slice(-10)) { // Last 10 messages
      ctx += `\n${h.role}: ${h.text}`;
    }
  }

  return ctx;
}
