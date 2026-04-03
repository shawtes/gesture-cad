/**
 * Texture Painting
 *
 * Brush-based painting on UV-mapped textures. Supports painting circles
 * at UV coordinates with configurable blend modes.
 */

import type { HalfEdgeMesh } from "../mesh/half-edge";

// ─── Types ─────────────────────────────────────────────────

export interface TexturePaintBrush {
  color: [number, number, number, number]; // RGBA 0-255
  radius: number; // in pixels on the texture canvas
  opacity: number; // 0-1
  blendMode: "normal" | "multiply" | "add";
}

// ─── Paint on UV ──────────────────────────────────────────

/**
 * Paint a circle at the given UV coordinates on an HTMLCanvasElement.
 * UV is in 0-1 range; the circle radius is in canvas pixels.
 */
export function paintOnUV(
  canvas: HTMLCanvasElement,
  uv: [number, number],
  brush: TexturePaintBrush
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cx = uv[0] * canvas.width;
  const cy = (1 - uv[1]) * canvas.height; // flip V

  const [r, g, b, a] = brush.color;
  const alpha = (a / 255) * brush.opacity;

  switch (brush.blendMode) {
    case "normal":
      ctx.globalCompositeOperation = "source-over";
      break;
    case "multiply":
      ctx.globalCompositeOperation = "multiply";
      break;
    case "add":
      ctx.globalCompositeOperation = "lighter";
      break;
  }

  ctx.globalAlpha = alpha;

  // Draw a radial gradient circle for soft brush edges
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, brush.radius);
  gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gradient.addColorStop(0.7, `rgba(${r},${g},${b},0.5)`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, brush.radius, 0, Math.PI * 2);
  ctx.fill();

  // Reset composite operation
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// ─── Raycast to UV ────────────────────────────────────────

/**
 * Convert a 3D hit point on a mesh face to UV coordinates
 * using barycentric interpolation.
 *
 * Returns null if the face has fewer than 3 vertices or if
 * any vertex lacks UV data in the mesh.
 */
export function raycastToUV(
  hitPoint: [number, number, number],
  faceId: number,
  mesh: HalfEdgeMesh
): [number, number] | null {
  const verts = mesh.faceVertices(faceId);
  if (verts.length < 3) return null;

  // Use the first triangle of the face
  const a = verts[0];
  const b = verts[1];
  const c = verts[2];

  const uvA = a.uv;
  const uvB = b.uv;
  const uvC = c.uv;

  if (!uvA || !uvB || !uvC) return null;

  // Compute barycentric coordinates of hitPoint in triangle (a, b, c)
  const bary = computeBarycentric(
    hitPoint,
    a.position,
    b.position,
    c.position
  );

  if (!bary) return null;

  // Interpolate UVs
  const u = bary[0] * uvA[0] + bary[1] * uvB[0] + bary[2] * uvC[0];
  const v = bary[0] * uvA[1] + bary[1] * uvB[1] + bary[2] * uvC[1];

  return [u, v];
}

// ─── Barycentric Coordinates ──────────────────────────────

/**
 * Compute barycentric coordinates (u, v, w) of point P in triangle (A, B, C).
 * Returns null if the triangle is degenerate.
 */
function computeBarycentric(
  p: [number, number, number],
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number]
): [number, number, number] | null {
  const v0: [number, number, number] = [
    b[0] - a[0],
    b[1] - a[1],
    b[2] - a[2],
  ];
  const v1: [number, number, number] = [
    c[0] - a[0],
    c[1] - a[1],
    c[2] - a[2],
  ];
  const v2: [number, number, number] = [
    p[0] - a[0],
    p[1] - a[1],
    p[2] - a[2],
  ];

  const d00 = dot3(v0, v0);
  const d01 = dot3(v0, v1);
  const d11 = dot3(v1, v1);
  const d20 = dot3(v2, v0);
  const d21 = dot3(v2, v1);

  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-10) return null;

  const invDenom = 1 / denom;
  const baryV = (d11 * d20 - d01 * d21) * invDenom;
  const baryW = (d00 * d21 - d01 * d20) * invDenom;
  const baryU = 1 - baryV - baryW;

  return [baryU, baryV, baryW];
}

function dot3(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
