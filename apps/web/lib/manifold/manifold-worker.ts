/**
 * Web Worker for Manifold WASM boolean operations.
 * Runs mesh booleans off the main thread to maintain 60fps.
 *
 * Communication protocol:
 *   Main → Worker: { id, op, meshA, meshB }
 *   Worker → Main: { id, result } | { id, error }
 *
 * When Manifold WASM is not available, falls back to simple mesh operations.
 */

export interface ManifoldWorkerMessage {
  id: string;
  op: "union" | "subtract" | "intersect";
  meshA: { vertices: number[]; indices: number[] };
  meshB: { vertices: number[]; indices: number[] };
}

export interface ManifoldWorkerResult {
  id: string;
  result?: { vertices: number[]; normals: number[]; indices: number[] };
  error?: string;
}

// Worker entry point — this file is used as a module worker
const ctx = globalThis as unknown as Worker & { onmessage: ((e: MessageEvent) => void) | null; postMessage: (msg: any) => void };

let manifoldReady = false;
let ManifoldModule: any = null;

async function initManifold(): Promise<boolean> {
  try {
    // Dynamic import of manifold-3d WASM module (optional dependency).
    // Uses Function constructor to prevent Next.js/webpack from resolving at build time.
    const dynamicImport = new Function("specifier", "return import(specifier)");
    const mod = await dynamicImport("manifold-3d").catch(() => null);
    if (mod) {
      ManifoldModule = await mod.default();
      manifoldReady = true;
      return true;
    }
  } catch {
    // Manifold not available — use fallback
  }
  return false;
}

/** Fallback: simple mesh union (concatenate buffers) */
function fallbackUnion(
  a: { vertices: number[]; indices: number[] },
  b: { vertices: number[]; indices: number[] }
): { vertices: number[]; normals: number[]; indices: number[] } {
  const vertexOffset = a.vertices.length / 3;
  return {
    vertices: [...a.vertices, ...b.vertices],
    normals: [], // Will be computed by caller
    indices: [...a.indices, ...b.indices.map((i) => i + vertexOffset)],
  };
}

/** Fallback: subtract returns A unchanged (proper CSG requires Manifold) */
function fallbackSubtract(
  a: { vertices: number[]; indices: number[] },
  _b: { vertices: number[]; indices: number[] }
): { vertices: number[]; normals: number[]; indices: number[] } {
  return { vertices: [...a.vertices], normals: [], indices: [...a.indices] };
}

/** Fallback: intersect returns empty mesh */
function fallbackIntersect(
  _a: { vertices: number[]; indices: number[] },
  _b: { vertices: number[]; indices: number[] }
): { vertices: number[]; normals: number[]; indices: number[] } {
  return { vertices: [], normals: [], indices: [] };
}

function performBoolean(
  op: "union" | "subtract" | "intersect",
  meshA: { vertices: number[]; indices: number[] },
  meshB: { vertices: number[]; indices: number[] }
): { vertices: number[]; normals: number[]; indices: number[] } {
  if (manifoldReady && ManifoldModule) {
    try {
      const { Manifold, Mesh } = ManifoldModule;

      const mA = new Manifold(new Mesh({
        vertProperties: new Float32Array(meshA.vertices),
        triVerts: new Uint32Array(meshA.indices),
      }));
      const mB = new Manifold(new Mesh({
        vertProperties: new Float32Array(meshB.vertices),
        triVerts: new Uint32Array(meshB.indices),
      }));

      let result: any;
      switch (op) {
        case "union": result = Manifold.union(mA, mB); break;
        case "subtract": result = Manifold.difference(mA, mB); break;
        case "intersect": result = Manifold.intersection(mA, mB); break;
      }

      const outMesh = result.getMesh();
      const vertices = Array.from(outMesh.vertProperties as Float32Array);
      const indices = Array.from(outMesh.triVerts as Uint32Array);

      // Compute normals
      const normals = computeNormals(vertices, indices);

      mA.delete();
      mB.delete();
      result.delete();

      return { vertices, normals, indices };
    } catch (err: any) {
      console.warn("Manifold operation failed, using fallback:", err.message);
    }
  }

  // Fallback
  switch (op) {
    case "union": return fallbackUnion(meshA, meshB);
    case "subtract": return fallbackSubtract(meshA, meshB);
    case "intersect": return fallbackIntersect(meshA, meshB);
  }
}

/** Compute flat normals from vertex/index arrays */
function computeNormals(vertices: number[], indices: number[]): number[] {
  const normals = new Array(vertices.length).fill(0);

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;

    const ax = vertices[i1] - vertices[i0];
    const ay = vertices[i1 + 1] - vertices[i0 + 1];
    const az = vertices[i1 + 2] - vertices[i0 + 2];
    const bx = vertices[i2] - vertices[i0];
    const by = vertices[i2 + 1] - vertices[i0 + 1];
    const bz = vertices[i2 + 2] - vertices[i0 + 2];

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    for (const idx of [i0, i1, i2]) {
      normals[idx] += nx;
      normals[idx + 1] += ny;
      normals[idx + 2] += nz;
    }
  }

  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    if (len > 0) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    }
  }

  return normals;
}

// Message handler
ctx.onmessage = async (e: MessageEvent<ManifoldWorkerMessage>) => {
  const { id, op, meshA, meshB } = e.data;

  // Lazy init
  if (!manifoldReady) {
    await initManifold();
  }

  try {
    const result = performBoolean(op, meshA, meshB);
    ctx.postMessage({ id, result } as ManifoldWorkerResult);
  } catch (err: any) {
    ctx.postMessage({ id, error: err.message || "Boolean operation failed" } as ManifoldWorkerResult);
  }
};
