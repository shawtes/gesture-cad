/**
 * G-code Export — post-processor that converts toolpaths to CNC machine code.
 * Outputs standard G-code (Fanuc/LinuxCNC compatible).
 */

import type { Toolpath, ToolpathPoint } from "./toolpath-generator";

export interface GCodeOptions {
  unitSystem: "metric" | "imperial"; // G21 or G20
  spindleDirection: "CW" | "CCW";   // M3 or M4
  coolant: "off" | "flood" | "mist"; // M9, M8, M7
  programNumber?: number;
}

const DEFAULT_OPTIONS: GCodeOptions = {
  unitSystem: "metric",
  spindleDirection: "CW",
  coolant: "flood",
};

/**
 * Generate G-code from a toolpath.
 */
export function generateGCode(toolpath: Toolpath, options: GCodeOptions = DEFAULT_OPTIONS): string {
  const lines: string[] = [];
  const { tool, safeZ, points } = toolpath;

  // Header
  lines.push(`%`);
  if (options.programNumber) lines.push(`O${options.programNumber}`);
  lines.push(`(GestureCAD G-Code Export)`);
  lines.push(`(Toolpath: ${toolpath.name})`);
  lines.push(`(Tool: D${tool.diameter}mm ${tool.flutes}-flute)`);
  lines.push(`(Est. time: ${toolpath.estimatedTime.toFixed(1)} min)`);
  lines.push(``);

  // Setup
  lines.push(options.unitSystem === "metric" ? "G21 (Metric)" : "G20 (Imperial)");
  lines.push("G90 (Absolute positioning)");
  lines.push("G17 (XY plane)");
  lines.push(`G0 Z${safeZ.toFixed(3)} (Safe Z)`);
  lines.push(``);

  // Spindle on
  const spindleCode = options.spindleDirection === "CW" ? "M3" : "M4";
  lines.push(`${spindleCode} S${tool.spindleRPM} (Spindle on)`);

  // Coolant
  if (options.coolant === "flood") lines.push("M8 (Coolant flood)");
  else if (options.coolant === "mist") lines.push("M7 (Coolant mist)");

  lines.push(``);

  // Toolpath moves
  let lastType: string = "";
  for (const pt of points) {
    switch (pt.type) {
      case "rapid":
        lines.push(`G0 X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)} Z${pt.z.toFixed(3)}`);
        break;
      case "linear":
        lines.push(`G1 X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)} Z${pt.z.toFixed(3)} F${pt.z < (lastType === "linear" ? 0 : safeZ) ? tool.plungeRate : tool.feedRate}`);
        break;
      case "arc_cw":
        lines.push(`G2 X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)} Z${pt.z.toFixed(3)} F${tool.feedRate}`);
        break;
      case "arc_ccw":
        lines.push(`G3 X${pt.x.toFixed(3)} Y${pt.y.toFixed(3)} Z${pt.z.toFixed(3)} F${tool.feedRate}`);
        break;
    }
    lastType = pt.type;
  }

  // Footer
  lines.push(``);
  lines.push(`G0 Z${safeZ.toFixed(3)} (Retract)`);
  lines.push("M5 (Spindle off)");
  lines.push("M9 (Coolant off)");
  lines.push("G0 X0 Y0 (Return to origin)");
  lines.push("M30 (Program end)");
  lines.push(`%`);

  return lines.join("\n");
}

/**
 * Download G-code as a .nc file.
 */
export function downloadGCode(gcode: string, filename: string = "toolpath.nc"): void {
  const blob = new Blob([gcode], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate G-code — basic syntax check.
 */
export function validateGCode(gcode: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = gcode.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("(") || line === "%") continue;

    // Check for valid G/M codes
    if (!/^[GMTSNFXYZIJKR\d.\s-]+$/i.test(line.replace(/\(.*?\)/g, ""))) {
      errors.push(`Line ${i + 1}: Invalid syntax — ${line}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
