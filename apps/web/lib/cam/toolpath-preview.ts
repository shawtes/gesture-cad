/**
 * Toolpath Preview — generates 3D line geometry for visualizing toolpaths.
 * Used by Three.js to render animated tool movement.
 */

import type { Toolpath, ToolpathPoint } from "./toolpath-generator";

export interface ToolpathVisualization {
  /** Rapid move line segments (red, dashed) */
  rapidLines: number[];
  /** Cutting move line segments (green, solid) */
  cuttingLines: number[];
  /** All points in order for animation */
  animationPath: { x: number; y: number; z: number; type: string; time: number }[];
  totalTime: number; // seconds
}

/**
 * Generate visualization data from a toolpath.
 */
export function generateToolpathVisualization(toolpath: Toolpath): ToolpathVisualization {
  const rapidLines: number[] = [];
  const cuttingLines: number[] = [];
  const animationPath: { x: number; y: number; z: number; type: string; time: number }[] = [];

  let totalTime = 0;
  const { tool, points } = toolpath;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    animationPath.push({ x: pt.x, y: pt.z, z: pt.y, type: pt.type, time: totalTime });

    if (i > 0) {
      const prev = points[i - 1];
      const dist = Math.hypot(pt.x - prev.x, pt.y - prev.y, pt.z - prev.z);

      // Swap Y/Z for Three.js coordinate system (Y=up)
      if (pt.type === "rapid") {
        rapidLines.push(prev.x, prev.z, prev.y, pt.x, pt.z, pt.y);
        totalTime += dist / (tool.feedRate * 3 / 60); // Rapid is ~3x feed rate
      } else {
        cuttingLines.push(prev.x, prev.z, prev.y, pt.x, pt.z, pt.y);
        const rate = pt.type === "linear" ? tool.feedRate : tool.feedRate;
        totalTime += dist / (rate / 60);
      }
    }
  }

  return { rapidLines, cuttingLines, animationPath, totalTime };
}

/**
 * Get the tool position at a given time in the animation.
 * Returns interpolated position between waypoints.
 */
export function getToolPositionAtTime(
  viz: ToolpathVisualization,
  time: number
): { x: number; y: number; z: number } | null {
  if (viz.animationPath.length === 0) return null;

  const clampedTime = Math.max(0, Math.min(time, viz.totalTime));

  for (let i = 1; i < viz.animationPath.length; i++) {
    const prev = viz.animationPath[i - 1];
    const curr = viz.animationPath[i];

    if (clampedTime <= curr.time) {
      const segTime = curr.time - prev.time;
      if (segTime <= 0) return { x: curr.x, y: curr.y, z: curr.z };

      const t = (clampedTime - prev.time) / segTime;
      return {
        x: prev.x + (curr.x - prev.x) * t,
        y: prev.y + (curr.y - prev.y) * t,
        z: prev.z + (curr.z - prev.z) * t,
      };
    }
  }

  const last = viz.animationPath[viz.animationPath.length - 1];
  return { x: last.x, y: last.y, z: last.z };
}
