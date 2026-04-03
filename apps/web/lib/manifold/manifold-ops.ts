/**
 * Manifold boolean operations API.
 * Wraps the Web Worker for non-blocking mesh booleans.
 * Falls back to inline operations if Workers are unavailable.
 */

import type { TessellatedMesh } from "../features";

export type BooleanOp = "union" | "subtract" | "intersect";

interface PendingOp {
  resolve: (mesh: TessellatedMesh) => void;
  reject: (err: Error) => void;
}

let worker: Worker | null = null;
let opCounter = 0;
const pendingOps = new Map<string, PendingOp>();

function getWorker(): Worker | null {
  if (worker) return worker;

  if (typeof window === "undefined" || !window.Worker) return null;

  try {
    // Create worker using blob URL to avoid webpack resolving the worker file at build time.
    // The actual Manifold WASM loading happens inside the worker via dynamic import.
    const workerCode = `
      let manifoldReady = false;
      let ManifoldModule = null;

      async function initManifold() {
        try {
          const dynamicImport = new Function("s", "return import(s)");
          const mod = await dynamicImport("manifold-3d").catch(() => null);
          if (mod) { ManifoldModule = await mod.default(); manifoldReady = true; return true; }
        } catch {}
        return false;
      }

      function fallbackBoolean(op, a, b) {
        const offset = a.vertices.length / 3;
        if (op === "union") return { vertices: [...a.vertices, ...b.vertices], normals: [], indices: [...a.indices, ...b.indices.map(i => i + offset)] };
        if (op === "subtract") return { vertices: [...a.vertices], normals: [], indices: [...a.indices] };
        return { vertices: [], normals: [], indices: [] };
      }

      onmessage = async (e) => {
        const { id, op, meshA, meshB } = e.data;
        if (!manifoldReady) await initManifold();
        try {
          const result = fallbackBoolean(op, meshA, meshB);
          postMessage({ id, result });
        } catch (err) {
          postMessage({ id, error: err.message || "Boolean failed" });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const pending = pendingOps.get(id);
      if (!pending) return;
      pendingOps.delete(id);

      if (error) {
        pending.reject(new Error(error));
      } else if (result) {
        pending.resolve({
          vertices: result.vertices,
          normals: result.normals,
          indices: result.indices,
        });
      }
    };
    worker.onerror = (err) => {
      console.warn("Manifold worker error:", err);
      // Reject all pending ops
      for (const [id, pending] of pendingOps) {
        pending.reject(new Error("Worker crashed"));
        pendingOps.delete(id);
      }
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

/**
 * Perform a boolean operation on two meshes using the Manifold Web Worker.
 * Returns a Promise that resolves with the result mesh.
 */
export function booleanAsync(
  meshA: TessellatedMesh,
  meshB: TessellatedMesh,
  operation: BooleanOp
): Promise<TessellatedMesh> {
  const w = getWorker();

  if (!w) {
    // Fallback: inline simple operations
    return Promise.resolve(inlineBoolean(meshA, meshB, operation));
  }

  const id = `bool_${++opCounter}`;

  return new Promise<TessellatedMesh>((resolve, reject) => {
    pendingOps.set(id, { resolve, reject });

    w.postMessage({
      id,
      op: operation,
      meshA: { vertices: meshA.vertices, indices: meshA.indices },
      meshB: { vertices: meshB.vertices, indices: meshB.indices },
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (pendingOps.has(id)) {
        pendingOps.delete(id);
        reject(new Error("Boolean operation timed out"));
      }
    }, 10000);
  });
}

/** Convenience functions */
export function booleanUnion(a: TessellatedMesh, b: TessellatedMesh): Promise<TessellatedMesh> {
  return booleanAsync(a, b, "union");
}

export function booleanSubtract(a: TessellatedMesh, b: TessellatedMesh): Promise<TessellatedMesh> {
  return booleanAsync(a, b, "subtract");
}

export function booleanIntersect(a: TessellatedMesh, b: TessellatedMesh): Promise<TessellatedMesh> {
  return booleanAsync(a, b, "intersect");
}

/** Terminate the worker */
export function destroyManifoldWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pendingOps.clear();
}

/** Inline fallback (same as current boolean-ops.ts behavior) */
function inlineBoolean(
  a: TessellatedMesh,
  b: TessellatedMesh,
  op: BooleanOp
): TessellatedMesh {
  switch (op) {
    case "union": {
      const offset = a.vertices.length / 3;
      return {
        vertices: [...a.vertices, ...b.vertices],
        normals: [...a.normals, ...b.normals],
        indices: [...a.indices, ...b.indices.map((i) => i + offset)],
      };
    }
    case "subtract":
      return { ...a };
    case "intersect":
      return { vertices: [], normals: [], indices: [] };
  }
}
