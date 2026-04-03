"use client";

import { Viewport } from "@/components/viewport/viewport";
import { ViewportOverlay } from "@/components/viewport/viewport-overlay";
import { GestureOverlay, type TrackedHandData } from "@/components/gesture/gesture-overlay";
import { HandCursor } from "@/components/gesture/hand-cursor";
import { useFreehandDraw } from "@/components/gesture/freehand-draw";
import { Toolbar } from "@/components/toolbar/toolbar";
import { StatusBar } from "@/components/toolbar/status-bar";
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay";
import { FeatureTreePanel } from "@/components/feature-tree/feature-tree-panel";
import { ParameterPanel } from "@/components/parameter-panel/parameter-panel";
import { WorkbenchSidebar } from "@/components/workbench/workbench-sidebar";
import { DragDropZone } from "@/components/file-io/drag-drop-zone";
import { useCADState, useCADDispatch, type ToolId } from "@/lib/store";
import { createExtrudeFeature, createFilletFeature, createChamferFeature, createPocketFeature, createLoftFeature, createSweepFeature, createDraftFeature, createHoleFeature, createRibFeature, createSplitFeature, createThickenFeature, createHelixFeature, createCurvePatternFeature, createEmbossFeature, generateExtrudePreviewMesh, generateRevolvePreviewMesh, generateHolePreviewMesh, generateHelixMesh, generateEmbossPreviewMesh, extrudeEntityToMesh } from "@/lib/features";
import { performBoolean, type BooleanOp } from "@/lib/boolean-ops";
import { applyShellPreview, applyDraftPreview, applySplitPreview, applyThickenPreview } from "@/lib/modeling-ops";
import { linearPattern, circularPattern, curvePattern } from "@/lib/pattern-ops";
import { generatePrimitive } from "@/lib/primitives";
import { GestureInteractionManager, type TwoHandGesture, type TwoHandDelta, type ExtrudeGestureState } from "@/lib/gesture-engine";
import { replayFeatures } from "@/lib/feature-tree/feature-replay";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ParameterDialog, TOOL_PARAMS, type ToolParamConfig } from "@/components/toolbar/parameter-dialog";
import { confirmInBackground } from "@/lib/backend-confirm";
import { IntegratedTerminal } from "@/components/terminal/integrated-terminal";
import type { InteractionEvent, HitTarget, TrackedHand } from "@/lib/gesture-engine/types";
import type { TessellatedMesh } from "@/lib/features";
import { createPoint, createLine, createRect, createCircle, createEllipse, createPolygon, createSlot, createArc } from "@/lib/sketch-entities";
import dynamic from "next/dynamic";

// Lazy-loaded Blender 3D pipeline panels
const TimelinePanel = dynamic(() => import("@/components/animation/timeline-panel").then(m => ({ default: m.TimelinePanel })), { ssr: false });
const GraphEditorPanel = dynamic(() => import("@/components/animation/graph-editor").then(m => ({ default: m.GraphEditor })), { ssr: false });
const UVEditorPanel = dynamic(() => import("@/components/uv-editor/uv-editor-panel"), { ssr: false });
const ShaderGraphEditor = dynamic(() => import("@/components/shader-editor/shader-graph"), { ssr: false });
const SculptOverlay = dynamic(() => import("@/components/sculpting/sculpt-overlay").then(m => ({ default: m.SculptOverlay })), { ssr: false });
const BoneEditor = dynamic(() => import("@/components/rigging/bone-editor").then(m => ({ default: m.BoneEditor })), { ssr: false });

/** Legacy gesture→tool mapping (fallback when interaction manager is not active) */
const GESTURE_TO_TOOL: Record<string, ToolId> = {
  point: "draw",
  fist: "select",
  open_palm: "pan",
  peace: "line",
  three_fingers: "circle",
  l_shape: "rect",
  thumbs_up: "apply",
};

export default function Home() {
  const { entities, activeTool, features, sketchPlane, interactionMode, bottomPanel, sculptBrush, sculptRadius, sculptStrength, isAnimationPlaying, animationTime, animationFps } = useCADState();
  const dispatch = useCADDispatch();
  const [gesture, setGesture] = useState<string>("none");
  const gestureRef = useRef<string>("none");
  const [fps, setFps] = useState<number>(0);
  const [trackingActive, setTrackingActive] = useState(false);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const smoothedPosRef = useRef<{ x: number; y: number } | null>(null);
  const handPosTickRef = useRef(0);
  const handPinchingRef = useRef(false);
  const [handPinching, setHandPinching] = useState(false);

  // Hand navigation — use ref instead of state to avoid re-render loops
  const handNavRef = useRef<{ type: "pan" | "orbit"; dx: number; dy: number } | null>(null);
  const prevNavPosRef = useRef<{ x: number; y: number } | null>(null);

  // Freehand drawing with finger trace
  const freehand = useFreehandDraw();

  // Two-hand gesture state for viewport control
  const [viewportGesture, setViewportGesture] = useState<{
    type: TwoHandGesture;
    zoomFactor: number;
    rotationDegrees: number;
    panDelta: { x: number; y: number };
  } | null>(null);

  // Interactive extrude preview mesh
  const [extrudePreview, setExtrudePreview] = useState<{
    mesh: TessellatedMesh;
    distance: number;
  } | null>(null);

  // Interactive extrude state: click entity → drag to set height
  const [extrudeState, setExtrudeState] = useState<{
    phase: "picking" | "dragging" | "idle";
    entityId: string | null;
    entity: any | null;
    startY: number;
    currentDistance: number;
  }>({ phase: "idle", entityId: null, entity: null, startY: 0, currentDistance: 0 });

  // Active gesture combo display
  const [gestureCombo, setGestureCombo] = useState<string | null>(null);

  // Parameter dialog state — shown before applying Part Design operations
  const [paramDialog, setParamDialog] = useState<{ tool: string; config: ToolParamConfig } | null>(null);

  // Hand tracking telemetry overlay (toggle with F9)
  const [showTelemetry, setShowTelemetry] = useState(false);

  // Integrated terminal (toggle with Ctrl+`)
  const [showTerminal, setShowTerminal] = useState(false);

  // Gesture Interaction Manager (touchscreen-like direct manipulation)
  const interactionManager = useMemo(() => new GestureInteractionManager(), []);

  // Keep interaction manager in sync with CAD state
  useEffect(() => {
    interactionManager.setHitTestContext(entities, features, sketchPlane);
  }, [entities, features, sketchPlane, interactionManager]);

  useEffect(() => {
    interactionManager.setActiveTool(activeTool);
  }, [activeTool, interactionManager]);

  // Subscribe to interaction events
  useEffect(() => {
    const unsubInteraction = interactionManager.onInteraction((event: InteractionEvent) => {
      switch (event.action) {
        case "select":
          if (event.hitTarget?.entityId) {
            dispatch({ type: "SELECT_ENTITY", entityId: event.hitTarget.entityId });
          } else if (event.hitTarget?.featureId) {
            dispatch({ type: "SELECT_FEATURE", id: event.hitTarget.featureId });
          }
          break;

        case "move":
          if (event.hitTarget?.entityId && event.dragDelta) {
            dispatch({
              type: "MOVE_ENTITY",
              entityId: event.hitTarget.entityId,
              dx: event.dragDelta.x * 10, // Scale from normalized to world
              dz: event.dragDelta.y * 10,
            });
          }
          break;

        case "draw":
          // Drawing is still handled by sketch-plane for now (click-based)
          break;

        case "pan_viewport":
        case "orbit_viewport":
        case "zoom_viewport":
          // Viewport control handled by viewport component via props
          break;

        case "extrude_interactive":
          // Interactive extrude via gesture will be wired in Sprint 3
          break;
      }
    });

    const unsubHover = interactionManager.onHover((target: HitTarget | null) => {
      dispatch({ type: "HOVER_ENTITY", entityId: target?.entityId ?? null });
    });

    const unsubSwipe = interactionManager.onSwipe((direction) => {
      if (direction === "left") dispatch({ type: "UNDO" });
      if (direction === "right") dispatch({ type: "REDO" });
    });

    // Two-hand gestures → viewport control
    const unsubTwoHand = interactionManager.onTwoHandGesture(
      (gesture: TwoHandGesture, delta: TwoHandDelta) => {
        setViewportGesture({
          type: gesture,
          zoomFactor: delta.zoomFactor,
          rotationDegrees: delta.rotationDegrees,
          panDelta: delta.midpointDelta,
        });

        // Show combo HUD
        const label = gesture === "zoom" ? "Zoom" : gesture === "rotate" ? "Orbit" : "Pan";
        setGestureCombo(`Two-Hand ${label}`);
        setTimeout(() => setGestureCombo(null), 500);
      }
    );

    // Interactive extrude preview
    const unsubExtrude = interactionManager.onExtrudeGesture(
      (state: ExtrudeGestureState) => {
        if (state.active && state.previewMesh) {
          setExtrudePreview({
            mesh: state.previewMesh,
            distance: state.distance,
          });
          setGestureCombo(`Extrude: ${state.distance.toFixed(2)}${state.direction === "up" ? "↑" : "↓"}`);
        } else {
          setExtrudePreview(null);
        }
      }
    );

    // Gesture sequences (tap, double-tap, long-press)
    const unsubSequence = interactionManager.onGestureSequence((event) => {
      if (event.type === "double_tap") {
        // Double-tap to deselect all
        dispatch({ type: "DESELECT_ALL" });
      }
    });

    return () => {
      unsubInteraction();
      unsubHover();
      unsubSwipe();
      unsubTwoHand();
      unsubExtrude();
      unsubSequence();
    };
  }, [interactionManager, dispatch]);

  // Cleanup
  useEffect(() => {
    return () => interactionManager.destroy();
  }, [interactionManager]);

  /** Dispatch a feature and async-confirm with the backend */
  const addFeatureWithBackend = useCallback((feature: any) => {
    dispatch({ type: "ADD_FEATURE", feature });
    const updater = (id: string, updates: any) => dispatch({ type: "UPDATE_FEATURE", id, updates });
    confirmInBackground(feature, updater);
  }, [dispatch]);

  // Auto-replay disabled — features update via backend confirmation.

  // ═══════════════════════════════════════════
  // Interactive Extrude: click entity → drag height → confirm
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (activeTool !== "extrude") {
      if (extrudeState.phase !== "idle") {
        setExtrudeState({ phase: "idle", entityId: null, entity: null, startY: 0, currentDistance: 0 });
        setExtrudePreview(null);
      }
      return;
    }

    // Enter picking phase when extrude tool is activated
    if (extrudeState.phase === "idle") {
      setExtrudeState({ phase: "picking", entityId: null, entity: null, startY: 0, currentDistance: 0 });
    }
  }, [activeTool]);

  // Listen for canvas clicks/drags when in extrude mode
  useEffect(() => {
    if (activeTool !== "extrude") return;

    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // left click only

      if (extrudeState.phase === "picking") {
        // Find the nearest entity to click position
        // Pick the closest entity by checking all entities
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Find entity — try to pick based on screen position
        // For simplicity, let user click anywhere and we pick the nearest extrudable entity
        const extrudable = entities.filter((ent: any) => ent.type !== "point");
        if (extrudable.length === 0) return;

        // Use the last entity if only one, otherwise find nearest
        const picked = extrudable[extrudable.length - 1];

        // Generate initial preview at height 0
        const mesh = extrudeEntityToMesh(picked, 0.01);
        if (mesh) {
          setExtrudePreview({ mesh, distance: 0.01 });
          setExtrudeState({
            phase: "dragging",
            entityId: picked.id,
            entity: picked,
            startY: e.clientY,
            currentDistance: 0.01,
          });
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (extrudeState.phase !== "dragging" || !extrudeState.entity) return;

      // Calculate distance from drag delta (pixels → world units)
      const deltaY = extrudeState.startY - e.clientY; // up = positive
      const dist = Math.max(0.01, deltaY * 0.02); // scale: 50px = 1 unit

      const mesh = extrudeEntityToMesh(extrudeState.entity, dist);
      if (mesh) {
        setExtrudePreview({ mesh, distance: dist });
        setExtrudeState((prev) => ({ ...prev, currentDistance: dist }));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (extrudeState.phase !== "dragging" || !extrudeState.entity) return;

      const dist = extrudeState.currentDistance;
      if (dist > 0.05) {
        // Confirm extrude
        const mesh = extrudeEntityToMesh(extrudeState.entity, dist);
        if (mesh) {
          addFeatureWithBackend(
            createExtrudeFeature([extrudeState.entityId!], { distance: dist, direction: "up" }, mesh)
          );
        }
      }

      setExtrudePreview(null);
      setExtrudeState({ phase: "idle", entityId: null, entity: null, startY: 0, currentDistance: 0 });
      dispatch({ type: "SET_TOOL", tool: "select" });
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeTool, extrudeState, entities, dispatch, addFeatureWithBackend]);

  // Handle full hand tracking data from gesture overlay → interaction manager
  const handleHandsTracked = useCallback(
    (hands: TrackedHandData[]) => {
      const trackedHands: TrackedHand[] = hands.map((h) => ({
        handedness: h.handedness,
        role: "unassigned" as const,
        landmarks: h.landmarks,
        gesture: h.gesture as any,
        screenPosition: h.screenPosition,
        pinchDistance: h.pinchDistance,
        isPinching: h.isPinching,
        confidence: h.confidence,
        timestamp: performance.now(),
      }));
      interactionManager.updateHands(trackedHands, performance.now());

      // Track dominant hand pinch state for hand cursor
      const dominant = hands.find((h) => h.handedness === "Right") || hands[0];
      if (dominant) {
        // Only update state on pinch transitions (not every frame)
        if (dominant.isPinching !== handPinchingRef.current) {
          handPinchingRef.current = dominant.isPinching;
          setHandPinching(dominant.isPinching);
        }

        // Open palm = pan, peace sign (2 fingers) = orbit
        // Peace sign (2 fingers) = pan in all directions
        // Open palm = do nothing (just hover)
        const isPan = dominant.gesture === "peace";
        const isOrbit = false;

        if ((isPan || isOrbit) && !dominant.isPinching) {
          const pos = dominant.screenPosition;
          const prev = prevNavPosRef.current;
          if (prev) {
            const dx = pos.x - prev.x;
            const dy = pos.y - prev.y;
            // Dead zone: ignore tiny movements (hand tremor)
            const deadZone = 0.005;
            const adx = Math.abs(dx) > deadZone ? dx : 0;
            const ady = Math.abs(dy) > deadZone ? dy : 0;
            if (adx !== 0 || ady !== 0) {
              handNavRef.current = { type: isPan ? "pan" : "orbit", dx: adx, dy: ady };
            }
          }
          prevNavPosRef.current = { x: pos.x, y: pos.y };
        } else {
          prevNavPosRef.current = null;
          handNavRef.current = null;
        }
      } else {
        if (handPinchingRef.current) {
          handPinchingRef.current = false;
          setHandPinching(false);
        }
        prevNavPosRef.current = null;
        handNavRef.current = null;
      }
    },
    [interactionManager]
  );

  // Gesture → tool switching with stability filter
  const editingFeatureRef = useRef<string | null>(null);
  const lastGestureRef = useRef<string>("none");
  const gestureStableCountRef = useRef(0);
  const GESTURE_STABILITY_FRAMES = 8; // Need 8 consecutive frames of same gesture

  const handleGestureDetected = useCallback(
    (detected: string) => {
      // Only trigger re-render when gesture actually changes
      if (detected !== gestureRef.current) {
        gestureRef.current = detected;
        setGesture(detected);
      }

      // Pinch is handled as touch/click, not tool switch
      if (detected === "pinch") return;
      if (detected === "none" || detected === "unknown") {
        gestureStableCountRef.current = 0;
        return;
      }

      // Count consecutive frames of the same gesture
      if (detected === lastGestureRef.current) {
        gestureStableCountRef.current++;
      } else {
        lastGestureRef.current = detected;
        gestureStableCountRef.current = 1;
      }

      // Switch tool once gesture is stable
      if (gestureStableCountRef.current === GESTURE_STABILITY_FRAMES) {
        const tool = GESTURE_TO_TOOL[detected];
        if (tool) {
          console.log("[GestureCAD] Tool switch:", detected, "→", tool);
          dispatch({ type: "SET_TOOL", tool });
        }
      }
    },
    [dispatch]
  );

  const handleHandPosition = useCallback(
    (pos: { x: number; y: number } | null) => {
      if (!pos) {
        smoothedPosRef.current = null;
        // Only setState on null transition
        handPosTickRef.current = 0;
        setHandPosition(null);
        return;
      }

      // EMA smoothing
      const prev = smoothedPosRef.current;
      if (prev) {
        prev.x += 0.7 * (pos.x - prev.x);
        prev.y += 0.7 * (pos.y - prev.y);
      } else {
        smoothedPosRef.current = { x: pos.x, y: pos.y };
      }

      // Throttle: only push to React state every 5th detection (~6fps setState, cursor uses CSS)
      handPosTickRef.current++;
      if (handPosTickRef.current % 5 === 0) {
        const s = smoothedPosRef.current!;
        setHandPosition({ x: s.x, y: s.y });
      }
    },
    []
  );

  // Boolean: combine last two features with mesh (no dialog needed)
  const handleBoolean = useCallback((op: BooleanOp) => {
    const withMesh = features.filter((f) => f.mesh);
    if (withMesh.length < 2) return;
    const a = withMesh[withMesh.length - 2];
    const b = withMesh[withMesh.length - 1];
    if (!a.mesh || !b.mesh) return;

    const resultMesh = performBoolean(a.mesh, b.mesh, op);
    const feature = createExtrudeFeature([], { distance: 0, direction: "up" }, resultMesh);
    feature.name = `${op.charAt(0).toUpperCase() + op.slice(1)} Result`;
    addFeatureWithBackend(feature);
    dispatch({ type: "SET_TOOL", tool: "select" });
  }, [features, dispatch, addFeatureWithBackend]);

  // Helper: axis string to vector
  const axisToVec = (axis: string): [number, number, number] =>
    axis === "x" ? [1, 0, 0] : axis === "z" ? [0, 0, 1] : [0, 1, 0];

  // Helper: get mesh centroid
  const meshCentroid = (verts: number[]): [number, number, number] => {
    let cx = 0, cy = 0, cz = 0;
    const count = verts.length / 3;
    for (let i = 0; i < verts.length; i += 3) { cx += verts[i]; cy += verts[i + 1]; cz += verts[i + 2]; }
    return count > 0 ? [cx / count, cy / count, cz / count] : [0, 0, 0];
  };

  // NOTE: All old hardcoded handlers have been removed.
  // Every tool now goes through applyWithParams via the parameter dialog.
  // handleSweep/handleLoft/handleCurvePattern are inlined into applyWithParams.

  const handleCurvePattern = useCallback(() => {
    const last = features.filter((f) => f.mesh).pop();
    if (!last?.mesh) return;
    const lines = entities.filter((e) => e.type === "line");
    if (lines.length === 0) return;
    const l = lines[lines.length - 1];
    const pathPoints: [number, number, number][] = [
      [l.x1, 0, l.z1],
      [l.x2, 0, l.z2],
    ];
    const patternMesh = curvePattern(last.mesh, pathPoints, 3, true);
    const feat = createCurvePatternFeature([last.id, l.id], { pathId: l.id, count: 3, keepOrientation: true, spacing: 0 }, patternMesh);
    dispatch({ type: "ADD_FEATURE", feature: feat });
    dispatch({ type: "SET_TOOL", tool: "select" });
  }, [features, entities, dispatch]);

  // Tools that show parameter dialog before applying
  const DIALOG_TOOLS = new Set([
    "revolve_tool", "fillet", "chamfer", "shell", "draft", "hole", "rib",
    "split", "thicken", "helix", "sweep", "loft",
    "linear_pattern", "circular_pattern", "curve_pattern",
    "custom_plane", "emboss",
    "external_thread", "modify_fillet", "move_face", "delete_face",
    "replace_face", "offset_face", "delete_part", "transform_part",
    "mate_connector", "construction_axis", "construction_point", "frame_tool",
  ]);

  // Apply operation with user-specified parameters from dialog
  const applyWithParams = useCallback((tool: string, params: Record<string, number | string | boolean>) => {
    setParamDialog(null);
    const n = Number;

    switch (tool) {
      case "extrude": {
        const dist = n(params.distance) || 2;
        const dir = String(params.direction ?? "up") as "up" | "down" | "both";
        const boolMode = String(params.booleanMode ?? "add");

        // Use the LAST entity drawn — whatever type it is
        const extrudable = entities.filter((e) => e.type !== "point");
        const lastEntity = extrudable.length > 0 ? extrudable[extrudable.length - 1] : null;

        let extrudeMesh: TessellatedMesh | null = null;
        let sourceIds: string[] = [];

        if (lastEntity) {
          extrudeMesh = extrudeEntityToMesh(lastEntity, dist);
          sourceIds = [lastEntity.id];
        }

        if (extrudeMesh) {
          if (boolMode === "remove") {
            // Extrude Remove: subtract the new extrusion from the last existing feature
            const lastFeature = features.filter((f) => f.mesh).pop();
            if (lastFeature?.mesh) {
              const combined = performBoolean(lastFeature.mesh, extrudeMesh, "subtract");
              const feat = createPocketFeature(sourceIds, { depth: dist, direction: dir === "down" ? "down" : "up" }, combined);
              feat.name = `Extrude Remove D${dist}`;
              addFeatureWithBackend(feat);
            }
          } else if (boolMode === "intersect") {
            const lastFeature = features.filter((f) => f.mesh).pop();
            if (lastFeature?.mesh) {
              const combined = performBoolean(lastFeature.mesh, extrudeMesh, "intersect");
              const feat = createExtrudeFeature(sourceIds, { distance: dist, direction: dir }, combined);
              feat.name = `Extrude Intersect D${dist}`;
              addFeatureWithBackend(feat);
            }
          } else {
            // Add mode (default)
            addFeatureWithBackend(createExtrudeFeature(sourceIds, { distance: dist, direction: dir }, extrudeMesh));
          }
        }
        break;
      }
      case "revolve_tool": {
        const angle = n(params.angle) || 360;
        const axis = String(params.axis ?? "y") as "x" | "y" | "z";
        const circles = entities.filter((e) => e.type === "circle");
        const rects = entities.filter((e) => e.type === "rect");
        // Revolve the last circle or rect profile
        if (circles.length > 0) {
          const c = circles[circles.length - 1];
          const height = c.radius * 2 * Math.PI * (angle / 360);
          const mesh = generateRevolvePreviewMesh(c.cx, c.cz, c.radius, height);
          const feat = createExtrudeFeature([c.id], { distance: height, direction: "up" }, mesh);
          feat.name = `Revolve ${angle}°`;
          feat.type = "revolve";
          addFeatureWithBackend(feat);
        } else if (rects.length > 0) {
          const r = rects[rects.length - 1];
          const w = Math.abs(r.x2 - r.x1), h = Math.abs(r.z2 - r.z1);
          const mesh = generateRevolvePreviewMesh((r.x1 + r.x2) / 2, (r.z1 + r.z2) / 2, Math.max(w, h) / 2, w);
          const feat = createExtrudeFeature([r.id], { distance: w, direction: "up" }, mesh);
          feat.name = `Revolve ${angle}°`;
          feat.type = "revolve";
          addFeatureWithBackend(feat);
        }
        break;
      }
      case "fillet": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) addFeatureWithBackend(createFilletFeature(last.id, { radius: n(params.radius) || 0.3, edgeIndices: [] }, last.mesh));
        break;
      }
      case "chamfer": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) addFeatureWithBackend(createChamferFeature(last.id, { distance: n(params.distance) || 0.2, edgeIndices: [] }, last.mesh));
        break;
      }
      case "shell": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          const shellMesh = applyShellPreview(last.mesh, { faceIndex: 0, thickness: n(params.thickness) || 0.2 });
          const feat = createExtrudeFeature([], { distance: 0, direction: "up" }, shellMesh);
          feat.name = `Shell T${params.thickness}`;
          addFeatureWithBackend(feat);
        }
        break;
      }
      case "draft": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          const pullAxis = String(params.pullDir ?? "y");
          const pullDir: [number, number, number] = pullAxis === "x" ? [1,0,0] : pullAxis === "z" ? [0,0,1] : [0,1,0];
          const draftMesh = applyDraftPreview(last.mesh, { faceIndices: [], angle: n(params.angle) || 5, pullDirection: pullDir });
          addFeatureWithBackend(createDraftFeature([last.id], { angle: n(params.angle) || 5, pullDirection: pullDir, faceIndices: [], neutralPlaneOffset: 0 }, draftMesh));
        }
        break;
      }
      case "hole": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          const diam = n(params.diameter) || 5;
          const depth = n(params.depth) || 10;
          const ht = String(params.holeType ?? "simple") as "simple" | "counterbore" | "countersink" | "tapped";
          // Compute center from last feature's mesh centroid
          const hVerts = last.mesh.vertices;
          let holeCx = 0, holeCy = 0, holeCz = 0;
          const hCount = hVerts.length / 3;
          for (let hi = 0; hi < hVerts.length; hi += 3) { holeCx += hVerts[hi]; holeCy += hVerts[hi+1]; holeCz += hVerts[hi+2]; }
          if (hCount > 0) { holeCx /= hCount; holeCy /= hCount; holeCz /= hCount; }
          const holeMesh = generateHolePreviewMesh(holeCx, holeCy, holeCz, diam, depth, ht);
          addFeatureWithBackend(createHoleFeature([last.id], { center: [holeCx,holeCy,holeCz], diameter: diam, depth, holeType: ht }, holeMesh));
        }
        break;
      }
      case "rib": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          const feat = createRibFeature([last.id], { profileIds: [], thickness: n(params.thickness) || 0.2, direction: String(params.direction ?? "parallel") as "parallel" | "perpendicular" }, last.mesh);
          addFeatureWithBackend(feat);
        }
        break;
      }
      case "split": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          const axis = String(params.planeAxis ?? "y");
          const normal: [number, number, number] = axis === "x" ? [1,0,0] : axis === "z" ? [0,0,1] : [0,1,0];
          const side = String(params.keepSide ?? "above") as "above" | "below" | "both";
          const splitMesh = applySplitPreview(last.mesh, normal, n(params.offset) || 0, side);
          addFeatureWithBackend(createSplitFeature([last.id], { splitType: "plane", splitReference: normal, offset: n(params.offset) || 0, keepSide: side }, splitMesh));
        }
        break;
      }
      case "thicken": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          const dir = String(params.direction ?? "outward") as "inward" | "outward" | "both";
          const thickMesh = applyThickenPreview(last.mesh, n(params.thickness) || 0.3, dir);
          addFeatureWithBackend(createThickenFeature([last.id], { surfaceId: last.id, thickness: n(params.thickness) || 0.3, direction: dir }, thickMesh));
        }
        break;
      }
      case "helix": {
        const hp = { center: [0,0,0] as [number, number, number], radius: n(params.radius) || 1, pitch: n(params.pitch) || 0.5, height: n(params.height) || 3, taperAngle: n(params.taperAngle) || 0, clockwise: Boolean(params.clockwise) };
        addFeatureWithBackend(createHelixFeature(hp, generateHelixMesh(hp)));
        break;
      }
      case "sweep": {
        // Sweep: use last circle as profile + last line as path
        const sweepCircles = entities.filter((e) => e.type === "circle");
        const sweepLines = entities.filter((e) => e.type === "line");
        if (sweepCircles.length > 0 && sweepLines.length > 0) {
          const sc = sweepCircles[sweepCircles.length - 1];
          const sl = sweepLines[sweepLines.length - 1];
          const sweepLen = Math.hypot(sl.x2 - sl.x1, sl.z2 - sl.z1);
          const sweepMesh = generateRevolvePreviewMesh(sc.cx, sc.cz, sc.radius, sweepLen);
          const sweepFeat = createExtrudeFeature([sc.id, sl.id], { distance: sweepLen, direction: "up" }, sweepMesh);
          sweepFeat.name = "Sweep";
          sweepFeat.type = "sweep";
          addFeatureWithBackend(sweepFeat);
        }
        break;
      }
      case "loft": {
        // Loft: use last two profiles
        const loftHeight = n(params.height) || 3;
        const profiles = entities.filter((e) => e.type === "rect" || e.type === "circle" || e.type === "ellipse" || e.type === "polygon");
        if (profiles.length >= 1) {
          const loftEntity = profiles[profiles.length - 1];
          const loftMesh = extrudeEntityToMesh(loftEntity, loftHeight);
          if (loftMesh) {
            const loftFeat = createExtrudeFeature([loftEntity.id], { distance: loftHeight, direction: "up" }, loftMesh);
            loftFeat.name = "Loft";
            loftFeat.type = "loft";
            addFeatureWithBackend(loftFeat);
          }
        }
        break;
      }
      case "linear_pattern": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          // linearPattern already imported at top
          const axis = String(params.dirAxis ?? "x");
          const dir: [number, number, number] = axis === "y" ? [0,1,0] : axis === "z" ? [0,0,1] : [1,0,0];
          const patternMesh = linearPattern(last.mesh, dir, n(params.count) || 3, n(params.spacing) || 2);
          const feat = createExtrudeFeature([last.id], { distance: 0, direction: "up" }, patternMesh);
          feat.name = `Linear Pattern ×${params.count}`;
          feat.type = "linear_pattern";
          addFeatureWithBackend(feat);
        }
        break;
      }
      case "circular_pattern": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          // circularPattern already imported at top
          const patternMesh = circularPattern(last.mesh, [0,1,0], [0,0,0], n(params.count) || 4, n(params.angle) || 360);
          const feat = createExtrudeFeature([last.id], { distance: 0, direction: "up" }, patternMesh);
          feat.name = `Circular Pattern ×${params.count}`;
          feat.type = "circular_pattern";
          addFeatureWithBackend(feat);
        }
        break;
      }
      case "curve_pattern": {
        handleCurvePattern();
        break;
      }
      case "custom_plane": {
        const axis = String(params.normal ?? "y");
        const normal: [number, number, number] = axis === "x" ? [1,0,0] : axis === "z" ? [0,0,1] : [0,1,0];
        const offset = Number(params.offset) || 0;
        const id = `plane_${Date.now()}`;
        dispatch({ type: "ADD_CUSTOM_PLANE", plane: { id, name: `Plane (${axis} + ${offset})`, normal, offset } });
        break;
      }
      case "emboss": {
        const text = String(params.text ?? "CAD");
        const fontSize = Number(params.fontSize) || 0.5;
        const depth = Number(params.depth) || 0.1;
        const mesh = generateEmbossPreviewMesh(text, fontSize, depth);
        addFeatureWithBackend(createEmbossFeature([], { text, fontSize, depth, mode: String(params.mode ?? "add") as "add"|"remove", faceIndex: 0 }, mesh));
        break;
      }
      case "external_thread":
      case "modify_fillet":
      case "move_face":
      case "delete_face":
      case "replace_face":
      case "offset_face": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          const feat = createExtrudeFeature([last.id], { distance: 0, direction: "up" }, last.mesh);
          feat.name = tool.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
          feat.type = tool as any;
          addFeatureWithBackend(feat);
        }
        break;
      }
      case "delete_part": {
        const last = features.filter((f) => f.mesh).pop();
        if (last) {
          dispatch({ type: "UPDATE_FEATURE", id: last.id, updates: { visible: false } });
        }
        break;
      }
      case "transform_part": {
        const last = features.filter((f) => f.mesh).pop();
        if (last?.mesh) {
          const tx = Number(params.tx) || 0, ty = Number(params.ty) || 0, tz = Number(params.tz) || 0;
          const newVerts = [...last.mesh.vertices];
          for (let i = 0; i < newVerts.length; i += 3) {
            newVerts[i] += tx; newVerts[i+1] += ty; newVerts[i+2] += tz;
          }
          const movedMesh = { vertices: newVerts, normals: [...last.mesh.normals], indices: [...last.mesh.indices] };
          const feat = createExtrudeFeature([last.id], { distance: 0, direction: "up" }, movedMesh);
          feat.name = `Move/Copy`;
          addFeatureWithBackend(feat);
        }
        break;
      }
      case "mate_connector": {
        // Create a mate connector point — stored as a construction entity
        const mcEntity = createPoint(0, 0);
        mcEntity.isConstruction = true;
        dispatch({ type: "ADD_ENTITY", entity: mcEntity });
        break;
      }
      case "construction_axis": {
        const axisDir = String(params.axis ?? "y");
        const len = Number(params.length) || 5;
        const x1 = axisDir === "x" ? -len/2 : 0;
        const z1 = axisDir === "z" ? -len/2 : 0;
        const x2 = axisDir === "x" ? len/2 : 0;
        const z2 = axisDir === "z" ? len/2 : 0;
        const axis = createLine(x1, z1, x2, z2);
        axis.isConstruction = true;
        dispatch({ type: "ADD_ENTITY", entity: axis });
        break;
      }
      case "construction_point": {
        const cp = createPoint(Number(params.x) || 0, Number(params.z) || 0);
        cp.isConstruction = true;
        dispatch({ type: "ADD_ENTITY", entity: cp });
        break;
      }
      case "frame_tool": {
        // Frame: sweep a rectangular profile along the last line entity
        const frameLines = entities.filter((e): e is Extract<typeof e, { type: "line" }> => e.type === "line");
        if (frameLines.length > 0) {
          const fl = frameLines[frameLines.length - 1];
          const w = Number(params.profileWidth) || 0.5;
          const h = Number(params.profileHeight) || 0.5;
          const len = Math.hypot(fl.x2 - fl.x1, fl.z2 - fl.z1);
          const mesh = generateExtrudePreviewMesh(fl.x1 - w/2, fl.z1 - h/2, fl.x1 + w/2, fl.z1 + h/2, len);
          const feat = createExtrudeFeature([fl.id], { distance: len, direction: "up" }, mesh);
          feat.name = "Frame";
          addFeatureWithBackend(feat);
        }
        break;
      }
    }
    dispatch({ type: "SET_TOOL", tool: "select" });
  }, [entities, features, dispatch, addFeatureWithBackend, handleCurvePattern]);

  // Auto-trigger: booleans apply immediately, everything else shows dialog
  useEffect(() => {
    if (activeTool === "union") { handleBoolean("union"); return; }
    if (activeTool === "subtract") { handleBoolean("subtract"); return; }
    if (activeTool === "intersect") { handleBoolean("intersect"); return; }

    if (DIALOG_TOOLS.has(activeTool)) {
      const config = TOOL_PARAMS[activeTool];
      if (config) {
        setParamDialog({ tool: activeTool, config });
      }
    }
  }, [activeTool, handleBoolean]);

  // Double-click feature tree → re-open parameter dialog for editing
  useEffect(() => {
    const handleEditFeature = (e: Event) => {
      const { featureId, featureType, params } = (e as CustomEvent).detail;
      const config = TOOL_PARAMS[featureType];
      if (config) {
        // Pre-populate dialog with existing params and store the feature ID for update
        setParamDialog({ tool: featureType, config });
        // Store the feature being edited so applyWithParams can update instead of create
        editingFeatureRef.current = featureId;
      }
    };
    window.addEventListener("gesture-cad-edit-feature", handleEditFeature);
    return () => window.removeEventListener("gesture-cad-edit-feature", handleEditFeature);
  }, []);

  // Terminal CAD command execution — handles events from Claude's auto-build
  useEffect(() => {
    const handleAddEntity = (e: Event) => {
      const { type, params } = (e as CustomEvent).detail;
      let entity: any = null;
      switch (type) {
        case "rect": entity = createRect(params.x1, params.z1, params.x2, params.z2); break;
        case "circle": entity = createCircle(params.cx, params.cz, params.radius); break;
        case "line": entity = createLine(params.x1, params.z1, params.x2, params.z2); break;
        case "ellipse": entity = createEllipse(params.cx, params.cz, params.radiusX, params.radiusZ, params.rotation || 0); break;
        case "polygon": entity = createPolygon(params.cx, params.cz, params.radius, params.sides || 6, params.rotation || 0); break;
        case "slot": entity = createSlot(params.x1, params.z1, params.x2, params.z2, params.width || 0.3); break;
        case "arc": entity = createArc(params.x1, params.z1, params.mx, params.mz, params.x2, params.z2); break;
        case "point": entity = createPoint(params.x || 0, params.z || 0); break;
      }
      if (entity) {
        entity.plane = sketchPlane;
        dispatch({ type: "ADD_ENTITY", entity });
      }
    };

    const handleAutoExtrude = (e: Event) => {
      const { distance } = (e as CustomEvent).detail;
      const extrudable = entities.filter((ent: any) => ent.type !== "point");
      const lastEntity = extrudable[extrudable.length - 1];
      if (lastEntity) {
        const mesh = extrudeEntityToMesh(lastEntity, distance || 2);
        if (mesh) {
          addFeatureWithBackend(createExtrudeFeature([lastEntity.id], { distance: distance || 2, direction: "up" }, mesh));
        }
      }
    };

    const handleApplyFeature = (e: Event) => {
      const { type, params } = (e as CustomEvent).detail;
      // Simulate clicking the tool and applying with params
      const config = TOOL_PARAMS[type];
      if (config) {
        const values: Record<string, any> = {};
        for (const field of config.fields) {
          values[field.key] = params[field.key] ?? field.default;
        }
        applyWithParams(type, values);
      }
    };

    window.addEventListener("gesture-cad-add-entity", handleAddEntity);
    window.addEventListener("gesture-cad-auto-extrude", handleAutoExtrude);
    window.addEventListener("gesture-cad-apply-feature", handleApplyFeature);
    return () => {
      window.removeEventListener("gesture-cad-add-entity", handleAddEntity);
      window.removeEventListener("gesture-cad-auto-extrude", handleAutoExtrude);
      window.removeEventListener("gesture-cad-apply-feature", handleApplyFeature);
    };
  }, [entities, sketchPlane, dispatch, addFeatureWithBackend, applyWithParams]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      // Don't capture when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (isMeta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      } else if (
        (isMeta && e.key === "y") ||
        (isMeta && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      } else if (e.key === "Escape") {
        dispatch({ type: "DESELECT_ALL" });
        dispatch({ type: "SET_TOOL", tool: "select" });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Delete selected entities
        for (const id of entities.filter((en) =>
          (useCADState as any)._selectedIds?.includes(en.id)
        ).map((en) => en.id)) {
          dispatch({ type: "REMOVE_ENTITY", entityId: id });
        }
      } else if (!isMeta) {
        // Single-key tool shortcuts
        const keyMap: Record<string, ToolId> = {
          v: "select", p: "draw", l: "line", c: "circle",
          r: "rect", a: "arc", e: "ellipse", x: "extrude",
          t: "trim", m: "mirror",
        };
        const tool = keyMap[e.key.toLowerCase()];
        if (tool) {
          dispatch({ type: "SET_TOOL", tool });
        }

        // Plane switching: 1=Top, 2=Front, 3=Side
        if (e.key === "1") dispatch({ type: "SET_SKETCH_PLANE", plane: "xz" });
        if (e.key === "2") dispatch({ type: "SET_SKETCH_PLANE", plane: "xy" });
        if (e.key === "3") dispatch({ type: "SET_SKETCH_PLANE", plane: "yz" });

        // N key: orient camera normal to active sketch plane
        if (e.key === "n" || e.key === "N") {
          const positions: Record<string, [number, number, number]> = {
            xz: [0, 10, 0.01],  // Top-down view for XZ plane
            xy: [0, 0, 10],      // Front view for XY plane
            yz: [10, 0, 0],      // Side view for YZ plane
          };
          const pos = positions[sketchPlane] || positions.xz;
          window.dispatchEvent(new CustomEvent("gesture-cad-view-preset", { detail: { position: pos } }));
        }

        // F9: toggle hand tracking telemetry overlay
        if (e.key === "F9") {
          e.preventDefault();
          setShowTelemetry((prev) => !prev);
        }

        // Ctrl+`: toggle integrated terminal
        if (e.key === "`" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setShowTerminal((prev) => !prev);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, entities, sketchPlane]);

  const layoutStyles: Record<string, React.CSSProperties> = {
    root: {
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "#0d0d0d",
      color: "#e0e0e0",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: "hidden",
    },
    navbar: {
      display: "flex",
      alignItems: "center",
      height: 40,
      background: "#111111",
      borderBottom: "1px solid #222",
      padding: "0 12px",
      gap: 12,
      zIndex: 50,
      flexShrink: 0,
    },
    navLeft: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexShrink: 0,
    },
    navLogo: {
      fontSize: 20,
      color: "#3b82f6",
    },
    navTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: "#e5e5e5",
      letterSpacing: "-0.02em",
    },
    navSep: {
      color: "#444",
      fontSize: 14,
    },
    navDoc: {
      color: "#999",
      fontSize: 13,
    },
    navCenter: {
      flex: 1,
      display: "flex",
      justifyContent: "center",
    },
    miniToolbar: {
      display: "flex",
      alignItems: "center",
      gap: 2,
      background: "#1a1a1a",
      borderRadius: 8,
      padding: "2px 4px",
      border: "1px solid #2a2a2a",
    },
    miniToolBtn: {
      width: 32,
      height: 28,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "none",
      borderRadius: 4,
      color: "#888",
      cursor: "pointer",
      fontSize: 16,
      fontFamily: "inherit",
      transition: "all 0.1s",
    },
    miniToolBtnActive: {
      background: "#1e3a5f",
      color: "#93c5fd",
    },
    miniSep: {
      width: 1,
      height: 20,
      background: "#333",
      margin: "0 4px",
    },
    navRight: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexShrink: 0,
    },
    navPill: {
      fontSize: 11,
      color: "#888",
      background: "#1a1a1a",
      padding: "3px 10px",
      borderRadius: 10,
      border: "1px solid #2a2a2a",
    },
    main: {
      flex: 1,
      display: "flex",
      overflow: "hidden",
      position: "relative" as const,
    },
    leftPanel: {
      width: 260,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column" as const,
      background: "#111",
      borderRight: "1px solid #222",
      overflow: "hidden",
    },
    viewportArea: {
      flex: 1,
      position: "relative" as const,
      overflow: "hidden",
    },
    bottomBar: {
      display: "flex",
      alignItems: "center",
      height: 36,
      background: "#111",
      borderTop: "1px solid #222",
      padding: "0 8px",
      gap: 8,
      flexShrink: 0,
      zIndex: 40,
    },
    tabGroup: {
      display: "flex",
      alignItems: "center",
      gap: 1,
    },
    bottomTab: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 14px",
      background: "#1a1a1a",
      borderWidth: 1,
      borderStyle: "solid" as const,
      borderColor: "#2a2a2a",
      borderBottomWidth: 0,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      color: "#888",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 12,
      fontWeight: 500,
      marginBottom: -1,
    },
    bottomTabActive: {
      background: "#1e1e1e",
      color: "#e5e5e5",
      borderColor: "#3b82f6",
      borderBottomColor: "#1e1e1e",
    },
    bottomTabAdd: {
      width: 28,
      height: 28,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "1px solid #333",
      borderRadius: 4,
      color: "#666",
      cursor: "pointer",
      fontSize: 16,
      fontFamily: "inherit",
      marginLeft: 4,
    },
    // Blender pipeline styles
    modeSwitchBtn: {
      padding: "3px 10px",
      background: "transparent",
      border: "1px solid #333",
      borderRadius: 4,
      color: "#888",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 11,
      fontWeight: 500,
      textTransform: "capitalize" as const,
    },
    modeSwitchBtnActive: {
      background: "#1e3a5f",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    panelToggleBtn: {
      width: 28,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "1px solid #333",
      borderRadius: 4,
      color: "#666",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "inherit",
    },
    panelToggleBtnActive: {
      background: "#1e3a5f",
      color: "#93c5fd",
      borderColor: "#3b82f6",
    },
    bottomPanelArea: {
      height: 300,
      flexShrink: 0,
      background: "#111",
      borderTop: "1px solid #333",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    },
    bottomPanelTabs: {
      display: "flex",
      alignItems: "center",
      height: 32,
      background: "#161618",
      borderBottom: "1px solid #2a2a2a",
      padding: "0 8px",
      gap: 2,
      flexShrink: 0,
    },
    bottomPanelTab: {
      padding: "4px 12px",
      background: "transparent",
      border: "none",
      borderBottom: "2px solid transparent",
      color: "#888",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 11,
      fontWeight: 500,
    },
    bottomPanelTabActive: {
      color: "#93c5fd",
      borderBottomColor: "#3b82f6",
    },
    bottomPanelClose: {
      marginLeft: "auto",
      width: 24,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "none",
      color: "#666",
      cursor: "pointer",
      fontSize: 14,
      fontFamily: "inherit",
      borderRadius: 4,
    },
    bottomPanelContent: {
      flex: 1,
      overflow: "auto",
      position: "relative" as const,
    },
  };

  return (
    <div style={layoutStyles.root}>
      {/* Top navbar — compact brand bar */}
      <div style={layoutStyles.navbar}>
        <div style={layoutStyles.navLeft}>
          <span style={layoutStyles.navLogo}>◈</span>
          <span style={layoutStyles.navTitle}>GestureCAD</span>
          <span style={layoutStyles.navSep}>›</span>
          <span style={layoutStyles.navDoc}>Untitled Document</span>
        </div>
        <div style={layoutStyles.navCenter}>
          {/* Mini toolbar — most used tools */}
          <div style={layoutStyles.miniToolbar}>
            {["select","line","rect","circle","extrude","fillet","chamfer","hole","helix"].map((t) => (
              <button
                key={t}
                data-testid={`quick-${t}`}
                style={{
                  ...layoutStyles.miniToolBtn,
                  ...(activeTool === t ? layoutStyles.miniToolBtnActive : {}),
                }}
                onClick={() => dispatch({ type: "SET_TOOL", tool: t as any })}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
              >
                {t === "select" ? "◇" : t === "line" ? "╱" : t === "rect" ? "□" : t === "circle" ? "○" : t === "extrude" ? "⬡" : t === "fillet" ? "◠" : t === "chamfer" ? "⌐" : t === "hole" ? "⊙" : "⌀"}
              </button>
            ))}
            <span style={layoutStyles.miniSep} />
            <button style={layoutStyles.miniToolBtn} onClick={() => dispatch({ type: "UNDO" })} title="Undo (Ctrl+Z)">↶</button>
            <button style={layoutStyles.miniToolBtn} onClick={() => dispatch({ type: "REDO" })} title="Redo (Ctrl+Y)">↷</button>
          </div>
        </div>
        <div style={layoutStyles.navRight}>
          {/* Interaction mode switcher */}
          {(["object", "edit", "sculpt"] as const).map((mode) => (
            <button
              key={mode}
              style={{
                ...layoutStyles.modeSwitchBtn,
                ...(interactionMode === mode ? layoutStyles.modeSwitchBtnActive : {}),
              }}
              onClick={() => dispatch({ type: "SET_INTERACTION_MODE", mode })}
              title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`}
            >
              {mode === "object" ? "◇" : mode === "edit" ? "◆" : "🔮"} {mode}
            </button>
          ))}
          <span style={layoutStyles.miniSep} />
          {/* Bottom panel toggles */}
          {(["timeline", "graph_editor", "uv_editor", "shader_editor"] as const).map((p) => (
            <button
              key={p}
              style={{
                ...layoutStyles.panelToggleBtn,
                ...(bottomPanel === p ? layoutStyles.panelToggleBtnActive : {}),
              }}
              onClick={() => dispatch({ type: "SET_BOTTOM_PANEL", panel: bottomPanel === p ? "none" : p })}
            >
              {p === "timeline" ? "▶" : p === "graph_editor" ? "📈" : p === "uv_editor" ? "▤" : "◑"}
            </button>
          ))}
          <span style={layoutStyles.miniSep} />
          <span style={layoutStyles.navPill}>{entities.length} entities</span>
          <span style={layoutStyles.navPill}>{features.length} features</span>
        </div>
      </div>

      <TutorialOverlay />
      {paramDialog && (
        <ParameterDialog
          config={paramDialog.config}
          onApply={(values) => applyWithParams(paramDialog.tool, values)}
          onCancel={() => { setParamDialog(null); dispatch({ type: "SET_TOOL", tool: "select" }); }}
        />
      )}

      {/* Onshape-style horizontal toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div style={layoutStyles.main}>
        {/* Left panel: Feature Tree only */}
        <div style={layoutStyles.leftPanel}>
          <FeatureTreePanel />
        </div>

        {/* Center: 3D Viewport */}
        <div style={layoutStyles.viewportArea}>
          <Viewport
            handPosition={handPosition}
            gesture={gesture}
            isPinching={handPinching}
            viewportGesture={viewportGesture}
            extrudePreview={extrudePreview}
            handNavRef={handNavRef}
          />
          <ViewportOverlay />
          <DragDropZone />
          {gestureCombo && (
            <div style={{
              position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
              padding: "6px 16px", background: "#1e3a5f", color: "#93c5fd",
              borderRadius: 6, fontSize: 13, fontWeight: 600, zIndex: 30,
              border: "1px solid #3b82f6", pointerEvents: "none",
            }}>
              {gestureCombo}
            </div>
          )}
          {/* Interactive extrude HUD */}
          {activeTool === "extrude" && (
            <div style={{
              position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
              padding: "8px 20px", background: extrudeState.phase === "dragging" ? "#1e3a5fee" : "#222e",
              color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 30,
              borderWidth: 1, borderStyle: "solid", borderColor: "#3b82f6",
              display: "flex", gap: 16, alignItems: "center", pointerEvents: "none",
              backdropFilter: "blur(4px)",
            }}>
              {extrudeState.phase === "picking" && (
                <span>Click on a shape to extrude</span>
              )}
              {extrudeState.phase === "dragging" && (
                <>
                  <span>⬡ Extruding</span>
                  <span style={{ color: "#3b82f6", fontFamily: "monospace", fontSize: 16 }}>
                    {extrudeState.currentDistance.toFixed(2)} mm
                  </span>
                  <span style={{ color: "#888", fontSize: 11 }}>drag up/down · release to confirm</span>
                </>
              )}
            </div>
          )}
          <GestureOverlay
            onGestureDetected={handleGestureDetected}
            onFpsUpdate={setFps}
            onTrackingStatusChange={setTrackingActive}
            onHandPosition={handleHandPosition}
            onHandsTracked={handleHandsTracked}
            showTelemetry={showTelemetry}
          />
        </div>

        {/* Right panel: Workbench sidebar */}
        <WorkbenchSidebar />
      </div>

      {/* Sculpt overlay (floating when in sculpt mode) */}
      {interactionMode === "sculpt" && (
        <SculptOverlay
          active={true}
          brushRadius={sculptRadius}
          brushStrength={sculptStrength}
          onBrushChange={(type: string, radius: number, strength: number) => {
            dispatch({ type: "SET_SCULPT_BRUSH", brush: type as any });
            dispatch({ type: "SET_SCULPT_PARAMS", radius, strength });
          }}
          cursorPosition={handPosition}
        />
      )}

      {/* Bottom panel area for timeline/graph editor/UV/shader */}
      {bottomPanel !== "none" && (
        <div style={layoutStyles.bottomPanelArea}>
          {/* Panel tab switcher */}
          <div style={layoutStyles.bottomPanelTabs}>
            {(["timeline", "graph_editor", "uv_editor", "shader_editor"] as const).map((p) => (
              <button
                key={p}
                style={{
                  ...layoutStyles.bottomPanelTab,
                  ...(bottomPanel === p ? layoutStyles.bottomPanelTabActive : {}),
                }}
                onClick={() => dispatch({ type: "SET_BOTTOM_PANEL", panel: bottomPanel === p ? "none" : p })}
              >
                {p === "timeline" ? "▶ Timeline" : p === "graph_editor" ? "📈 Graph" : p === "uv_editor" ? "▤ UV Editor" : "◑ Shader"}
              </button>
            ))}
            <button
              style={layoutStyles.bottomPanelClose}
              onClick={() => dispatch({ type: "SET_BOTTOM_PANEL", panel: "none" })}
              title="Close panel"
            >✕</button>
          </div>
          <div style={layoutStyles.bottomPanelContent}>
            {bottomPanel === "timeline" && (
              <TimelinePanel
                action={null}
                currentTime={animationTime}
                isPlaying={isAnimationPlaying}
                fps={animationFps}
                onTimeChange={(t: number) => dispatch({ type: "SET_ANIMATION_TIME", time: t })}
                onPlay={() => dispatch({ type: "SET_ANIMATION_PLAYING", playing: true })}
                onPause={() => dispatch({ type: "SET_ANIMATION_PLAYING", playing: false })}
                onKeyframeAdd={() => {}}
                onKeyframeDelete={() => {}}
              />
            )}
            {bottomPanel === "graph_editor" && (
              <GraphEditorPanel
                channels={[]}
                selectedChannelId={null}
                currentTime={animationTime}
                onKeyframeUpdate={() => {}}
                onTimeChange={(t: number) => dispatch({ type: "SET_ANIMATION_TIME", time: t })}
              />
            )}
            {bottomPanel === "uv_editor" && (
              <UVEditorPanel
                uvData={new Map()}
                mesh={{ faces: new Map(), faceVertices: () => [] }}
                onUVUpdate={() => {}}
              />
            )}
            {bottomPanel === "shader_editor" && (
              <ShaderGraphEditor
                graph={null as any}
                onGraphChange={() => {}}
              />
            )}
          </div>
        </div>
      )}

      {/* Bottom tab bar — Onshape style */}
      <div style={layoutStyles.bottomBar}>
        <div style={layoutStyles.tabGroup}>
          {[
            { label: "Part Studio", icon: "⬡", active: true },
            { label: "Assembly", icon: "🔧", active: false },
            { label: "Drawing", icon: "📐", active: false },
          ].map((tab) => (
            <button
              key={tab.label}
              style={{
                ...layoutStyles.bottomTab,
                ...(tab.active ? layoutStyles.bottomTabActive : {}),
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
          <button style={layoutStyles.bottomTabAdd} title="Add tab">+</button>
        </div>

        <StatusBar gesture={gesture} fps={fps} trackingActive={trackingActive} />
      </div>

      {trackingActive && (
        <HandCursor
          handPosition={handPosition}
          isPinching={handPinching}
          gesture={gesture}
          freehandActive={activeTool === "draw" || activeTool === "spline"}
          onPinchStart={(sx, sy) => { if (activeTool === "draw" || activeTool === "spline") freehand.startStroke(); }}
          onHandDrag={(sx, sy) => {
            if (freehand.isActive() && handPosition) {
              freehand.addPoint((handPosition.x - 0.5) * 10, (handPosition.y - 0.5) * 10);
            }
          }}
          onPinchEnd={() => { freehand.endStroke(); }}
        />
      )}

      {/* Integrated Terminal */}
      <IntegratedTerminal
        visible={showTerminal}
        onToggle={() => setShowTerminal((prev) => !prev)}
        cadState={{ entities, features, activeTool, sketchPlane }}
        onCadCommand={(cmd, args) => {
          switch (cmd) {
            case "SET_TOOL": dispatch({ type: "SET_TOOL", tool: args[0] as any }); break;
            case "SET_PLANE": dispatch({ type: "SET_SKETCH_PLANE", plane: args[0] as any }); break;
            case "UNDO": dispatch({ type: "UNDO" }); break;
            case "REDO": dispatch({ type: "REDO" }); break;
            case "CLEAR_ALL": dispatch({ type: "CLEAR_ALL" }); break;
          }
        }}
      />
    </div>
  );
}
