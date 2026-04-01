"use client";

import { useState, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { Environment, OrbitControls } from "@react-three/drei";
import { XRScene } from "@/components/xr-session/xr-scene";
import { HandTracker } from "@/components/hand-tracking/hand-tracker";
import { ModelViewer } from "@/components/model-viewer/model-viewer";
import { DrawingEngine } from "@/components/drawing/drawing-engine";

// Create XR store for session management
const xrStore = createXRStore({
  hand: { rayPointer: { minDistance: 0.2 } },
  controller: { rayPointer: true },
});

export default function XRPage() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "draw" | "measure">("view");

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".glb") || file.name.endsWith(".gltf"))) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
    }
  }, []);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".glb,.gltf,.stl";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setModelUrl(url);
      }
    };
    input.click();
  }, []);

  return (
    <div
      style={{ width: "100vw", height: "100vh", position: "relative" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
    >
      {/* XR Controls */}
      <div style={styles.controls}>
        <div style={styles.brand}>
          <span style={{ color: "#3b82f6", fontSize: 20 }}>◈</span>
          <span style={styles.title}>GestureCAD XR</span>
        </div>
        <div style={styles.buttons}>
          <button
            style={styles.enterXR}
            onClick={() => xrStore.enterAR()}
            data-testid="enter-ar-btn"
          >
            Enter AR
          </button>
          <button
            style={styles.enterXR}
            onClick={() => xrStore.enterVR()}
            data-testid="enter-vr-btn"
          >
            Enter VR
          </button>
          <button style={styles.btn} onClick={handleFileSelect} data-testid="load-model-btn">
            Load Model
          </button>
        </div>
        <div style={styles.modeBar}>
          {(["view", "draw", "measure"] as const).map((m) => (
            <button
              key={m}
              data-testid={`mode-${m}`}
              style={{
                ...styles.modeBtn,
                ...(mode === m ? styles.modeBtnActive : {}),
              }}
              onClick={() => setMode(m)}
            >
              {m === "view" ? "👁 View" : m === "draw" ? "✏️ Draw" : "📏 Measure"}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas — works in both desktop preview and XR immersive modes */}
      <Canvas
        camera={{ position: [2, 2, 2], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "#0a0a0a" }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <XRScene />
            <HandTracker mode={mode} />
            {modelUrl && <ModelViewer url={modelUrl} />}
            <DrawingEngine active={mode === "draw"} />
          </Suspense>

          <XROrigin position={[0, 0, 0]} />

          {/* Desktop preview controls (disabled in XR) */}
          <OrbitControls makeDefault />
          <Environment preset="city" />
        </XR>
      </Canvas>

      {/* Drop zone overlay */}
      {!modelUrl && (
        <div style={styles.dropHint} data-testid="drop-hint">
          <p style={{ fontSize: 18, fontWeight: 600 }}>Drop a .glb model here</p>
          <p style={{ fontSize: 13, color: "#666" }}>or click Load Model above</p>
          <p style={{ fontSize: 11, color: "#444", marginTop: 12 }}>
            On Meta Quest: open this URL in Quest Browser → tap Enter AR
          </p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "rgba(10, 10, 10, 0.85)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #2a2a2a",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: "#e5e5e5",
    letterSpacing: "-0.02em",
  },
  buttons: {
    display: "flex",
    gap: 8,
  },
  enterXR: {
    padding: "8px 20px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 600,
  },
  btn: {
    padding: "8px 16px",
    background: "#2a2a2a",
    color: "#e5e5e5",
    border: "1px solid #333",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
  },
  modeBar: {
    display: "flex",
    gap: 4,
    marginLeft: "auto",
  },
  modeBtn: {
    padding: "6px 14px",
    background: "transparent",
    color: "#a0a0a0",
    border: "1px solid transparent",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12,
  },
  modeBtnActive: {
    background: "#1e3a5f",
    border: "1px solid #3b82f6",
    color: "#e5e5e5",
  },
  dropHint: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    color: "#666",
  },
};
