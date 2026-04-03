"use client";

/**
 * GestureCAD XR — Iron Man Holographic Workbench
 *
 * Fixed for Quest: uses DOM Overlay for UI (not drei Html),
 * drei Text for 3D labels, xrCompatible renderer.
 */

import { useState, useCallback, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { XRScene } from "@/components/xr-session/xr-scene";
import { DrawingEngine } from "@/components/drawing/drawing-engine";
import { XRSketchEngine } from "@/components/drawing/xr-sketch-engine";
import { HandInteraction } from "@/components/hologram/hand-interaction";
import { DemoHologram } from "@/components/hologram/demo-hologram";
import { ARWorkbench } from "@/components/workbench/ar-workbench";
import { CADObjectsRenderer } from "@/components/workbench/cad-objects-renderer";
import { WristMenuButton } from "@/components/workbench/wrist-menu";
import { XROverlay } from "@/components/xr-overlay";
import { OverlayToolbar } from "@/components/overlay/overlay-toolbar";
import { OverlayMenu } from "@/components/overlay/overlay-menu";
import { TutorialOverlay } from "@/components/overlay/tutorial-overlay";

import {
  createBox, createCylinder, createSphere, createCone, createTorus,
  createExtrudedRect, createExtrudedCircle, createExtrudedPolygon,
  generateHouse, type CADObject,
} from "@/lib/local-cad-engine";
import type { HologramPreset } from "@/lib/hologram-material";
import type { XRGestureState } from "@/lib/xr-gestures";

const xrStore = createXRStore({
  hand: { rayPointer: { minDistance: 0.2 } },
  controller: { rayPointer: true },
  foveation: 1,
});

export default function XRApp() {
  const [cadObjects, setCadObjects] = useState<CADObject[]>([]);
  const [undoStack, setUndoStack] = useState<CADObject[][]>([]);
  const [redoStack, setRedoStack] = useState<CADObject[][]>([]);
  const [activeTool, setActiveTool] = useState("select");
  const [preset, setPreset] = useState<HologramPreset>("cyan");
  const [wireframe, setWireframe] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tableHeight, setTableHeight] = useState(0.78);
  const [tableScale, setTableScale] = useState(1.0);
  const [gestureLeft, setGestureLeft] = useState<XRGestureState | null>(null);
  const [gestureRight, setGestureRight] = useState<XRGestureState | null>(null);

  const holoGroupRef = useRef<THREE.Group>(null);

  // ─── CAD operations (fully local) ───
  const addObject = useCallback((obj: CADObject) => {
    setCadObjects(prev => {
      setUndoStack(u => [...u, prev]);
      setRedoStack([]);
      return [...prev, obj];
    });
  }, []);

  const addObjects = useCallback((objs: CADObject[]) => {
    setCadObjects(prev => {
      setUndoStack(u => [...u, prev]);
      setRedoStack([]);
      return [...prev, ...objs];
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack(u => {
      if (u.length === 0) return u;
      const prev = u[u.length - 1];
      setCadObjects(curr => { setRedoStack(r => [...r, curr]); return prev; });
      return u.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(r => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setCadObjects(curr => { setUndoStack(u => [...u, curr]); return next; });
      return r.slice(0, -1);
    });
  }, []);

  const clearAll = useCallback(() => {
    setCadObjects(prev => {
      setUndoStack(u => [...u, prev]);
      setRedoStack([]);
      return [];
    });
  }, []);

  const handleGestureChange = useCallback((left: XRGestureState, right: XRGestureState) => {
    setGestureLeft(left);
    setGestureRight(right);
  }, []);

  // Smart tool selection — primitives auto-add, others set active tool
  const handleToolSelect = useCallback((toolId: string) => {
    // Instant-add primitives
    switch (toolId) {
      case "box": addObject(createBox(1, 1, 1)); return;
      case "cylinder": addObject(createCylinder(0.5, 1)); return;
      case "sphere": addObject(createSphere(0.5)); return;
      case "cone": addObject(createCone(0.5, 1)); return;
      case "torus": addObject(createTorus(0.5, 0.15)); return;
      case "generate": addObjects(generateHouse("2bed")); return;
    }
    // Sketch tools that auto-add shapes
    switch (toolId) {
      case "rect": addObject(createExtrudedRect(-0.5, -0.5, 0.5, 0.5, 1)); return;
      case "circle": addObject(createExtrudedCircle(0, 0, 0.5, 1)); return;
      case "polygon": addObject(createExtrudedPolygon(0, 0, 0.5, 6, 1)); return;
    }
    // Everything else sets the active tool
    setActiveTool(toolId);
  }, [addObject, addObjects]);

  const isSketchTool = ["line", "arc"].includes(activeTool);
  const isDrawTool = activeTool === "draw";
  const isViewMode = activeTool === "select";
  const hasContent = cadObjects.length > 0;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.name.endsWith(".glb")) {
          // Could add GLB loading here
        }
      }}>

      {/* ═══ 3D CANVAS ═══ */}
      <Canvas
        camera={{ position: [0, 1.6, 1.2], fov: 55 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "#f5f0e8" }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[3, 5, 2]} intensity={0.6} />
            <pointLight position={[0, 1.5, 0]} intensity={0.3} color="#00ffcc" />

            {/* Workbench table with tool pucks */}
            <ARWorkbench activeTool={activeTool} onToolSelect={handleToolSelect} preset={preset}
              tableHeight={tableHeight} tableScale={tableScale}>
              <group ref={holoGroupRef}>
                {hasContent && (
                  <CADObjectsRenderer objects={cadObjects} preset={preset} wireframe={wireframe} />
                )}
                {!hasContent && <DemoHologram preset={preset} wireframe={wireframe} />}
              </group>
            </ARWorkbench>

            {/* Hand interaction */}
            <HandInteraction
              targetRef={holoGroupRef}
              enabled={isViewMode}
              onGestureChange={handleGestureChange}
            />

            {/* Wrist button — 3D mesh, toggles DOM overlay menu */}
            <WristMenuButton
              menuOpen={menuOpen}
              onToggle={() => setMenuOpen(m => !m)}
            />

            {/* Drawing tools */}
            <DrawingEngine active={isDrawTool} />
            <XRSketchEngine active={isSketchTool} tool={(isSketchTool ? activeTool : "line") as any} />

            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <circleGeometry args={[3, 32]} />
              <meshBasicMaterial color="#e8e3db" transparent opacity={0.4} />
            </mesh>

            {/* ═══ DOM OVERLAY — all 2D UI renders here (visible in AR!) ═══ */}
            <XROverlay>
              <OverlayToolbar
                onEnterAR={() => xrStore.enterAR()}
                onEnterVR={() => xrStore.enterVR()}
                preset={preset}
                onPresetChange={setPreset}
                wireframe={wireframe}
                onWireframeToggle={() => setWireframe(w => !w)}
                objectCount={cadObjects.length}
                activeTool={activeTool}
              />

              {/* Menu toggle button — fixed bottom-left */}
              <button
                data-xr-ui
                onClick={() => setMenuOpen(m => !m)}
                style={menuToggle}
              >
                {menuOpen ? "✕" : "☰ Menu"}
              </button>

              {/* Full menu panel */}
              <OverlayMenu
                visible={menuOpen}
                onClose={() => setMenuOpen(false)}
                activeTool={activeTool}
                onToolSelect={handleToolSelect}
                onAddObject={addObject}
                onAddObjects={addObjects}
                onUndo={undo}
                onRedo={redo}
                onClearAll={clearAll}
                onExitXR={() => {
                  try { xrStore.getState()?.session?.end?.(); } catch {}
                }}
                preset={preset}
                onPresetChange={setPreset}
                wireframe={wireframe}
                onWireframeToggle={() => setWireframe(w => !w)}
                tableHeight={tableHeight}
                onTableHeightChange={setTableHeight}
                tableScale={tableScale}
                onTableScaleChange={setTableScale}
              />

              {/* Help button */}
              <button data-xr-ui onClick={() => setShowTutorial(true)} style={helpBtn}>?</button>

              {/* Tutorial */}
              <TutorialOverlay visible={showTutorial} onClose={() => setShowTutorial(false)} />

              {/* Gesture status */}
              <div style={gestureBar}>
                L: {gestureLeft?.type || "—"} | R: {gestureRight?.type || "—"}
              </div>
            </XROverlay>
          </Suspense>

          <XROrigin position={[0, 0, 0]} />
          <OrbitControls makeDefault enabled={isViewMode} target={[0, 0.9, -0.1]}
            minPolarAngle={0.3} maxPolarAngle={Math.PI / 2} />
          <Environment preset="night" />
        </XR>
      </Canvas>

      {/* ═══ Desktop-only UI (hidden in XR via DOM overlay taking over) ═══ */}
      <div style={desktopBar}>
        <span style={{ color: "#00ffcc", fontSize: 16 }}>◈</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#00ffcc", letterSpacing: "0.2em" }}>WORKBENCH</span>
        <button style={dArBtn} onClick={() => xrStore.enterAR()}>AR</button>
        <button style={dVrBtn} onClick={() => xrStore.enterVR()}>VR</button>
        <div style={{ flex: 1 }} />
        <button style={dMenuBtn} onClick={() => setMenuOpen(m => !m)}>
          {menuOpen ? "✕ Close" : "☰ Menu"}
        </button>
        <span style={{ fontSize: 10, color: "#00886a", fontFamily: "monospace" }}>
          {cadObjects.length} obj | {activeTool}
        </span>
        <button style={dHelpBtn} onClick={() => setShowTutorial(true)}>?</button>
      </div>

      {/* Desktop tutorial */}
      {showTutorial && !menuOpen && (
        <TutorialOverlay visible={true} onClose={() => setShowTutorial(false)} />
      )}

      {/* Desktop menu (same component, rendered outside canvas) */}
      {menuOpen && (
        <OverlayMenu
          visible={true}
          onClose={() => setMenuOpen(false)}
          activeTool={activeTool}
          onToolSelect={handleToolSelect}
          onAddObject={addObject}
          onAddObjects={addObjects}
          onUndo={undo}
          onRedo={redo}
          onClearAll={clearAll}
          onExitXR={() => {}}
          preset={preset}
          onPresetChange={setPreset}
          wireframe={wireframe}
          onWireframeToggle={() => setWireframe(w => !w)}
          tableHeight={tableHeight}
          onTableHeightChange={setTableHeight}
          tableScale={tableScale}
          onTableScaleChange={setTableScale}
        />
      )}
    </div>
  );
}

// ─── Styles ───
const menuToggle: React.CSSProperties = {
  position: "fixed", bottom: 16, left: 16, padding: "12px 20px",
  background: "rgba(245,240,232,0.95)", color: "#00886a",
  border: "1px solid #d4cfc7", borderRadius: 10,
  fontFamily: "'SF Mono', monospace", fontSize: 14, fontWeight: 700,
  cursor: "pointer", pointerEvents: "auto", zIndex: 120,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const helpBtn: React.CSSProperties = {
  position: "fixed", bottom: 16, right: 16, width: 36, height: 36,
  borderRadius: 18, background: "#00ccaa", color: "#fff",
  border: "none", fontSize: 18, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit", pointerEvents: "auto", zIndex: 120,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};
const gestureBar: React.CSSProperties = {
  position: "fixed", bottom: 16, right: 16,
  fontSize: 10, color: "#445", fontFamily: "monospace",
  pointerEvents: "none",
};

const desktopBar: React.CSSProperties = {
  position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
  padding: "6px 10px", display: "flex", alignItems: "center", gap: 8,
  background: "rgba(245,240,232,0.95)", borderBottom: "1px solid #d4cfc7",
  fontFamily: "'SF Mono', monospace",
};

const dArBtn: React.CSSProperties = {
  padding: "10px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  background: "#00ccaa", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
};
const dVrBtn: React.CSSProperties = {
  padding: "10px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  background: "#2288dd", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
};
const dHelpBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 14, background: "#00ccaa", color: "#fff",
  border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const dMenuBtn: React.CSSProperties = {
  padding: "8px 16px", background: "rgba(0,180,140,0.1)", color: "#00886a",
  border: "1px solid rgba(0,180,140,0.3)", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", fontSize: 12,
};
