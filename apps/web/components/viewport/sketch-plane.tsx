"use client";

import { useEffect, useRef, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCADState, useCADDispatch, type SketchPlaneId } from "@/lib/store";
import {
  createPoint,
  createLine,
  createCircle,
  createRect,
  createArc,
  createSpline,
  createEllipse,
  createSlot,
  createPolygon,
} from "@/lib/sketch-entities";
import { autoDetectConstraints } from "@/lib/constraints";
import { solveConstraints } from "@/lib/constraint-solver";
import { trimLine } from "@/lib/sketch-ops/trim";
import { offsetEntity } from "@/lib/sketch-ops/offset";
import { mirrorEntity, type MirrorConfig } from "@/lib/sketch-ops/mirror";

interface SketchPlaneProps {
  firstClick: { x: number; z: number } | null;
  onFirstClickChange: (pt: { x: number; z: number } | null) => void;
  onCursorMove: (pt: { x: number; z: number } | null) => void;
  /** Normalized hand position from gesture tracking (0-1 screen coords) */
  handPosition: { x: number; y: number } | null;
  /** Current gesture string for display */
  gesture: string;
  /** Whether the hand is currently pinching (from hysteresis-based detection) */
  isPinching?: boolean;
}

/**
 * Get the THREE.Plane and coordinate extraction for a given sketch plane.
 * Supports: standard planes (xz/xy/yz), custom planes (by normal+offset),
 * and "3d" mode which projects onto a camera-facing plane through the origin.
 */
function getSketchPlane(planeId: SketchPlaneId, camera?: THREE.Camera, customPlanes?: any[]) {
  switch (planeId) {
    case "xz": // ground: normal Y-up, extract x and z
      return {
        plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        toSketch: (v: THREE.Vector3) => ({ x: v.x, z: v.z }),
      };
    case "xy": // front wall: normal Z-back, extract x and y
      return {
        plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
        toSketch: (v: THREE.Vector3) => ({ x: v.x, z: v.y }),
      };
    case "yz": // side wall: normal X-right, extract y and z
      return {
        plane: new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
        toSketch: (v: THREE.Vector3) => ({ x: v.z, z: v.y }),
      };
    case "3d": {
      // 3D sketch mode: uses XZ ground plane (y=0) regardless of camera angle.
      // Entities drawn in 3D mode use world X/Z coordinates directly.
      // The user can orbit the camera freely while drawing.
      // This is the safest approach — no NaN from degenerate camera angles.
      return {
        plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        toSketch: (v: THREE.Vector3) => ({ x: v.x, z: v.z }),
      };
    }
    default: {
      // Custom plane — look up by ID from customPlanes array
      if (customPlanes) {
        const cp = customPlanes.find((p: any) => p.id === planeId);
        if (cp) {
          const normal = new THREE.Vector3(cp.normal[0], cp.normal[1], cp.normal[2]);
          return {
            plane: new THREE.Plane(normal, -cp.offset),
            toSketch: (v: THREE.Vector3) => {
              // Project onto the custom plane's local 2D coords
              // Use the plane's tangent vectors
              const up = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
              const tangentU = new THREE.Vector3().crossVectors(up, normal).normalize();
              const tangentV = new THREE.Vector3().crossVectors(normal, tangentU).normalize();
              return { x: v.dot(tangentU), z: v.dot(tangentV) };
            },
          };
        }
      }
      // Unknown — fallback to XZ
      return {
        plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        toSketch: (v: THREE.Vector3) => ({ x: v.x, z: v.z }),
      };
    }
  }
}

/**
 * Projects screen NDC to a point on the active sketch plane.
 * Returns 2D sketch coordinates {x, z} mapped from the 3D intersection.
 * For "3d" mode, returns the raw 3D intersection point mapped to x/z.
 */
function projectToSketchPlane(
  ndcX: number,
  ndcY: number,
  camera: THREE.Camera,
  planeId: SketchPlaneId,
  customPlanes?: any[]
): { x: number; z: number } | null {
  const result = getSketchPlane(planeId, camera, customPlanes);
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersection = new THREE.Vector3();
  const hit = rc.ray.intersectPlane(result.plane, intersection);
  if (!hit) return null;

  // For 3D mode, use raw world coords as sketch coords
  if (planeId === "3d") {
    return { x: intersection.x, z: intersection.z };
  }
  return result.toSketch(intersection);
}

export function SketchPlane({
  firstClick,
  onFirstClickChange,
  onCursorMove,
  handPosition,
  gesture,
  isPinching: isPinchingProp,
}: SketchPlaneProps) {
  const { activeTool, entities: storeEntities, constraints: storeConstraints, sketchPlane: sketchPlaneId, customPlanes } = useCADState();
  const dispatch = useCADDispatch();
  const { camera, gl } = useThree();

  // Internal refs for multi-click tools — avoids stale closure issues
  const internalFirstClick = useRef<{ x: number; z: number } | null>(null);
  const internalSecondClick = useRef<{ x: number; z: number } | null>(null);
  const splinePoints = useRef<number[]>([]);

  const isSketchTool =
    activeTool === "draw" ||
    activeTool === "line" ||
    activeTool === "circle" ||
    activeTool === "rect" ||
    activeTool === "arc" ||
    activeTool === "spline" ||
    activeTool === "ellipse" ||
    activeTool === "slot" ||
    activeTool === "polygon" ||
    activeTool === "trim" ||
    activeTool === "offset" ||
    activeTool === "mirror" ||
    activeTool === "construction" ||
    activeTool === "dimension" ||
    activeTool === "sketch_3d" ||
    activeTool === "center_rect" ||
    activeTool === "three_point_circle" ||
    activeTool === "tangent_arc" ||
    activeTool === "sketch_text" ||
    activeTool === "sketch_linear_pattern" ||
    activeTool === "sketch_circular_pattern" ||
    activeTool === "use_project";

  // Stable refs to avoid re-registering DOM listeners on every render
  const isSketchToolRef = useRef(isSketchTool);
  const activeToolRef = useRef(activeTool);
  const onFirstClickChangeRef = useRef(onFirstClickChange);
  const onCursorMoveRef = useRef(onCursorMove);
  const dispatchRef = useRef(dispatch);

  isSketchToolRef.current = isSketchTool;
  activeToolRef.current = activeTool;
  onFirstClickChangeRef.current = onFirstClickChange;
  onCursorMoveRef.current = onCursorMove;
  dispatchRef.current = dispatch;

  const sketchPlaneRef = useRef(sketchPlaneId);
  sketchPlaneRef.current = sketchPlaneId;

  const customPlanesRef = useRef(customPlanes);
  customPlanesRef.current = customPlanes;

  const storeEntitiesRef = useRef(storeEntities);
  const storeConstraintsRef = useRef(storeConstraints);
  storeEntitiesRef.current = storeEntities;
  storeConstraintsRef.current = storeConstraints;

  /** Run constraint auto-detection and solving after entity creation. */
  const runConstraintPipeline = useCallback(async (newEntity: any) => {
    const allEntities = storeEntitiesRef.current;
    const existingConstraints = storeConstraintsRef.current;

    // Auto-detect constraints for the new entity
    const newConstraints = autoDetectConstraints(newEntity, allEntities);
    if (newConstraints.length > 0) {
      dispatchRef.current({ type: "ADD_CONSTRAINTS", constraints: newConstraints });
    }

    // Solve all constraints
    const allConstraints = [...existingConstraints, ...newConstraints];
    if (allConstraints.length > 0) {
      const result = await solveConstraints(allEntities, allConstraints);
      if (result.status === "solved" || result.status === "overconstrained") {
        dispatchRef.current({
          type: "UPDATE_ENTITIES_FROM_SOLVER",
          entities: result.entities,
          status: result.status,
        });
      }
    }
  }, []);

  // Sync parent firstClick to internal ref
  useEffect(() => {
    internalFirstClick.current = firstClick;
  }, [firstClick]);

  // When 3D Sketch is activated, switch to 3D plane + line tool
  useEffect(() => {
    if (activeTool === "sketch_3d") {
      // Set plane first, then switch tool after a tick so plane sticks
      dispatchRef.current({ type: "SET_SKETCH_PLANE", plane: "3d" });
      setTimeout(() => {
        dispatchRef.current({ type: "SET_TOOL", tool: "line" });
      }, 50);
    }
  }, [activeTool]);

  // Reset on tool change
  useEffect(() => {
    internalFirstClick.current = null;
    internalSecondClick.current = null;
    splinePoints.current = [];
    onFirstClickChangeRef.current(null);
  }, [activeTool]);

  // ─── Hand tracking: project hand position to 3D cursor ───
  useEffect(() => {
    if (!handPosition || !isSketchTool) {
      onCursorMoveRef.current(null);
      return;
    }
    // Convert normalized (0-1) hand position to NDC (-1 to 1)
    const ndcX = handPosition.x * 2 - 1;
    const ndcY = -(handPosition.y * 2 - 1); // flip Y
    const pt = projectToSketchPlane(ndcX, ndcY, camera, sketchPlaneRef.current, customPlanesRef.current);
    onCursorMoveRef.current(pt);
  }, [handPosition, camera, isSketchTool]);

  // ─── Hand tracking: pinch = "click" at hand position ───
  // Uses the hysteresis-based isPinching from gesture-overlay (not raw gesture string)
  const wasPinchingRef = useRef(false);
  const isPinchingRef = useRef(false);
  const handPositionRef = useRef(handPosition);
  isPinchingRef.current = isPinchingProp ?? (gesture === "pinch");
  handPositionRef.current = handPosition;

  useEffect(() => {
    // Poll pinch state on animation frame to avoid useEffect dependency loops
    let rafId: number;
    const checkPinch = () => {
      const wasPinching = wasPinchingRef.current;
      const isPinching = isPinchingRef.current;
      const pos = handPositionRef.current;

      if (isPinching && !wasPinching && pos && isSketchToolRef.current) {
        const ndcX = pos.x * 2 - 1;
        const ndcY = -(pos.y * 2 - 1);
        const pt = projectToSketchPlane(ndcX, ndcY, camera, sketchPlaneRef.current, customPlanesRef.current);
        if (pt) {
          handleSketchClick(pt);
        }
      }

      wasPinchingRef.current = isPinching;
      rafId = requestAnimationFrame(checkPinch);
    };
    rafId = requestAnimationFrame(checkPinch);
    return () => cancelAnimationFrame(rafId);
  }, [camera]); // Only depends on camera (stable ref)

  /** Stamp the current sketch plane onto an entity so it remembers where it was drawn */
  function addEntity(entity: any) {
    entity.plane = sketchPlaneRef.current;
    dispatchRef.current({ type: "ADD_ENTITY", entity });
    runConstraintPipeline(entity);
  }

  /** Find the nearest entity to a point */
  function findNearestEntity(pt: { x: number; z: number }): any | null {
    const entities = storeEntitiesRef.current;
    let best: any = null;
    let bestDist = 0.5; // max pick distance

    for (const e of entities) {
      let d = Infinity;
      if (e.type === "point") d = Math.hypot(pt.x - e.x, pt.z - e.z);
      else if (e.type === "line") {
        const mx = (e.x1 + e.x2) / 2, mz = (e.z1 + e.z2) / 2;
        d = Math.hypot(pt.x - mx, pt.z - mz);
      } else if (e.type === "circle") d = Math.abs(Math.hypot(pt.x - e.cx, pt.z - e.cz) - e.radius);
      else if (e.type === "rect") {
        const cx = (e.x1 + e.x2) / 2, cz = (e.z1 + e.z2) / 2;
        d = Math.hypot(pt.x - cx, pt.z - cz);
      } else if (e.type === "ellipse") d = Math.hypot(pt.x - e.cx, pt.z - e.cz);
      else if (e.type === "arc") d = Math.hypot(pt.x - e.mx, pt.z - e.mz);

      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  // ─── Shared click logic for both mouse and hand ───
  function handleSketchClick(pt: { x: number; z: number }) {
    const tool = activeToolRef.current;

    // ── Trim: click near an entity to split it at intersections ──
    if (tool === "trim") {
      const target = findNearestEntity(pt);
      if (target && target.type === "line") {
        const result = trimLine(target, storeEntitiesRef.current, pt);
        dispatchRef.current({ type: "REPLACE_ENTITIES", oldId: target.id, newEntities: result });
      }
      return;
    }

    // ── Offset: click near an entity to create a parallel copy ──
    if (tool === "offset") {
      const target = findNearestEntity(pt);
      if (target) {
        // Smart offset: 15% of entity size, min 0.1
        let offsetDist = 0.3;
        if (target.type === "circle") offsetDist = Math.max(target.radius * 0.15, 0.1);
        else if (target.type === "rect") offsetDist = Math.max(Math.abs(target.x2 - target.x1) * 0.15, 0.1);
        else if (target.type === "ellipse") offsetDist = Math.max(Math.max(target.radiusX, target.radiusZ) * 0.15, 0.1);
        const result = offsetEntity(target, offsetDist);
        if (result) addEntity(result);
      }
      return;
    }

    // ── Mirror: click near entity to mirror across X axis ──
    if (tool === "mirror") {
      const target = findNearestEntity(pt);
      if (target) {
        const config: MirrorConfig = { axis: "x" };
        const mirrored = mirrorEntity(target, config);
        addEntity(mirrored);
      }
      return;
    }

    // ── Construction: click near entity to toggle construction mode ──
    if (tool === "construction") {
      const target = findNearestEntity(pt);
      if (target) {
        dispatchRef.current({ type: "TOGGLE_CONSTRUCTION", entityId: target.id });
      }
      return;
    }

    // ── Dimension: click two points/entities to measure ──
    if (tool === "dimension") {
      if (!internalFirstClick.current) {
        internalFirstClick.current = pt;
        onFirstClickChangeRef.current(pt);
        return;
      }
      const fc = internalFirstClick.current;
      const distance = Math.hypot(pt.x - fc.x, pt.z - fc.z);
      const angle = Math.atan2(pt.z - fc.z, pt.x - fc.x) * (180 / Math.PI);
      // Dispatch dimension event for UI to display
      window.dispatchEvent(new CustomEvent("gesture-cad-dimension", {
        detail: {
          type: "linear",
          from: { x: fc.x, z: fc.z },
          to: { x: pt.x, z: pt.z },
          value: distance,
          angle: angle,
        }
      }));
      internalFirstClick.current = null;
      onFirstClickChangeRef.current(null);
      return;
    }

    // Center Point Rectangle: first click = center, second = corner
    if (tool === "center_rect") {
      const fc2 = internalFirstClick.current;
      if (!fc2) { internalFirstClick.current = pt; onFirstClickChangeRef.current(pt); return; }
      internalFirstClick.current = null;
      onFirstClickChangeRef.current(null);
      const dx = Math.abs(pt.x - fc2.x), dz = Math.abs(pt.z - fc2.z);
      addEntity(createRect(fc2.x - dx, fc2.z - dz, fc2.x + dx, fc2.z + dz));
      return;
    }

    // 3 Point Circle: 3 clicks define circumference points -> compute center & radius
    if (tool === "three_point_circle") {
      if (!internalFirstClick.current) { internalFirstClick.current = pt; onFirstClickChangeRef.current(pt); return; }
      if (!internalSecondClick.current) { internalSecondClick.current = pt; return; }
      const p1 = internalFirstClick.current, p2 = internalSecondClick.current, p3 = pt;
      const ax = p1.x, az = p1.z, bx = p2.x, bz = p2.z, cx = p3.x, cz = p3.z;
      const D = 2 * (ax * (bz - cz) + bx * (cz - az) + cx * (az - bz));
      if (Math.abs(D) < 1e-10) return; // Degenerate
      const ux = ((ax*ax + az*az) * (bz - cz) + (bx*bx + bz*bz) * (cz - az) + (cx*cx + cz*cz) * (az - bz)) / D;
      const uz = ((ax*ax + az*az) * (cx - bx) + (bx*bx + bz*bz) * (ax - cx) + (cx*cx + cz*cz) * (bx - ax)) / D;
      const radius = Math.hypot(ax - ux, az - uz);
      addEntity(createCircle(ux, uz, radius));
      internalFirstClick.current = null; internalSecondClick.current = null; onFirstClickChangeRef.current(null);
      return;
    }

    // Tangent Arc: auto-continues from last line endpoint
    if (tool === "tangent_arc") {
      const lines = storeEntitiesRef.current.filter((e) => e.type === "line") as any[];
      if (lines.length === 0) {
        // Fallback to normal arc behavior when no lines exist
        if (!internalFirstClick.current) {
          internalFirstClick.current = pt;
          onFirstClickChangeRef.current(pt);
          return;
        }
        if (!internalSecondClick.current) {
          internalSecondClick.current = pt;
          return;
        }
        const fc3 = internalFirstClick.current;
        const sc3 = internalSecondClick.current;
        addEntity(createArc(fc3.x, fc3.z, sc3.x, sc3.z, pt.x, pt.z));
        internalFirstClick.current = null; internalSecondClick.current = null; onFirstClickChangeRef.current(null);
        return;
      } else {
        const lastLine = lines[lines.length - 1];
        if (!internalFirstClick.current) {
          internalFirstClick.current = { x: lastLine.x2, z: lastLine.z2 };
          onFirstClickChangeRef.current({ x: lastLine.x2, z: lastLine.z2 });
          return;
        }
        const fcTan = internalFirstClick.current;
        const ldx = lastLine.x2 - lastLine.x1, ldz = lastLine.z2 - lastLine.z1;
        const mx = (fcTan.x + pt.x) / 2 + ldz * 0.3, mz = (fcTan.z + pt.z) / 2 - ldx * 0.3;
        addEntity(createArc(fcTan.x, fcTan.z, mx, mz, pt.x, pt.z));
        internalFirstClick.current = null; onFirstClickChangeRef.current(null);
        return;
      }
    }

    // Sketch Text: place text entity at click position as a construction point
    if (tool === "sketch_text") {
      const textEntity = createPoint(pt.x, pt.z);
      textEntity.isConstruction = true;
      addEntity(textEntity);
      return;
    }

    // Sketch Linear Pattern: duplicate last entity at click position
    if (tool === "sketch_linear_pattern") {
      const entities = storeEntitiesRef.current;
      if (entities.length > 0) {
        const last = entities[entities.length - 1] as any;
        if (last.type === "line") {
          addEntity(createLine(last.x1 + pt.x, last.z1 + pt.z, last.x2 + pt.x, last.z2 + pt.z));
        } else if (last.type === "circle") {
          addEntity(createCircle(pt.x, pt.z, last.radius));
        } else if (last.type === "rect") {
          const w = last.x2 - last.x1, h = last.z2 - last.z1;
          addEntity(createRect(pt.x, pt.z, pt.x + w, pt.z + h));
        } else {
          addEntity(createPoint(pt.x, pt.z));
        }
      }
      return;
    }

    // Sketch Circular Pattern: duplicate last entity at click position
    if (tool === "sketch_circular_pattern") {
      const entities = storeEntitiesRef.current;
      if (entities.length > 0) {
        const last = entities[entities.length - 1] as any;
        if (last.type === "circle") {
          addEntity(createCircle(pt.x, pt.z, last.radius));
        } else if (last.type === "rect") {
          const w = last.x2 - last.x1, h = last.z2 - last.z1;
          addEntity(createRect(pt.x, pt.z, pt.x + w, pt.z + h));
        } else if (last.type === "line") {
          const dx = pt.x - last.x1, dz = pt.z - last.z1;
          addEntity(createLine(last.x1 + dx, last.z1 + dz, last.x2 + dx, last.z2 + dz));
        } else {
          addEntity(createPoint(pt.x, pt.z));
        }
      }
      return;
    }

    // Use/Project: project 3D edge onto sketch as a construction line
    if (tool === "use_project") {
      addEntity(createLine(pt.x - 0.5, pt.z, pt.x + 0.5, pt.z));
      return;
    }

    if (tool === "draw") {
      addEntity(createPoint(pt.x, pt.z));
      return;
    }

    // Spline: multi-click, double-click (close to last point) to finish
    if (tool === "spline") {
      const pts = splinePoints.current;
      if (pts.length >= 4) {
        const lastX = pts[pts.length - 2];
        const lastZ = pts[pts.length - 1];
        const dist = Math.hypot(pt.x - lastX, pt.z - lastZ);
        if (dist < 0.2) {
          // Double-click → finish spline
          addEntity(createSpline([...pts]));
          splinePoints.current = [];
          onFirstClickChangeRef.current(null);
          return;
        }
      }
      pts.push(pt.x, pt.z);
      onFirstClickChangeRef.current(pt);
      return;
    }

    // Arc: 3-click tool (start, mid, end)
    if (tool === "arc") {
      if (!internalFirstClick.current) {
        internalFirstClick.current = pt;
        onFirstClickChangeRef.current(pt);
        return;
      }
      if (!internalSecondClick.current) {
        internalSecondClick.current = pt;
        return;
      }
      // Third click — create arc
      const fc = internalFirstClick.current;
      const sc = internalSecondClick.current;
      addEntity(createArc(fc.x, fc.z, sc.x, sc.z, pt.x, pt.z));
      internalFirstClick.current = null;
      internalSecondClick.current = null;
      onFirstClickChangeRef.current(null);
      return;
    }

    // 2-click tools: line, circle, rect
    const fc = internalFirstClick.current;
    if (!fc) {
      internalFirstClick.current = pt;
      onFirstClickChangeRef.current(pt);
      return;
    }

    // Second click — create entity
    internalFirstClick.current = null;
    onFirstClickChangeRef.current(null);

    let entity;
    if (tool === "line") {
      entity = createLine(fc.x, fc.z, pt.x, pt.z);
    } else if (tool === "circle") {
      const radius = Math.hypot(pt.x - fc.x, pt.z - fc.z);
      if (radius <= 0.01) return;
      entity = createCircle(fc.x, fc.z, radius);
    } else if (tool === "rect") {
      entity = createRect(fc.x, fc.z, pt.x, pt.z);
    } else if (tool === "ellipse") {
      const radiusX = Math.abs(pt.x - fc.x);
      const radiusZ = Math.abs(pt.z - fc.z);
      if (radiusX <= 0.01 && radiusZ <= 0.01) return;
      entity = createEllipse(fc.x, fc.z, radiusX, radiusZ, 0);
    } else if (tool === "slot") {
      const width = Math.hypot(pt.x - fc.x, pt.z - fc.z) * 0.3;
      entity = createSlot(fc.x, fc.z, pt.x, pt.z, Math.max(width, 0.1));
    } else if (tool === "polygon") {
      const radius = Math.hypot(pt.x - fc.x, pt.z - fc.z);
      if (radius <= 0.01) return;
      entity = createPolygon(fc.x, fc.z, radius, 6, 0);
    }

    if (entity) {
      addEntity(entity);
    }
  }

  // ─── Mouse drag state for moving entities ───
  const dragEntityRef = useRef<string | null>(null);
  const dragStartRef = useRef<{ x: number; z: number } | null>(null);
  const lastDragPtRef = useRef<{ x: number; z: number } | null>(null);

  // ─── Mouse/touch: DOM event listeners for sketch + select + move ───
  useEffect(() => {
    const canvas = gl.domElement;

    const toSketch = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      return projectToSketchPlane(mx, my, camera, sketchPlaneRef.current, customPlanesRef.current);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const pt = toSketch(e);
      if (!pt) return;

      const tool = activeToolRef.current;

      // SELECT tool: click to select, then drag to move
      if (tool === "select") {
        const nearest = findNearestEntity(pt);
        if (nearest) {
          dispatchRef.current({ type: "SELECT_ENTITY", entityId: nearest.id });
          dragEntityRef.current = nearest.id;
          dragStartRef.current = pt;
          lastDragPtRef.current = pt;
          // Tell OrbitControls to stop — we're dragging an entity
          window.dispatchEvent(new Event("gesture-cad-drag-start"));
        } else {
          dispatchRef.current({ type: "DESELECT_ALL" });
          dragEntityRef.current = null;
        }
        return;
      }

      if (!isSketchToolRef.current) return;
      handleSketchClick(pt);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const pt = toSketch(e);

      // If dragging an entity with select tool
      if (dragEntityRef.current && lastDragPtRef.current && pt && (e.buttons & 1)) {
        const dx = pt.x - lastDragPtRef.current.x;
        const dz = pt.z - lastDragPtRef.current.z;
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
          dispatchRef.current({ type: "MOVE_ENTITY", entityId: dragEntityRef.current, dx, dz });
          lastDragPtRef.current = pt;
        }
        return;
      }

      if (!isSketchToolRef.current) {
        onCursorMoveRef.current(null);
        return;
      }
      onCursorMoveRef.current(pt);
    };

    const handlePointerUp = () => {
      if (dragEntityRef.current) {
        // Tell OrbitControls it can resume
        window.dispatchEvent(new Event("gesture-cad-drag-end"));
      }
      dragEntityRef.current = null;
      dragStartRef.current = null;
      lastDragPtRef.current = null;
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl, camera]);

  return null;
}
