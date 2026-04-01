"use client";

import { useEffect, useRef, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCADState, useCADDispatch } from "@/lib/store";
import {
  createPoint,
  createLine,
  createCircle,
  createRect,
} from "@/lib/sketch-entities";
import { autoDetectConstraints } from "@/lib/constraints";
import { solveConstraints } from "@/lib/constraint-solver";

interface SketchPlaneProps {
  firstClick: { x: number; z: number } | null;
  onFirstClickChange: (pt: { x: number; z: number } | null) => void;
  onCursorMove: (pt: { x: number; z: number } | null) => void;
  /** Normalized hand position from gesture tracking (0-1 screen coords) */
  handPosition: { x: number; y: number } | null;
  /** Current gesture string for pinch-as-click detection */
  gesture: string;
}

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Projects a normalized screen position (0-1) to a point on the XZ ground plane.
 * Works for both mouse events (NDC coords) and hand tracking (normalized coords).
 */
function projectToGroundPlane(
  ndcX: number,
  ndcY: number,
  camera: THREE.Camera
): { x: number; z: number } | null {
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const intersection = new THREE.Vector3();
  const hit = rc.ray.intersectPlane(groundPlane, intersection);
  return hit ? { x: intersection.x, z: intersection.z } : null;
}

export function SketchPlane({
  firstClick,
  onFirstClickChange,
  onCursorMove,
  handPosition,
  gesture,
}: SketchPlaneProps) {
  const { activeTool, entities: storeEntities, constraints: storeConstraints } = useCADState();
  const dispatch = useCADDispatch();
  const { camera, gl } = useThree();

  // Internal ref for first click — avoids stale closure issues
  const internalFirstClick = useRef<{ x: number; z: number } | null>(null);

  const isSketchTool =
    activeTool === "draw" ||
    activeTool === "line" ||
    activeTool === "circle" ||
    activeTool === "rect";

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

  // Reset on tool change
  useEffect(() => {
    internalFirstClick.current = null;
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
    const pt = projectToGroundPlane(ndcX, ndcY, camera);
    onCursorMoveRef.current(pt);
  }, [handPosition, camera, isSketchTool]);

  // ─── Hand tracking: pinch gesture = "click" at hand position ───
  const prevGestureRef = useRef<string>("none");
  useEffect(() => {
    const wasPinching = prevGestureRef.current === "pinch";
    const isPinching = gesture === "pinch";
    prevGestureRef.current = gesture;

    // Trigger on pinch START (transition from non-pinch to pinch)
    if (isPinching && !wasPinching && handPosition && isSketchTool) {
      const ndcX = handPosition.x * 2 - 1;
      const ndcY = -(handPosition.y * 2 - 1);
      const pt = projectToGroundPlane(ndcX, ndcY, camera);
      if (!pt) return;

      handleSketchClick(pt);
    }
  }, [gesture, handPosition, camera, isSketchTool]);

  // ─── Shared click logic for both mouse and hand ───
  function handleSketchClick(pt: { x: number; z: number }) {
    const tool = activeToolRef.current;

    if (tool === "draw") {
      const entity = createPoint(pt.x, pt.z);
      dispatchRef.current({ type: "ADD_ENTITY", entity });
      runConstraintPipeline(entity);
      return;
    }

    // 2-click tools
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
    }

    if (entity) {
      dispatchRef.current({ type: "ADD_ENTITY", entity });
      runConstraintPipeline(entity);
    }
  }

  // ─── Mouse/touch: DOM event listeners for sketch input ───
  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (!isSketchToolRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const pt = projectToGroundPlane(mx, my, camera);
      if (!pt) return;

      handleSketchClick(pt);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isSketchToolRef.current) {
        onCursorMoveRef.current(null);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const pt = projectToGroundPlane(mx, my, camera);
      onCursorMoveRef.current(pt);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
    };
  }, [gl, camera]);

  return null;
}
