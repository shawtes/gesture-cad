/**
 * Vertex Color Painting
 *
 * Per-vertex RGBA color data for painting directly on mesh vertices.
 * Provides blending, strength-based painting, and conversion to
 * Three.js-compatible Float32Array color attributes.
 */

// ─── Types ─────────────────────────────────────────────────

/** Map from vertex ID to RGBA color (each channel 0-1) */
export type VertexColorData = Map<number, [number, number, number, number]>;

// ─── Operations ───────────────────────────────────────────

/**
 * Paint a color onto a vertex with a given strength (0-1).
 * Blends the new color with the existing color using linear interpolation.
 * If the vertex has no existing color, the default is opaque white.
 */
export function paintVertexColor(
  data: VertexColorData,
  vertexId: number,
  color: [number, number, number, number],
  strength: number
): void {
  const clampedStrength = Math.max(0, Math.min(1, strength));
  const existing = data.get(vertexId) ?? [1, 1, 1, 1];
  const blended = blendVertexColors(existing, color, clampedStrength);
  data.set(vertexId, blended);
}

/**
 * Convert vertex color data to a Float32Array suitable for a Three.js
 * BufferAttribute (4 floats per vertex: RGBA).
 *
 * Vertices without color data default to opaque white (1,1,1,1).
 */
export function vertexColorsToAttribute(
  data: VertexColorData,
  vertexCount: number
): Float32Array {
  const result = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount; i++) {
    const color = data.get(i);
    if (color) {
      result[i * 4] = color[0];
      result[i * 4 + 1] = color[1];
      result[i * 4 + 2] = color[2];
      result[i * 4 + 3] = color[3];
    } else {
      // Default: opaque white
      result[i * 4] = 1;
      result[i * 4 + 1] = 1;
      result[i * 4 + 2] = 1;
      result[i * 4 + 3] = 1;
    }
  }

  return result;
}

/**
 * Blend two RGBA colors using linear interpolation.
 * t = 0 returns color `a`; t = 1 returns color `b`.
 */
export function blendVertexColors(
  a: [number, number, number, number],
  b: [number, number, number, number],
  t: number
): [number, number, number, number] {
  const s = Math.max(0, Math.min(1, t));
  const inv = 1 - s;
  return [
    a[0] * inv + b[0] * s,
    a[1] * inv + b[1] * s,
    a[2] * inv + b[2] * s,
    a[3] * inv + b[3] * s,
  ];
}

/**
 * Create an empty VertexColorData map initialized with a uniform color.
 */
export function createUniformVertexColors(
  vertexCount: number,
  color: [number, number, number, number] = [1, 1, 1, 1]
): VertexColorData {
  const data: VertexColorData = new Map();
  for (let i = 0; i < vertexCount; i++) {
    data.set(i, [...color]);
  }
  return data;
}
