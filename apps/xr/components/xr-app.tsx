"use client";

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
  generateHouse, resetPlacement,
  type CADObject, type MaterialMode,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preset, setPreset] = useState<HologramPreset>("cyan");
  const [wireframe, setWireframe] = useState(false);
  const [materialMode, setMaterialMode] = useState<MaterialMode>("hologram");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [tableHeight, setTableHeight] = useState(0.78);
  const [tableScale, setTableScale] = useState(1.0);
  const [gestureLeft, setGestureLeft] = useState<XRGestureState | null>(null);
  const [gestureRight, setGestureRight] = useState<XRGestureState | null>(null);
  /** Where the next object will be placed — set by tapping the table */
  const [placementPos, setPlacementPos] = useState<[number, number, number] | null>(null);

  const holoGroupRef = useRef<THREE.Group>(null);

  const selectedObject = cadObjects.find(o => o.id === selectedId) || null;

  // ─── CAD operations ───
  const pushUndo = useCallback((prev: CADObject[]) => {
    setUndoStack(u => [...u.slice(-30), prev]);
    setRedoStack([]);
  }, []);

  const addObject = useCallback((obj: CADObject) => {
    setCadObjects(prev => { pushUndo(prev); return [...prev, obj]; });
  }, [pushUndo]);

  const addObjects = useCallback((objs: CADObject[]) => {
    setCadObjects(prev => { pushUndo(prev); return [...prev, ...objs]; });
  }, [pushUndo]);

  const updateObject = useCallback((id: string, updated: CADObject) => {
    setCadObjects(prev => {
      pushUndo(prev);
      return prev.map(o => o.id === id ? { ...updated } : o);
    });
  }, [pushUndo]);

  const deleteObject = useCallback((id: string) => {
    setCadObjects(prev => { pushUndo(prev); return prev.filter(o => o.id !== id); });
    if (selectedId === id) setSelectedId(null);
  }, [pushUndo, selectedId]);

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
    setCadObjects(prev => { pushUndo(prev); resetPlacement(); return []; });
    setSelectedId(null);
  }, [pushUndo]);

  const handleGestureChange = useCallback((left: XRGestureState, right: XRGestureState) => {
    setGestureLeft(left);
    setGestureRight(right);
  }, []);

  // Smart tool handler — primitives add at placement position or auto-position
  const handleToolSelect = useCallback((toolId: string) => {
    // Use placement position if set, otherwise auto-position
    const pos = placementPos || undefined;

    switch (toolId) {
      case "box": addObject(createBox(1, 1, 1, pos)); return;
      case "cylinder": addObject(createCylinder(0.5, 1, 32, pos)); return;
      case "sphere": addObject(createSphere(0.5, 32, pos)); return;
      case "cone": addObject(createCone(0.5, 1, 32, pos)); return;
      case "torus": addObject(createTorus(0.5, 0.15, 32, pos)); return;
      case "generate": addObjects(generateHouse("2bed")); return;
      case "rect": addObject(createExtrudedRect(-0.5, -0.5, 0.5, 0.5, 1, pos)); return;
      case "circle": addObject(createExtrudedCircle(0, 0, 0.5, 1, pos)); return;
      case "polygon": addObject(createExtrudedPolygon(0, 0, 0.5, 6, 1, pos)); return;
    }
    setActiveTool(toolId);
  }, [addObject, addObjects, placementPos]);

  const isSketchTool = ["line", "arc"].includes(activeTool);
  const isDrawTool = activeTool === "draw";
  const isViewMode = activeTool === "select";
  const hasContent = cadObjects.length > 0;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.6, 1.2], fov: 55 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "#f5f0e8" }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 5, 2]} intensity={0.8} />
            <directionalLight position={[-2, 3, -1]} intensity={0.3} />
            <pointLight position={[0, 1.5, 0]} intensity={0.2} color="#00ffcc" />

            <ARWorkbench activeTool={activeTool} onToolSelect={handleToolSelect}
              preset={preset} tableHeight={tableHeight} tableScale={tableScale}
              onTableTap={setPlacementPos} placementPos={placementPos}>
              <group ref={holoGroupRef}>
                {hasContent && (
                  <CADObjectsRenderer
                    objects={cadObjects} preset={preset} wireframe={wireframe}
                    materialMode={materialMode} selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                )}
                {!hasContent && <DemoHologram preset={preset} wireframe={wireframe} />}
              </group>
            </ARWorkbench>

            <HandInteraction targetRef={holoGroupRef} enabled={isViewMode}
              onGestureChange={handleGestureChange} />

            <WristMenuButton menuOpen={menuOpen} onToggle={() => setMenuOpen(m => !m)} />

            <DrawingEngine active={isDrawTool} />
            <XRSketchEngine active={isSketchTool} tool={(isSketchTool ? activeTool : "line") as any} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
              <circleGeometry args={[3, 32]} />
              <meshBasicMaterial color="#e8e3db" transparent opacity={0.4} />
            </mesh>

            {/* DOM Overlay — visible in AR */}
            <XROverlay>
              <OverlayToolbar
                onEnterAR={() => xrStore.enterAR()} onEnterVR={() => xrStore.enterVR()}
                preset={preset} onPresetChange={setPreset}
                wireframe={wireframe} onWireframeToggle={() => setWireframe(w => !w)}
                objectCount={cadObjects.length} activeTool={activeTool}
              />
              <button data-xr-ui onClick={() => setMenuOpen(m => !m)} style={menuToggle}>
                {menuOpen ? "✕" : "☰ Menu"}
              </button>
              <OverlayMenu
                visible={menuOpen} onClose={() => setMenuOpen(false)}
                activeTool={activeTool} onToolSelect={handleToolSelect}
                onAddObject={addObject} onAddObjects={addObjects}
                onUpdateObject={updateObject} onDeleteObject={deleteObject}
                onUndo={undo} onRedo={redo} onClearAll={clearAll}
                onExitXR={() => { try { xrStore.getState()?.session?.end?.(); } catch {} }}
                preset={preset} onPresetChange={setPreset}
                wireframe={wireframe} onWireframeToggle={() => setWireframe(w => !w)}
                tableHeight={tableHeight} onTableHeightChange={setTableHeight}
                tableScale={tableScale} onTableScaleChange={setTableScale}
                materialMode={materialMode} onMaterialModeChange={setMaterialMode}
                selectedId={selectedId} selectedObject={selectedObject}
                objects={cadObjects} onSelectObject={setSelectedId}
              />
              <button data-xr-ui onClick={() => setShowTutorial(true)} style={helpBtn}>?</button>
              <TutorialOverlay visible={showTutorial} onClose={() => setShowTutorial(false)} />
              <div style={gestureBar}>
                L: {gestureLeft?.type || "—"} | R: {gestureRight?.type || "—"}
              </div>
            </XROverlay>
          </Suspense>

          <XROrigin position={[0, 0, 0]} />
          <OrbitControls makeDefault enabled={isViewMode} target={[0, 0.9, -0.1]}
            minPolarAngle={0.3} maxPolarAngle={Math.PI / 2} />
          <Environment preset="apartment" />
        </XR>
      </Canvas>

      {/* Desktop-only bar */}
      <div style={dBar}>
        <span style={{ color: "#00886a", fontSize: 16 }}>◈</span>
        <span style={dTitle}>WORKBENCH</span>
        <button style={dArBtn} onClick={() => xrStore.enterAR()}>AR</button>
        <button style={dVrBtn} onClick={() => xrStore.enterVR()}>VR</button>
        <div style={{ flex: 1 }} />
        <button style={dMenuBtn} onClick={() => setMenuOpen(m => !m)}>
          {menuOpen ? "✕ Close" : "☰ Menu"}
        </button>
        <span style={dInfo}>
          {cadObjects.length} obj | {activeTool} | {materialMode}
          {selectedObject ? ` | sel: ${selectedObject.name}` : ""}
        </span>
        <button style={dHelp} onClick={() => setShowTutorial(true)}>?</button>
      </div>

      {showTutorial && !menuOpen && (
        <TutorialOverlay visible={true} onClose={() => setShowTutorial(false)} />
      )}

      {menuOpen && (
        <OverlayMenu
          visible={true} onClose={() => setMenuOpen(false)}
          activeTool={activeTool} onToolSelect={handleToolSelect}
          onAddObject={addObject} onAddObjects={addObjects}
          onUpdateObject={updateObject} onDeleteObject={deleteObject}
          onUndo={undo} onRedo={redo} onClearAll={clearAll}
          onExitXR={() => {}}
          preset={preset} onPresetChange={setPreset}
          wireframe={wireframe} onWireframeToggle={() => setWireframe(w => !w)}
          tableHeight={tableHeight} onTableHeightChange={setTableHeight}
          tableScale={tableScale} onTableScaleChange={setTableScale}
          materialMode={materialMode} onMaterialModeChange={setMaterialMode}
          selectedId={selectedId} selectedObject={selectedObject}
          objects={cadObjects} onSelectObject={setSelectedId}
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
};
const gestureBar: React.CSSProperties = {
  position: "fixed", bottom: 20, right: 64, fontSize: 10, color: "#999",
  fontFamily: "monospace", pointerEvents: "none",
};
const dBar: React.CSSProperties = {
  position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
  padding: "6px 10px", display: "flex", alignItems: "center", gap: 8,
  background: "rgba(245,240,232,0.95)", borderBottom: "1px solid #d4cfc7",
  fontFamily: "'SF Mono', monospace",
};
const dTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#00886a", letterSpacing: "0.2em",
};
const dArBtn: React.CSSProperties = {
  padding: "10px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  background: "#00ccaa", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
};
const dVrBtn: React.CSSProperties = {
  padding: "10px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
  background: "#2288dd", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
};
const dMenuBtn: React.CSSProperties = {
  padding: "8px 16px", background: "rgba(0,180,140,0.1)", color: "#00886a",
  border: "1px solid rgba(0,180,140,0.3)", borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", fontSize: 12,
};
const dHelp: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 14, background: "#00ccaa", color: "#fff",
  border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const dInfo: React.CSSProperties = {
  fontSize: 10, color: "#00886a", fontFamily: "monospace",
};
