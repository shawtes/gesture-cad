/**
 * Skin Modifier
 *
 * Generates a mesh around a skeleton path (spine) using Frenet frames.
 * Similar to Blender's Skin modifier: takes a chain of vertices as a
 * spine and extrudes a cross-section along it.
 *
 * Pure math -- no Three.js imports.
 */

import { HalfEdgeMesh } from './half-edge';

// ─── Vec3 Helpers ────────────────────────────────────────────

type V3 = [number, number, number];

function v3Add(a: V3, b: V3): V3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function v3Sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function v3Scale(a: V3, s: number): V3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function v3Cross(a: V3, b: V3): V3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function v3Dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function v3Len(a: V3): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

function v3Normalize(a: V3): V3 {
  const l = v3Len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

// ─── Frenet Frame ────────────────────────────────────────────

interface FrenetFrame {
  /** Position on the spine */
  position: V3;
  /** Tangent direction (forward along spine) */
  tangent: V3;
  /** Normal (perpendicular to tangent, in the osculating plane) */
  normal: V3;
  /** Binormal (perpendicular to both tangent and normal) */
  binormal: V3;
}

/**
 * Compute Frenet frames along a polyline spine.
 *
 * Uses the "rotation minimizing" approach: when curvature is zero
 * (straight segments), we propagate the previous frame's normal to
 * avoid discontinuities. Falls back to an arbitrary perpendicular
 * for the initial frame.
 */
function computeFrenetFrames(spine: V3[]): FrenetFrame[] {
  const n = spine.length;
  if (n < 2) return [];

  const frames: FrenetFrame[] = [];

  // Compute tangents
  const tangents: V3[] = [];
  for (let i = 0; i < n; i++) {
    let tangent: V3;
    if (i === 0) {
      tangent = v3Normalize(v3Sub(spine[1], spine[0]));
    } else if (i === n - 1) {
      tangent = v3Normalize(v3Sub(spine[n - 1], spine[n - 2]));
    } else {
      // Average of incoming and outgoing tangent
      const t1 = v3Normalize(v3Sub(spine[i], spine[i - 1]));
      const t2 = v3Normalize(v3Sub(spine[i + 1], spine[i]));
      tangent = v3Normalize(v3Add(t1, t2));
    }
    tangents.push(tangent);
  }

  // Compute initial normal: find a vector not parallel to the first tangent
  const t0 = tangents[0];
  let initialNormal: V3;
  if (Math.abs(t0[0]) < 0.9) {
    initialNormal = v3Normalize(v3Cross(t0, [1, 0, 0]));
  } else {
    initialNormal = v3Normalize(v3Cross(t0, [0, 1, 0]));
  }

  // Build first frame
  let prevNormal = initialNormal;
  let prevBinormal = v3Normalize(v3Cross(t0, prevNormal));

  for (let i = 0; i < n; i++) {
    const T = tangents[i];

    // Use rotation minimizing frames (parallel transport):
    // Project previous normal onto the plane perpendicular to current tangent
    let N: V3;
    if (i === 0) {
      N = prevNormal;
    } else {
      // Remove the component of prevNormal along the new tangent
      const proj = v3Scale(T, v3Dot(prevNormal, T));
      N = v3Sub(prevNormal, proj);
      const nLen = v3Len(N);
      if (nLen < 1e-10) {
        // Tangent didn't change enough, keep previous normal
        N = prevNormal;
      } else {
        N = v3Scale(N, 1 / nLen);
      }
    }

    const B = v3Normalize(v3Cross(T, N));

    frames.push({
      position: spine[i],
      tangent: T,
      normal: N,
      binormal: B,
    });

    prevNormal = N;
    prevBinormal = B;
  }

  return frames;
}

// ─── Skin Modifier ───────────────────────────────────────────

export interface SkinModifierOptions {
  /** Number of vertices around the circumference (default: 8) */
  segments?: number;
  /** Whether to cap the ends (default: true) */
  capEnds?: boolean;
}

/**
 * Generate a mesh around a skeleton path using Frenet frames.
 *
 * @param spineVertices Array of 3D positions defining the skeleton path
 * @param radii Radius at each spine vertex (length must match spineVertices)
 * @param options Configuration options
 * @returns A new HalfEdgeMesh with the skin geometry
 */
export function skinModifier(
  spineVertices: V3[],
  radii: number[],
  options: SkinModifierOptions = {},
): HalfEdgeMesh {
  const { segments = 8, capEnds = true } = options;

  if (spineVertices.length < 2) {
    return new HalfEdgeMesh();
  }

  if (radii.length !== spineVertices.length) {
    throw new Error(
      `radii length (${radii.length}) must match spineVertices length (${spineVertices.length})`,
    );
  }

  if (segments < 3) {
    throw new Error(`segments must be >= 3, got ${segments}`);
  }

  const mesh = new HalfEdgeMesh();
  const frames = computeFrenetFrames(spineVertices);
  const spineCount = spineVertices.length;

  // ── Generate ring vertices for each spine point ──
  // ringVertexIds[spineIdx][segIdx] = vertex ID
  const ringVertexIds: number[][] = [];

  for (let i = 0; i < spineCount; i++) {
    const frame = frames[i];
    const r = Math.max(radii[i], 0);
    const ring: number[] = [];

    for (let s = 0; s < segments; s++) {
      const angle = (2 * Math.PI * s) / segments;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Position = spine + r * (cos * normal + sin * binormal)
      const offset = v3Add(
        v3Scale(frame.normal, r * cos),
        v3Scale(frame.binormal, r * sin),
      );
      const pos = v3Add(frame.position, offset);
      const v = mesh.addVertex(pos[0], pos[1], pos[2]);

      // Set vertex normal pointing outward
      v.normal = v3Normalize(offset);

      ring.push(v.id);
    }

    ringVertexIds.push(ring);
  }

  // ── Connect rings with quads ──
  for (let i = 0; i < spineCount - 1; i++) {
    const ringA = ringVertexIds[i];
    const ringB = ringVertexIds[i + 1];

    for (let s = 0; s < segments; s++) {
      const nextS = (s + 1) % segments;

      // Quad: ringA[s] -> ringA[nextS] -> ringB[nextS] -> ringB[s]
      mesh.addFace([ringA[s], ringA[nextS], ringB[nextS], ringB[s]]);
    }
  }

  // ── Cap the ends ──
  if (capEnds) {
    // Start cap (reverse winding for inward-facing normal)
    const startRing = ringVertexIds[0];
    if (startRing.length >= 3) {
      // Triangulate as a fan from a center vertex
      const startCenter = mesh.addVertex(
        spineVertices[0][0],
        spineVertices[0][1],
        spineVertices[0][2],
      );
      // Normal points backward along spine
      const startTangent = frames[0].tangent;
      startCenter.normal = [-startTangent[0], -startTangent[1], -startTangent[2]];

      for (let s = 0; s < segments; s++) {
        const nextS = (s + 1) % segments;
        // Reverse winding for start cap
        mesh.addFace([startCenter.id, startRing[nextS], startRing[s]]);
      }
    }

    // End cap
    const endRing = ringVertexIds[spineCount - 1];
    if (endRing.length >= 3) {
      const endCenter = mesh.addVertex(
        spineVertices[spineCount - 1][0],
        spineVertices[spineCount - 1][1],
        spineVertices[spineCount - 1][2],
      );
      const endTangent = frames[spineCount - 1].tangent;
      endCenter.normal = [...endTangent];

      for (let s = 0; s < segments; s++) {
        const nextS = (s + 1) % segments;
        mesh.addFace([endCenter.id, endRing[s], endRing[nextS]]);
      }
    }
  }

  mesh.computeVertexNormals();
  return mesh;
}

/**
 * Generate a branching skin mesh from multiple spine paths sharing
 * vertices at junction points.
 *
 * @param spines Array of spine definitions, each with vertex positions and radii
 * @param segments Number of vertices around the circumference
 * @returns A new HalfEdgeMesh with the combined skin geometry
 */
export function skinModifierBranching(
  spines: Array<{ vertices: V3[]; radii: number[] }>,
  segments = 8,
): HalfEdgeMesh {
  if (spines.length === 0) return new HalfEdgeMesh();

  // For simple case, just generate each spine as a separate skin and combine
  // A full implementation would detect shared junction vertices and merge
  // the rings, but that requires complex intersection geometry.
  const meshes = spines.map((s) =>
    skinModifier(s.vertices, s.radii, { segments, capEnds: true }),
  );

  // Merge all into a single mesh
  const result = new HalfEdgeMesh();
  for (const m of meshes) {
    const vertMap = new Map<number, number>();

    // Copy vertices
    for (const [vid, v] of m.vertices) {
      const nv = result.addVertex(v.position[0], v.position[1], v.position[2]);
      nv.normal = [...v.normal];
      vertMap.set(vid, nv.id);
    }

    // Copy faces
    for (const [fid] of m.faces) {
      const verts = m.faceVertices(fid);
      const mappedVerts = verts.map((v) => vertMap.get(v.id)!);
      result.addFace(mappedVerts);
    }
  }

  result.computeVertexNormals();
  return result;
}
