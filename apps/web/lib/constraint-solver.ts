/**
 * PlaneGCS WASM constraint solver wrapper.
 * Translates our sketch entities + constraints into PlaneGCS primitives,
 * solves the constraint system, and returns adjusted positions.
 */

import type { SketchEntity } from "./sketch-entities";
import type { SketchConstraint } from "./constraints";

// PlaneGCS types — imported dynamically to avoid WASM bundling issues
type GcsWrapper = any;
const Algorithm = { DogLeg: 0, LevenbergMarquardt: 1, BFGS: 2 } as const;
const SolveStatus = { Success: 0, Converged: 1, Failed: 2 } as const;

export type SolverStatus = "idle" | "solved" | "failed" | "overconstrained";

export interface SolveResult {
  status: SolverStatus;
  /** Updated entities with solved positions */
  entities: SketchEntity[];
  /** IDs of conflicting constraints */
  conflicting: string[];
}

let wrapper: GcsWrapper | null = null;
let initPromise: Promise<GcsWrapper> | null = null;
let solverAvailable = true;

/** Initialize PlaneGCS WASM. Cached — safe to call multiple times. */
export async function initSolver(): Promise<GcsWrapper | null> {
  if (wrapper) return wrapper;
  if (initPromise) return initPromise;
  if (!solverAvailable) return null;

  initPromise = (async () => {
    try {
      // Dynamic import to avoid webpack bundling the WASM at build time
      const planegcs = await import(
        /* webpackIgnore: true */
        "@salusoft89/planegcs"
      );
      wrapper = await planegcs.make_gcs_wrapper();
      console.log("[PlaneGCS] Solver initialized");
      return wrapper;
    } catch (err) {
      console.warn("[PlaneGCS] Failed to initialize, constraints will be visual-only:", err);
      solverAvailable = false;
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

/** Solve constraints and return adjusted entity positions. */
export async function solveConstraints(
  entities: SketchEntity[],
  constraints: SketchConstraint[]
): Promise<SolveResult> {
  if (entities.length === 0 || constraints.length === 0) {
    return { status: "idle", entities, conflicting: [] };
  }

  const gcs = await initSolver();
  if (!gcs) {
    // PlaneGCS unavailable — apply simple snapping without solver
    return applySimpleSnapping(entities, constraints);
  }
  gcs.clear_data();

  // Build PlaneGCS primitives from our entities
  const primitives: any[] = [];
  let oid = 1;
  const entityOidMap = new Map<string, number>(); // entity.id → first oid
  const pointOidMap = new Map<string, number>(); // "entityId:endpoint" → point oid

  for (const entity of entities) {
    switch (entity.type) {
      case "point": {
        const pid = oid++;
        entityOidMap.set(entity.id, pid);
        pointOidMap.set(`${entity.id}:0`, pid);
        primitives.push({
          id: String(pid),
          type: "point",
          x: entity.x,
          y: entity.z, // PlaneGCS uses x,y — we map our XZ to their XY
          fixed: false,
        });
        break;
      }
      case "line": {
        const p1id = oid++;
        const p2id = oid++;
        const lid = oid++;
        entityOidMap.set(entity.id, lid);
        pointOidMap.set(`${entity.id}:p1`, p1id);
        pointOidMap.set(`${entity.id}:p2`, p2id);
        primitives.push(
          { id: String(p1id), type: "point", x: entity.x1, y: entity.z1, fixed: false },
          { id: String(p2id), type: "point", x: entity.x2, y: entity.z2, fixed: false },
          { id: String(lid), type: "line", p1_id: String(p1id), p2_id: String(p2id) }
        );
        break;
      }
      case "circle": {
        const cid = oid++;
        const circId = oid++;
        entityOidMap.set(entity.id, circId);
        pointOidMap.set(`${entity.id}:c`, cid);
        primitives.push(
          { id: String(cid), type: "point", x: entity.cx, y: entity.cz, fixed: false },
          { id: String(circId), type: "circle", c_id: String(cid), radius: entity.radius }
        );
        break;
      }
      case "rect": {
        // Rect is 4 lines — for now, just fix its points
        const p1id = oid++;
        const p2id = oid++;
        pointOidMap.set(`${entity.id}:p1`, p1id);
        pointOidMap.set(`${entity.id}:p2`, p2id);
        entityOidMap.set(entity.id, p1id);
        primitives.push(
          { id: String(p1id), type: "point", x: entity.x1, y: entity.z1, fixed: true },
          { id: String(p2id), type: "point", x: entity.x2, y: entity.z2, fixed: true }
        );
        break;
      }
    }
  }

  // Build PlaneGCS constraints from our constraints
  for (const constraint of constraints) {
    const cid = String(oid++);
    const entityId = constraint.entityIds[0];

    switch (constraint.type) {
      case "horizontal": {
        const lineOid = entityOidMap.get(entityId);
        if (lineOid) {
          primitives.push({
            id: cid,
            type: "horizontal_l",
            l_id: String(lineOid),
            driving: true,
            temporary: false,
          });
        }
        break;
      }
      case "vertical": {
        const lineOid = entityOidMap.get(entityId);
        if (lineOid) {
          primitives.push({
            id: cid,
            type: "vertical_l",
            l_id: String(lineOid),
            driving: true,
            temporary: false,
          });
        }
        break;
      }
      case "coincident": {
        // Snap closest endpoints of two entities
        const eid1 = constraint.entityIds[0];
        const eid2 = constraint.entityIds[1];
        // Find closest point pair
        const p1Candidates = getPointOids(eid1, pointOidMap);
        const p2Candidates = getPointOids(eid2, pointOidMap);
        if (p1Candidates.length > 0 && p2Candidates.length > 0) {
          // Use first available points
          primitives.push({
            id: cid,
            type: "p2p_coincident",
            p1_id: p1Candidates[p1Candidates.length - 1], // endpoint
            p2_id: p2Candidates[0], // startpoint of next
            driving: true,
            temporary: false,
          });
        }
        break;
      }
    }
  }

  try {
    gcs.push_primitives_and_params(primitives);
    const status = gcs.solve(Algorithm.DogLeg);

    if (status === SolveStatus.Success || status === SolveStatus.Converged) {
      gcs.apply_solution();
      const solved = gcs.sketch_index.get_primitives();

      // Map solved positions back to our entities
      const updatedEntities = entities.map((entity) => {
        switch (entity.type) {
          case "point": {
            const pid = pointOidMap.get(`${entity.id}:0`);
            const sp = pid ? findPrimitive(solved, String(pid)) : null;
            if (sp && sp.type === "point") {
              return { ...entity, x: sp.x, z: sp.y };
            }
            return entity;
          }
          case "line": {
            const p1id = pointOidMap.get(`${entity.id}:p1`);
            const p2id = pointOidMap.get(`${entity.id}:p2`);
            const sp1 = p1id ? findPrimitive(solved, String(p1id)) : null;
            const sp2 = p2id ? findPrimitive(solved, String(p2id)) : null;
            return {
              ...entity,
              x1: sp1?.type === "point" ? sp1.x : entity.x1,
              z1: sp1?.type === "point" ? sp1.y : entity.z1,
              x2: sp2?.type === "point" ? sp2.x : entity.x2,
              z2: sp2?.type === "point" ? sp2.y : entity.z2,
            };
          }
          case "circle": {
            const cid = pointOidMap.get(`${entity.id}:c`);
            const sp = cid ? findPrimitive(solved, String(cid)) : null;
            return {
              ...entity,
              cx: sp?.type === "point" ? sp.x : entity.cx,
              cz: sp?.type === "point" ? sp.y : entity.cz,
            };
          }
          default:
            return entity;
        }
      });

      const conflicting = gcs.has_gcs_conflicting_constraints()
        ? gcs.get_gcs_conflicting_constraints()
        : [];

      return {
        status: conflicting.length > 0 ? "overconstrained" : "solved",
        entities: updatedEntities,
        conflicting,
      };
    }

    return { status: "failed", entities, conflicting: [] };
  } catch (err) {
    console.warn("[PlaneGCS] Solve error:", err);
    return { status: "failed", entities, conflicting: [] };
  }
}

function getPointOids(entityId: string, pointOidMap: Map<string, number>): string[] {
  const result: string[] = [];
  for (const [key, val] of pointOidMap) {
    if (key.startsWith(entityId + ":")) {
      result.push(String(val));
    }
  }
  return result;
}

function findPrimitive(primitives: any[], id: string): any {
  return primitives.find((p: any) => p.id === id);
}

/** Simple constraint snapping without PlaneGCS — adjusts entity positions directly. */
function applySimpleSnapping(
  entities: SketchEntity[],
  constraints: SketchConstraint[]
): SolveResult {
  const updated = entities.map((e) => ({ ...e }));

  for (const constraint of constraints) {
    const entity = updated.find((e) => e.id === constraint.entityIds[0]);
    if (!entity) continue;

    if (constraint.type === "horizontal" && entity.type === "line") {
      // Snap to horizontal: set z2 = z1
      const midZ = (entity.z1 + entity.z2) / 2;
      (entity as any).z1 = midZ;
      (entity as any).z2 = midZ;
    } else if (constraint.type === "vertical" && entity.type === "line") {
      // Snap to vertical: set x2 = x1
      const midX = (entity.x1 + entity.x2) / 2;
      (entity as any).x1 = midX;
      (entity as any).x2 = midX;
    } else if (constraint.type === "coincident") {
      // Snap endpoints together
      const other = updated.find((e) => e.id === constraint.entityIds[1]);
      if (!other) continue;

      const ep1 = getLastEndpoint(entity);
      const ep2 = getFirstEndpoint(other);
      if (ep1 && ep2) {
        const mid = { x: (ep1.x + ep2.x) / 2, z: (ep1.z + ep2.z) / 2 };
        setLastEndpoint(entity, mid);
        setFirstEndpoint(other, mid);
      }
    }
  }

  return { status: "solved", entities: updated, conflicting: [] };
}

function getLastEndpoint(e: SketchEntity): { x: number; z: number } | null {
  switch (e.type) {
    case "point": return { x: e.x, z: e.z };
    case "line": return { x: e.x2, z: e.z2 };
    case "circle": return { x: e.cx, z: e.cz };
    case "rect": return { x: e.x2, z: e.z2 };
    case "arc": return { x: e.x2, z: e.z2 };
    case "spline": return e.points.length >= 2 ? { x: e.points[e.points.length - 2], z: e.points[e.points.length - 1] } : null;
    default: return null;
  }
}

function getFirstEndpoint(e: SketchEntity): { x: number; z: number } | null {
  switch (e.type) {
    case "point": return { x: e.x, z: e.z };
    case "line": return { x: e.x1, z: e.z1 };
    case "circle": return { x: e.cx, z: e.cz };
    case "rect": return { x: e.x1, z: e.z1 };
    case "arc": return { x: e.x1, z: e.z1 };
    case "spline": return e.points.length >= 2 ? { x: e.points[0], z: e.points[1] } : null;
    default: return null;
  }
}

function setLastEndpoint(e: any, pt: { x: number; z: number }) {
  switch (e.type) {
    case "point": e.x = pt.x; e.z = pt.z; break;
    case "line": e.x2 = pt.x; e.z2 = pt.z; break;
    case "circle": e.cx = pt.x; e.cz = pt.z; break;
    case "rect": e.x2 = pt.x; e.z2 = pt.z; break;
    case "arc": e.x2 = pt.x; e.z2 = pt.z; break;
  }
}

function setFirstEndpoint(e: any, pt: { x: number; z: number }) {
  switch (e.type) {
    case "point": e.x = pt.x; e.z = pt.z; break;
    case "line": e.x1 = pt.x; e.z1 = pt.z; break;
    case "circle": e.cx = pt.x; e.cz = pt.z; break;
    case "rect": e.x1 = pt.x; e.z1 = pt.z; break;
    case "arc": e.x1 = pt.x; e.z1 = pt.z; break;
  }
}
