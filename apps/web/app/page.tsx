"use client";

import { Viewport } from "@/components/viewport/viewport";
import { GestureOverlay } from "@/components/gesture/gesture-overlay";
import { Toolbar } from "@/components/toolbar/toolbar";
import { StatusBar } from "@/components/toolbar/status-bar";
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay";
import { FeatureTreePanel } from "@/components/feature-tree/feature-tree-panel";
import { ParameterPanel } from "@/components/parameter-panel/parameter-panel";
import { DragDropZone } from "@/components/file-io/drag-drop-zone";
import { useCADState, useCADDispatch, type ToolId } from "@/lib/store";
import { createExtrudeFeature, generateExtrudePreviewMesh } from "@/lib/features";
import { useState, useEffect, useCallback, useRef } from "react";

/** Maps gesture strings to tool IDs with a stability filter. */
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
  const { entities, activeTool } = useCADState();
  const dispatch = useCADDispatch();
  const [gesture, setGesture] = useState<string>("none");
  const [fps, setFps] = useState<number>(0);
  const [trackingActive, setTrackingActive] = useState(false);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);

  // Gesture debounce: require same gesture for 300ms before switching tool
  const lastGestureRef = useRef<string>("none");
  const gestureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGestureDetected = useCallback(
    (detected: string) => {
      setGesture(detected);

      // Pinch is handled as "click" in sketch-plane, not as tool switch
      if (detected === "pinch") return;

      if (detected === lastGestureRef.current) return;
      lastGestureRef.current = detected;

      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);

      if (detected === "none" || detected === "unknown") return;

      gestureTimerRef.current = setTimeout(() => {
        const tool = GESTURE_TO_TOOL[detected];
        if (tool) {
          if (detected === "swipe_left") {
            dispatch({ type: "UNDO" });
          } else if (detected === "swipe_right") {
            dispatch({ type: "REDO" });
          } else {
            dispatch({ type: "SET_TOOL", tool });
          }
        }
      }, 300);
    },
    [dispatch]
  );

  const handleHandPosition = useCallback(
    (pos: { x: number; y: number } | null) => {
      setHandPosition(pos);
    },
    []
  );

  // Extrude: when tool is "extrude" and there's a rect, auto-extrude it
  const handleExtrudeClick = useCallback(() => {
    const rects = entities.filter((e) => e.type === "rect");
    if (rects.length === 0) return;
    const lastRect = rects[rects.length - 1];
    const distance = 2.0; // default extrude distance
    const mesh = generateExtrudePreviewMesh(
      lastRect.x1, lastRect.z1, lastRect.x2, lastRect.z2, distance
    );
    const feature = createExtrudeFeature(
      [lastRect.id],
      { distance, direction: "up" },
      mesh
    );
    dispatch({ type: "ADD_FEATURE", feature });
    dispatch({ type: "SET_TOOL", tool: "select" });
  }, [entities, dispatch]);

  // Auto-trigger extrude when tool switches to "extrude"
  useEffect(() => {
    if (activeTool === "extrude") {
      handleExtrudeClick();
    }
  }, [activeTool, handleExtrudeClick]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
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
        dispatch({ type: "SET_TOOL", tool: "select" });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TutorialOverlay />
      <Toolbar />
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <FeatureTreePanel />
        <Viewport handPosition={handPosition} gesture={gesture} />
        <ParameterPanel />
        <DragDropZone />
        <GestureOverlay
          onGestureDetected={handleGestureDetected}
          onFpsUpdate={setFps}
          onTrackingStatusChange={setTrackingActive}
          onHandPosition={handleHandPosition}
        />
      </div>
      <StatusBar
        gesture={gesture}
        fps={fps}
        trackingActive={trackingActive}
      />
    </div>
  );
}
