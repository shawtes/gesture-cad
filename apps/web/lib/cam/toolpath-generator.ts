/**
 * CAM Toolpath Generator — creates 2D profile and pocket toolpaths.
 *
 * Profile: follows the contour of a 2D sketch with tool radius offset.
 * Pocket: fills an area with zigzag or spiral passes.
 */

export interface ToolParams {
  diameter: number;    // mm
  flutes: number;
  spindleRPM: number;
  feedRate: number;    // mm/min
  plungeRate: number;  // mm/min
  depthPerPass: number; // mm
}

export interface ToolpathPoint {
  x: number;
  y: number;
  z: number;
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
}

export interface Toolpath {
  id: string;
  name: string;
  type: "profile" | "pocket" | "drill";
  points: ToolpathPoint[];
  tool: ToolParams;
  safeZ: number;
  totalLength: number; // mm
  estimatedTime: number; // minutes
}

const DEFAULT_TOOL: ToolParams = {
  diameter: 6,
  flutes: 2,
  spindleRPM: 12000,
  feedRate: 1000,
  plungeRate: 300,
  depthPerPass: 1,
};

let tpCounter = 0;

/**
 * Generate a profile toolpath — follows a 2D contour with tool offset.
 */
export function generateProfileToolpath(
  contour: { x: number; z: number }[],
  depth: number,
  tool: ToolParams = DEFAULT_TOOL,
  safeZ: number = 5
): Toolpath {
  const points: ToolpathPoint[] = [];
  const offset = tool.diameter / 2;
  const passes = Math.ceil(depth / tool.depthPerPass);

  if (contour.length < 2) {
    return { id: `tp_${++tpCounter}`, name: "Profile", type: "profile", points: [], tool, safeZ, totalLength: 0, estimatedTime: 0 };
  }

  // Offset contour by tool radius (simplified: just shift outward)
  const offsetContour = offsetContourPoints(contour, offset);

  for (let pass = 1; pass <= passes; pass++) {
    const z = -Math.min(pass * tool.depthPerPass, depth);

    // Rapid to start position at safe Z
    points.push({ x: offsetContour[0].x, y: offsetContour[0].z, z: safeZ, type: "rapid" });
    // Plunge to depth
    points.push({ x: offsetContour[0].x, y: offsetContour[0].z, z, type: "linear" });

    // Follow contour
    for (let i = 1; i < offsetContour.length; i++) {
      points.push({ x: offsetContour[i].x, y: offsetContour[i].z, z, type: "linear" });
    }

    // Close the loop
    points.push({ x: offsetContour[0].x, y: offsetContour[0].z, z, type: "linear" });
    // Retract
    points.push({ x: offsetContour[0].x, y: offsetContour[0].z, z: safeZ, type: "rapid" });
  }

  const totalLength = computePathLength(points);
  const estimatedTime = totalLength / tool.feedRate;

  return { id: `tp_${++tpCounter}`, name: "Profile", type: "profile", points, tool, safeZ, totalLength, estimatedTime };
}

/**
 * Generate a pocket toolpath — fills area with zigzag passes.
 */
export function generatePocketToolpath(
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
  depth: number,
  tool: ToolParams = DEFAULT_TOOL,
  safeZ: number = 5,
  stepover: number = 0.6 // fraction of tool diameter
): Toolpath {
  const points: ToolpathPoint[] = [];
  const step = tool.diameter * stepover;
  const offset = tool.diameter / 2;
  const passes = Math.ceil(depth / tool.depthPerPass);

  const innerMinX = bounds.minX + offset;
  const innerMaxX = bounds.maxX - offset;
  const innerMinZ = bounds.minZ + offset;
  const innerMaxZ = bounds.maxZ - offset;

  for (let pass = 1; pass <= passes; pass++) {
    const z = -Math.min(pass * tool.depthPerPass, depth);
    let direction = 1; // 1 = left-to-right, -1 = right-to-left

    // Rapid to start
    points.push({ x: innerMinX, y: innerMinZ, z: safeZ, type: "rapid" });
    points.push({ x: innerMinX, y: innerMinZ, z, type: "linear" });

    // Zigzag rows
    let currentZ = innerMinZ;
    while (currentZ <= innerMaxZ) {
      if (direction === 1) {
        points.push({ x: innerMaxX, y: currentZ, z, type: "linear" });
      } else {
        points.push({ x: innerMinX, y: currentZ, z, type: "linear" });
      }
      currentZ += step;
      if (currentZ <= innerMaxZ) {
        const x = direction === 1 ? innerMaxX : innerMinX;
        points.push({ x, y: currentZ, z, type: "linear" });
      }
      direction *= -1;
    }

    // Retract
    const lastPt = points[points.length - 1];
    points.push({ x: lastPt.x, y: lastPt.y, z: safeZ, type: "rapid" });
  }

  const totalLength = computePathLength(points);
  const estimatedTime = totalLength / tool.feedRate;

  return { id: `tp_${++tpCounter}`, name: "Pocket", type: "pocket", points, tool, safeZ, totalLength, estimatedTime };
}

/**
 * Generate a drilling toolpath — plunge at specified positions.
 */
export function generateDrillToolpath(
  holes: { x: number; z: number }[],
  depth: number,
  tool: ToolParams = DEFAULT_TOOL,
  safeZ: number = 5
): Toolpath {
  const points: ToolpathPoint[] = [];

  for (const hole of holes) {
    points.push({ x: hole.x, y: hole.z, z: safeZ, type: "rapid" });
    points.push({ x: hole.x, y: hole.z, z: -depth, type: "linear" });
    points.push({ x: hole.x, y: hole.z, z: safeZ, type: "rapid" });
  }

  const totalLength = computePathLength(points);
  return { id: `tp_${++tpCounter}`, name: "Drill", type: "drill", points, tool, safeZ, totalLength, estimatedTime: totalLength / tool.plungeRate };
}

/** Offset a 2D contour by a distance (simplified: perpendicular shift) */
function offsetContourPoints(
  contour: { x: number; z: number }[],
  offset: number
): { x: number; z: number }[] {
  return contour.map((pt, i) => {
    const prev = contour[(i - 1 + contour.length) % contour.length];
    const next = contour[(i + 1) % contour.length];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    return { x: pt.x + (-dz / len) * offset, z: pt.z + (dx / len) * offset };
  });
}

/** Compute total path length */
function computePathLength(points: ToolpathPoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y, points[i].z - points[i - 1].z);
  }
  return length;
}
